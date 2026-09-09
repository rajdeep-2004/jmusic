import { AppState } from '../app/state.js';
import { renderProgressBar } from './ProgressBar.js';
import {
  RESET, BOLD, DIM,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';

function statusColor(status: string): string {
  switch (status) {
    case 'playing':   return THEME.success;
    case 'paused':    return THEME.warning;
    case 'buffering': return THEME.warning;
    case 'error':     return THEME.error;
    default:          return THEME.dim;
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case 'playing':   return '▶';
    case 'paused':    return '⏸';
    case 'buffering': return '◌';
    case 'error':     return '✖';
    default:          return '■';
  }
}

export function renderNowPlaying(state: AppState, maxRows: number, maxWidth: number): string[] {
  const lines: string[] = [];

  const sectionLabel = ' 🎵 Now Playing ';
  const labelLen = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelLen - 2);
  lines.push(
    `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}${THEME.title}${sectionLabel}${RESET}${THEME.border}${BOX.horizontal.repeat(divLen)}${RESET}`
  );

  const icon   = statusIcon(state.playbackStatus);
  const sColor = statusColor(state.playbackStatus);
  const tag    = `${sColor}${BOLD}${icon} ${state.playbackStatus.toUpperCase()}${RESET}`;

  const volColor = state.volume === 0 ? THEME.error : THEME.success;
  const volLabel = state.volume === 0 ? '🔇 MUTED' : `🔊 ${state.volume}%`;
  const volBadge = `${volColor}${BOLD}${volLabel}${RESET}`;

  if (!state.currentTrack || state.playbackStatus === 'stopped') {
    lines.push('');
    const emptyBox = [
      `${THEME.border}${BOX.topLeft}${BOX.horizontal.repeat(16)}${BOX.topRight}${RESET}`,
      `${THEME.border}${BOX.vertical}${RESET}  ${THEME.accent}♪ NO TRACK ♪${RESET}  ${THEME.border}${BOX.vertical}${RESET}`,
      `${THEME.border}${BOX.bottomLeft}${BOX.horizontal.repeat(16)}${BOX.bottomRight}${RESET}`,
    ];
    for (const bLine of emptyBox) {
      const leftPad = Math.max(0, Math.floor((maxWidth - stripAnsi(bLine)) / 2));
      lines.push(' '.repeat(leftPad) + bLine);
    }
    lines.push('');
    const statusLine = `Status: ${tag}    ${volBadge}`;
    const leftPadStatus = Math.max(0, Math.floor((maxWidth - stripAnsi(statusLine)) / 2));
    lines.push(' '.repeat(leftPadStatus) + `Status: ${tag}    ${volBadge}`);
    lines.push('');
    const hint = `${THEME.dim}Select a song from Discover or Search and press Enter${RESET}`;
    const leftPadHint = Math.max(0, Math.floor((maxWidth - stripAnsi(hint)) / 2));
    lines.push(' '.repeat(leftPadHint) + hint);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  // Active track details
  lines.push('');

  // Track Title
  const rawTitle = state.currentTrack.title;
  const titleText = `${THEME.title}${rawTitle.length > maxWidth - 4 ? rawTitle.slice(0, maxWidth - 5) + '…' : rawTitle}${RESET}`;
  const padTitle = Math.max(0, Math.floor((maxWidth - stripAnsi(titleText)) / 2));
  lines.push(' '.repeat(padTitle) + titleText);

  // Artist
  const rawArtist = state.currentTrack.artist;
  const artistText = `${THEME.accent}${rawArtist.length > maxWidth - 4 ? rawArtist.slice(0, maxWidth - 5) + '…' : rawArtist}${RESET}`;
  const padArtist = Math.max(0, Math.floor((maxWidth - stripAnsi(artistText)) / 2));
  lines.push(' '.repeat(padArtist) + artistText);

  // Album if available
  if (state.currentTrack.album) {
    const rawAlbum = `Album: ${state.currentTrack.album}`;
    const albumText = `${THEME.muted}${rawAlbum.length > maxWidth - 4 ? rawAlbum.slice(0, maxWidth - 5) + '…' : rawAlbum}${RESET}`;
    const padAlbum = Math.max(0, Math.floor((maxWidth - stripAnsi(albumText)) / 2));
    lines.push(' '.repeat(padAlbum) + albumText);
  }

  lines.push('');

  // Transport buttons display
  const playSymbol = state.playbackStatus === 'playing' ? `${THEME.accent}❚❚${RESET}` : `${THEME.success}▶${RESET}`;
  const transport = `${THEME.dim}◀◀${RESET}    ${playSymbol}    ${THEME.dim}▶▶${RESET}`;
  const padTransport = Math.max(0, Math.floor((maxWidth - stripAnsi(transport)) / 2));
  lines.push(' '.repeat(padTransport) + transport);

  lines.push('');

  // Progress bar
  const barWidth = Math.max(10, maxWidth - 22);
  const totalDuration = state.duration > 0 ? state.duration : (state.currentTrack.duration || 0);
  const progBar = renderProgressBar(state.currentPosition, totalDuration, barWidth);
  const padBar = Math.max(0, Math.floor((maxWidth - stripAnsi(progBar)) / 2));
  lines.push(' '.repeat(padBar) + progBar);

  lines.push('');

  // Status & Volume footer line
  const metaLine = `${tag}       ${volBadge}`;
  const padMeta = Math.max(0, Math.floor((maxWidth - stripAnsi(metaLine)) / 2));
  lines.push(' '.repeat(padMeta) + metaLine);

  while (lines.length < maxRows) lines.push('');
  return lines.slice(0, maxRows);
}
