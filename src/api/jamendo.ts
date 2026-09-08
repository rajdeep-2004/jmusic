import { config } from '../config/config.js';
import { JamendoApiResponse, RawJamendoTrack, Track } from './types.js';
import { JamendoApiError } from '../utils/errors.js';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function normalizeJamendoTrack(raw: RawJamendoTrack): Track {
  const duration = typeof raw.duration === 'number'
    ? raw.duration
    : parseInt(String(raw.duration || '0'), 10) || 0;

  return {
    id: String(raw.id),
    title: decodeHtmlEntities(raw.name || 'Unknown Title'),
    artist: decodeHtmlEntities(raw.artist_name || 'Unknown Artist'),
    album: raw.album_name?.trim() ? decodeHtmlEntities(raw.album_name.trim()) : undefined,
    duration,
    artworkUrl: raw.image || raw.album_image || undefined,
    audioUrl: raw.audio,
  };
}

export class JamendoClient {
  private clientId?: string;
  private baseUrl: string;

  constructor(clientId?: string, baseUrl: string = 'https://api.jamendo.com/v3.0') {
    this.clientId = clientId;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public getClientId(): string {
    return this.clientId !== undefined ? this.clientId : config.jamendoClientId;
  }

  public async searchTracks(query: string, limit: number = 20): Promise<Track[]> {
    const effectiveClientId = this.getClientId();
    if (!effectiveClientId) {
      throw new JamendoApiError(
        'JAMENDO_CLIENT_ID is not configured. Please set your API key in .env',
        'MISSING_CLIENT_ID'
      );
    }

    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const url = new URL(`${this.baseUrl}/tracks/`);
    url.searchParams.set('client_id', effectiveClientId);
    url.searchParams.set('format', 'json');
    url.searchParams.set('search', trimmed);
    url.searchParams.set('limit', String(Math.max(1, Math.min(limit, 100))));
    url.searchParams.set('audioformat', 'mp32');

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch (err: any) {
      if (err?.name === 'TimeoutError') {
        throw new JamendoApiError('Jamendo API request timed out', 'TIMEOUT');
      }
      throw new JamendoApiError(`Network error communicating with Jamendo: ${err?.message || err}`, 'NETWORK_ERROR');
    }

    if (!response.ok) {
      throw new JamendoApiError(
        `Jamendo API HTTP error: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    let data: JamendoApiResponse<RawJamendoTrack>;
    try {
      data = (await response.json()) as JamendoApiResponse<RawJamendoTrack>;
    } catch (err: any) {
      throw new JamendoApiError(`Failed to parse Jamendo API response: ${err?.message || err}`, 'PARSE_ERROR');
    }

    if (!data.headers || data.headers.status === 'failed') {
      const code = data.headers?.code ?? 'UNKNOWN';
      const msg = data.headers?.error_message || 'Jamendo API request failed';
      throw new JamendoApiError(msg, code);
    }

    if (!Array.isArray(data.results)) {
      return [];
    }

    // Filter out items without playable audio URL and normalize
    return data.results
      .filter((item) => item && typeof item.audio === 'string' && item.audio.length > 0)
      .map(normalizeJamendoTrack);
  }
}

export const jamendoClient = new JamendoClient();
