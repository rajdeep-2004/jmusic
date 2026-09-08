import { AppState } from '../app/state.js';
import { renderProgressBar } from './ProgressBar.js';
import {
  RESET, BOLD, DIM,
  C_BORDER, C_SECTION_FG,
  C_NP_LABEL, C_NP_VALUE, C_NP_TITLE, C_NP_ARTIST, C_NP_ALBUM,
  C_STATUS_PLAY, C_STATUS_PAUSE, C_STATUS_STOP, C_STATUS_BUF, C_STATUS_ERR,
  C_VOL_ON, C_VOL_MUTED,
  stripAnsi,
} from './colors.js';

function statusColor(status: string): string {
  switch (status) {
    case 'playing':   return C_STATUS_PLAY;
    case 'paused':    return C_STATUS_PAUSE;
    case 'buffering': return C_STATUS_BUF;
    case 'error':     return C_STATUS_ERR;
    default:          return C_STATUS_STOP;
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
    `${C_BORDER}──${RESET}${C_SECTION_FG}${sectionLabel}${RESET}${C_BORDER}${'─'.repeat(divLen)}${RESET}`
  );

  const icon   = statusIcon(state.playbackStatus);
  const sColor = statusColor(state.playbackStatus);
  const tag    = `${sColor}${BOLD}${icon} ${state.playbackStatus.toUpperCase()}${RESET}`;

  if (!state.currentTrack || state.playbackStatus === 'stopped') {
    lines.push(`  ${DIM}No track currently playing.${RESET}`);
    lines.push(`  ${C_NP_LABEL}Status:${RESET} ${tag}`);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  if (state.playbackStatus === 'buffering') {
    lines.push(`  ${C_NP_TITLE}${state.currentTrack.title}${RESET}`.slice(0, maxWidth + 30));
    lines.push(`  ${C_NP_ARTIST}${state.currentTrack.artist}${RESET}`.slice(0, maxWidth + 20));
    lines.push(`  ${C_NP_LABEL}Status:${RESET} ${tag}`);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  if (state.playbackStatus === 'error') {
    lines.push(`  ${C_NP_TITLE}${state.currentTrack.title}${RESET}`.slice(0, maxWidth + 30));
    lines.push(`  ${C_NP_ARTIST}${state.currentTrack.artist}${RESET}`.slice(0, maxWidth + 20));
    lines.push(`  ${C_NP_LABEL}Status:${RESET} ${tag}`);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  // Playing or Paused
  const titleLine  = `  ${C_NP_LABEL}Title :${RESET}  ${C_NP_TITLE}${state.currentTrack.title}${RESET}`;
  const artistLine = `  ${C_NP_LABEL}Artist:${RESET}  ${C_NP_ARTIST}${state.currentTrack.artist}${RESET}`;
  lines.push(titleLine);
  lines.push(artistLine);

  if (state.currentTrack.album) {
    lines.push(`  ${C_NP_LABEL}Album :${RESET}  ${C_NP_ALBUM}${state.currentTrack.album}${RESET}`);
  }

  const volColor = state.volume === 0 ? C_VOL_MUTED : C_VOL_ON;
  const volLabel = state.volume === 0 ? '🔇 MUTED' : `🔊 ${state.volume}%`;
  const statusLine = `  ${C_NP_LABEL}Status:${RESET} ${tag}   ${volColor}${BOLD}${volLabel}${RESET}`;
  lines.push(statusLine);
  lines.push('');

  const barWidth = Math.max(10, maxWidth - 22);
  const totalDuration = state.duration > 0 ? state.duration : (state.currentTrack.duration || 0);
  lines.push(`  ${renderProgressBar(state.currentPosition, totalDuration, barWidth)}`);

  while (lines.length < maxRows) lines.push('');
  return lines.slice(0, maxRows);
}
