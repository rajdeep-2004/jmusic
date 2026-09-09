/**
 * NowPlaying.ts — Right-side Now Playing panel.
 *
 * Displays:
 *  - Panel heading
 *  - Track title, artist, album
 *  - Progress bar with timestamps
 *  - Transport controls  ◀◀  ⏸/▶  ▶▶
 *  - Volume / status line
 *
 * Uses the EXISTING playback state — does NOT create a player.
 */

import { AppState } from '../app/state.js';
import { renderProgressBar } from './ProgressBar.js';
import {
  RESET, BOLD,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Truncate str to maxLen, appending '…' if cut */
function trunc(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// ─── Public renderer ──────────────────────────────────────────────────────────

/**
 * Render the Now Playing panel as exactly `maxRows` lines, each `maxWidth` wide.
 */
export function renderNowPlaying(
  state: AppState,
  maxRows: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];

  // ── Section header ─────────────────────────────────────────────────────────
  const sectionLabel = ' ♪ Now Playing ';
  const labelLen = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelLen - 2);
  lines.push(
    `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}${THEME.title}${BOLD}${sectionLabel}${RESET}${THEME.border}${BOX.horizontal.repeat(divLen)}${RESET}`
  );

  const icon   = statusIcon(state.playbackStatus);
  const sColor = statusColor(state.playbackStatus);
  const tag    = `${sColor}${BOLD}${icon} ${state.playbackStatus.toUpperCase()}${RESET}`;

  const volColor = state.volume === 0 ? THEME.error : THEME.success;
  const volLabel = state.volume === 0 ? '🔇 MUTED' : `🔊 ${state.volume}%`;
  const volBadge = `${volColor}${BOLD}${volLabel}${RESET}`;

  // ── Stopped / no track state ───────────────────────────────────────────────
  if (!state.currentTrack || state.playbackStatus === 'stopped') {
    lines.push('');
    const statusLine = `${tag}`;
    const lp1 = Math.max(0, Math.floor((maxWidth - stripAnsi(statusLine)) / 2));
    lines.push(' '.repeat(lp1) + statusLine);
    lines.push('');
    const vol = `${volBadge}`;
    const lp2 = Math.max(0, Math.floor((maxWidth - stripAnsi(vol)) / 2));
    lines.push(' '.repeat(lp2) + vol);
    lines.push('');
    const hint = `${THEME.dim}Select a song and press Enter${RESET}`;
    const lp3 = Math.max(0, Math.floor((maxWidth - stripAnsi(hint)) / 2));
    lines.push(' '.repeat(lp3) + hint);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  // ── Active track ───────────────────────────────────────────────────────────
  const innerW = maxWidth - 2; // 1 space left-pad, 1 right-pad

  lines.push('');

  // Track title — bold accent
  const rawTitle  = trunc(state.currentTrack.title, innerW);
  const titleText = ` ${THEME.accent}${BOLD}${rawTitle}${RESET}`;
  lines.push(padEndAnsi(titleText, maxWidth));

  // Artist — muted
  const rawArtist  = trunc(state.currentTrack.artist, innerW);
  const artistText = ` ${THEME.muted}${rawArtist}${RESET}`;
  lines.push(padEndAnsi(artistText, maxWidth));

  // Album — dimmer, conditional
  if (state.currentTrack.album) {
    const rawAlbum  = trunc(`Album: ${state.currentTrack.album}`, innerW);
    const albumText = ` ${THEME.dim}${rawAlbum}${RESET}`;
    lines.push(padEndAnsi(albumText, maxWidth));
  } else {
    lines.push('');
  }

  lines.push('');

  // Progress bar
  const barWidth = Math.max(6, maxWidth - 14); // leave room for timestamps
  const totalDuration =
    state.duration > 0 ? state.duration : state.currentTrack.duration || 0;
  const progBar = renderProgressBar(state.currentPosition, totalDuration, barWidth);
  const lp = Math.max(0, Math.floor((maxWidth - stripAnsi(progBar)) / 2));
  lines.push(' '.repeat(lp) + progBar);

  lines.push('');

  // Transport controls — centered
  const playSymbol =
    state.playbackStatus === 'playing'
      ? `${THEME.accent}${BOLD}⏸${RESET}`
      : `${THEME.success}${BOLD}▶${RESET}`;
  const transport = `${THEME.dim}◀◀${RESET}  ${playSymbol}  ${THEME.dim}▶▶${RESET}`;
  const lpT = Math.max(0, Math.floor((maxWidth - stripAnsi(transport)) / 2));
  lines.push(' '.repeat(lpT) + transport);

  lines.push('');

  // Volume + status on one line, left-aligned
  const metaLine = ` ${volBadge}   ${tag}`;
  lines.push(padEndAnsi(metaLine, maxWidth));

  while (lines.length < maxRows) lines.push('');
  return lines.slice(0, maxRows);
}
