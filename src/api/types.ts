/**
 * Internal Track data model normalized from music source.
 * In accordance with buildPlan.md §14.
 */
export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  artworkUrl?: string;
  audioUrl: string;
}

/**
 * Raw track item returned by Jamendo API v3.0 /tracks/
 */
export interface RawJamendoTrack {
  id: string;
  name: string;
  duration: number;
  artist_id?: string;
  artist_name: string;
  artist_idstr?: string;
  album_name?: string;
  album_id?: string;
  license_ccurl?: string;
  position?: number;
  releasedate?: string;
  album_image?: string;
  image?: string;
  audio: string;
  audiodownload?: string;
  prourl?: string;
  shorturl?: string;
  shareurl?: string;
  waveform?: string;
  image_size?: number;
}

export interface JamendoApiHeaders {
  status: 'success' | 'failed';
  code: number;
  error_message?: string;
  warnings?: string;
  results_count?: number;
  next?: string;
}

export interface JamendoApiResponse<T> {
  headers: JamendoApiHeaders;
  results: T[];
}

export interface JamendoSearchParams {
  search: string;
  limit?: number;
  offset?: number;
}
