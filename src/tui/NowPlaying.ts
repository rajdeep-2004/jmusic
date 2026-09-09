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

  // ── Section header with optional bitrate badge ─────────────────────────────
  const sectionLabel = ' ♪ Now Playing ';
  const labelLen = stripAnsi(sectionLabel);
  const badge = '320 kbps';
  const showBadge = maxWidth >= 36;
  const badgeText = showBadge ? ` ${THEME.dim}${badge}${RESET} ` : '';
  const badgeLen = showBadge ? stripAnsi(badgeText) : 0;
  const divLen = Math.max(0, maxWidth - labelLen - badgeLen - 2);

  lines.push(
    `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}${THEME.title}${BOLD}${sectionLabel}${RESET}${THEME.border}${BOX.horizontal.repeat(divLen)}${RESET}${badgeText}`
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

    // If generous vertical space, show standby card
    if (maxRows >= 18 && maxWidth >= 30) {
      const cardW = Math.min(32, maxWidth - 4);
      const lpCard = Math.max(0, Math.floor((maxWidth - cardW) / 2));
      const pad = ' '.repeat(lpCard);
      const fillW = cardW - 2;

      lines.push(padEndAnsi(`${pad}${THEME.border}╭${BOX.horizontal.repeat(fillW)}╮${RESET}`, maxWidth));
      lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${' '.repeat(fillW)}${THEME.border}│${RESET}`, maxWidth));
      const art1 = `     . ─── .     `;
      const art2 = `   /   ○   \\    `;
      const art3 = `  |   ( )   |   `;
      const art4 = `   \\       /    `;
      const art5 = `     ' ─── '     `;
      lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.dim}${art1.padEnd(fillW)}${RESET}${THEME.border}│${RESET}`, maxWidth));
      lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.dim}${art2.padEnd(fillW)}${RESET}${THEME.border}│${RESET}`, maxWidth));
      lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.dim}${art3.padEnd(fillW)}${RESET}${THEME.border}│${RESET}`, maxWidth));
      lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.dim}${art4.padEnd(fillW)}${RESET}${THEME.border}│${RESET}`, maxWidth));
      lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.dim}${art5.padEnd(fillW)}${RESET}${THEME.border}│${RESET}`, maxWidth));
      lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${' '.repeat(fillW)}${THEME.border}│${RESET}`, maxWidth));
      lines.push(padEndAnsi(`${pad}${THEME.border}╰${BOX.horizontal.repeat(fillW)}╯${RESET}`, maxWidth));
      lines.push('');
    }

    const statusLine = `${tag}`;
    const lp1 = Math.max(0, Math.floor((maxWidth - stripAnsi(statusLine)) / 2));
    lines.push(padEndAnsi(' '.repeat(lp1) + statusLine, maxWidth));
    lines.push('');
    const vol = `${volBadge}`;
    const lp2 = Math.max(0, Math.floor((maxWidth - stripAnsi(vol)) / 2));
    lines.push(padEndAnsi(' '.repeat(lp2) + vol, maxWidth));
    lines.push('');
    const hint = `${THEME.dim}Select a song and press Enter${RESET}`;
    const lp3 = Math.max(0, Math.floor((maxWidth - stripAnsi(hint)) / 2));
    lines.push(padEndAnsi(' '.repeat(lp3) + hint, maxWidth));

    while (lines.length < maxRows) lines.push(padEndAnsi('', maxWidth));
    return lines.slice(0, maxRows);
  }

  // ── Active track ───────────────────────────────────────────────────────────
  const innerW = maxWidth - 2; // 1 space left-pad, 1 right-pad

  // Visual artwork card (when ample height and width are available)
  if (maxRows >= 20 && maxWidth >= 32) {
    lines.push('');
    const cardW = Math.min(34, maxWidth - 4);
    const lpCard = Math.max(0, Math.floor((maxWidth - cardW) / 2));
    const pad = ' '.repeat(lpCard);
    const fillW = cardW - 2;

    lines.push(padEndAnsi(`${pad}${THEME.border}╭${BOX.horizontal.repeat(fillW)}╮${RESET}`, maxWidth));
    lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${' '.repeat(fillW)}${THEME.border}│${RESET}`, maxWidth));
    const a1 = `    . ─── .       `;
    const a2 = `  /   ▄▄▄   \\     `;
    const a3 = ` |   ( ● )   |    `;
    const a4 = `  \\   ▀▀▀   /     `;
    const a5 = `    ' ─── '       `;
    const side1 = `Jamendo`;
    const side2 = `HQ Audio`;
    const side3 = `Lossless`;
    lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.accent}${a1}${RESET}${THEME.dim}${side1.padEnd(fillW - 18)}${RESET}${THEME.border}│${RESET}`, maxWidth));
    lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.accent}${a2}${RESET}${THEME.muted}${side2.padEnd(fillW - 18)}${RESET}${THEME.border}│${RESET}`, maxWidth));
    lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.accent}${a3}${RESET}${THEME.dim}${side3.padEnd(fillW - 18)}${RESET}${THEME.border}│${RESET}`, maxWidth));
    lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.accent}${a4}${RESET}${' '.repeat(fillW - 18)}${THEME.border}│${RESET}`, maxWidth));
    lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.accent}${a5}${RESET}${' '.repeat(fillW - 18)}${THEME.border}│${RESET}`, maxWidth));
    lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${' '.repeat(fillW)}${THEME.border}│${RESET}`, maxWidth));
    lines.push(padEndAnsi(`${pad}${THEME.border}╰${BOX.horizontal.repeat(fillW)}╯${RESET}`, maxWidth));
  }

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
    lines.push(padEndAnsi('', maxWidth));
  }

  lines.push('');

  // Progress bar
  const barWidth = Math.max(8, Math.min(36, maxWidth - 16));
  const totalDuration =
    state.duration > 0 ? state.duration : state.currentTrack.duration || 0;
  const progBar = renderProgressBar(state.currentPosition, totalDuration, barWidth);
  const lp = Math.max(0, Math.floor((maxWidth - stripAnsi(progBar)) / 2));
  lines.push(padEndAnsi(' '.repeat(lp) + progBar, maxWidth));

  lines.push('');

  // Transport controls — centered
  const playSymbol =
    state.playbackStatus === 'playing'
      ? `${THEME.accent}${BOLD}⏸${RESET}`
      : `${THEME.success}${BOLD}▶${RESET}`;
  const transport = `${THEME.dim}◀◀${RESET}    ${playSymbol}    ${THEME.dim}▶▶${RESET}`;
  const lpT = Math.max(0, Math.floor((maxWidth - stripAnsi(transport)) / 2));
  lines.push(padEndAnsi(' '.repeat(lpT) + transport, maxWidth));

  lines.push('');

  // Volume + status line: nicely distributed
  let metaLine: string;
  const totalMeta = stripAnsi(volBadge) + stripAnsi(tag);
  if (maxWidth >= 40 && maxWidth - totalMeta >= 6) {
    const spaceCount = Math.max(4, maxWidth - totalMeta - 4);
    metaLine = ` ${volBadge}${' '.repeat(spaceCount)}${tag}`;
  } else {
    metaLine = ` ${volBadge}   ${tag}`;
  }
  lines.push(padEndAnsi(metaLine, maxWidth));

  // If there is significant extra vertical room (e.g. >= 26 rows), show quote box at bottom
  const remainingRows = maxRows - lines.length;
  if (remainingRows >= 6 && maxWidth >= 34) {
    lines.push('');
    const cardW = Math.min(36, maxWidth - 4);
    const lpQ = Math.max(0, Math.floor((maxWidth - cardW) / 2));
    const pad = ' '.repeat(lpQ);
    const fillW = cardW - 2;

    lines.push(padEndAnsi(`${pad}${THEME.border}╭${BOX.horizontal.repeat(fillW)}╮${RESET}`, maxWidth));
    const q1 = ` "A good playlist can`;
    const q2 = `  make a great day better."`;
    const q3 = `  — JMusic`;
    lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.dim}${q1.padEnd(fillW)}${RESET}${THEME.border}│${RESET}`, maxWidth));
    lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.dim}${q2.padEnd(fillW)}${RESET}${THEME.border}│${RESET}`, maxWidth));
    lines.push(padEndAnsi(`${pad}${THEME.border}│${RESET}${THEME.dim}${q3.padEnd(fillW)}${RESET}${THEME.border}│${RESET}`, maxWidth));
    lines.push(padEndAnsi(`${pad}${THEME.border}╰${BOX.horizontal.repeat(fillW)}╯${RESET}`, maxWidth));
  }

  while (lines.length < maxRows) lines.push(padEndAnsi('', maxWidth));
  return lines.slice(0, maxRows);
}
