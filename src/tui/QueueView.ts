/**
 * QueueView.ts — Queue panel renderers.
 *
 *  renderQueueVertical — Full queue view (when user presses "3")
 *  renderQueueStrip    — Compact bottom strip shown below main content
 */

import { AppState } from '../app/state.js';
import {
  RESET, BOLD,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';
import { formatTime } from '../utils/formatTime.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trunc(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// ─── Column widths (same as HomeView / SearchView) ────────────────────────────

interface ColWidths {
  num: number;
  dur: number;
  title: number;
  artist: number;
}

function colWidths(maxWidth: number): ColWidths {
  const num = 4;
  const dur = 6;
  const sep = 2;
  const remaining = Math.max(20, maxWidth - num - dur - sep);
  const title = Math.max(8, Math.floor(remaining * 0.55));
  const artist = Math.max(6, remaining - title);
  return { num, dur, title, artist };
}

// ─── Full Queue View ──────────────────────────────────────────────────────────

/** Render queue as a full vertical list panel (view mode "3") */
export function renderQueueVertical(
  state: AppState,
  maxRows: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];

  const countTag = state.queue.length > 0 ? ` (${state.queue.length})` : '';
  const sectionLabel = ` Queue${countTag} `;
  const labelLen = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelLen - 2);
  lines.push(
    `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}${THEME.title}${sectionLabel}${RESET}${THEME.border}${BOX.horizontal.repeat(divLen)}${RESET}`
  );

  const cw = colWidths(maxWidth);
  let availableRows = maxRows - 2; // header + footer summary

  // ── Empty state ────────────────────────────────────────────────────────────
  if (state.queue.length === 0) {
    lines.push('');
    const emptyMsg = `${THEME.muted}Your queue is empty.${RESET}`;
    const hintMsg  = `${THEME.dim}Select a song and press [A] to add it.${RESET}`;
    const lp1 = Math.max(0, Math.floor((maxWidth - stripAnsi(emptyMsg)) / 2));
    const lp2 = Math.max(0, Math.floor((maxWidth - stripAnsi(hintMsg)) / 2));
    lines.push(' '.repeat(lp1) + emptyMsg);
    lines.push(' '.repeat(lp2) + hintMsg);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  // ── Column headers ─────────────────────────────────────────────────────────
  const numHdr    = `${THEME.dim} #  ${RESET}`;
  const titleHdr  = padEndAnsi(`${THEME.dim}Title${RESET}`, cw.title + 1);
  const artistHdr = padEndAnsi(`${THEME.dim}Artist${RESET}`, cw.artist);
  const durHdr    = `${THEME.dim}  Dur${RESET}`;
  lines.push(`${numHdr}${titleHdr}${artistHdr}${durHdr}`);
  lines.push(`${THEME.dim}${BOX.horizontal.repeat(maxWidth)}${RESET}`);
  availableRows -= 2;

  // ── Paginated track list ───────────────────────────────────────────────────
  const pageSize   = Math.max(1, availableRows);
  const maxStart   = Math.max(0, state.queue.length - pageSize);
  const idealStart = Math.max(0, state.queueSelectedIndex - Math.floor(pageSize / 2));
  const startIdx   = Math.min(idealStart, maxStart);
  const visible    = state.queue.slice(startIdx, startIdx + pageSize);

  for (let i = 0; i < visible.length; i++) {
    const track      = visible[i];
    const actualIdx  = startIdx + i;
    const isCurrent  = actualIdx === state.queueIndex;
    const isSelected = actualIdx === state.queueSelectedIndex;

    const numStr  = String(actualIdx + 1).padStart(2, '0');
    const timeStr = formatTime(track.duration);
    const title   = trunc(track.title, cw.title);
    const artist  = trunc(track.artist, cw.artist);

    if (isSelected) {
      const marker = isCurrent ? '▶' : ' ';
      const content =
        `${marker} ${numStr} ` +
        title.padEnd(cw.title, ' ') + ' ' +
        artist.padEnd(cw.artist, ' ') +
        ' ' + timeStr;
      const padded = content.padEnd(maxWidth, ' ').slice(0, maxWidth);
      lines.push(`${THEME.selectedBg}${THEME.selectedFg}${BOLD}${padded}${RESET}`);
    } else if (isCurrent) {
      const numCol    = `${THEME.success}▶ ${numStr}${RESET} `;
      const titleCol  = `${THEME.accent}${BOLD}${title.padEnd(cw.title, ' ')}${RESET} `;
      const artistCol = `${THEME.muted}${artist.padEnd(cw.artist, ' ')}${RESET}`;
      const durCol    = ` ${THEME.success}${timeStr}${RESET}`;
      lines.push(numCol + titleCol + artistCol + durCol);
    } else {
      const numCol    = `  ${THEME.dim}${numStr}${RESET} `;
      const titleCol  = `${THEME.primary}${title.padEnd(cw.title, ' ')}${RESET} `;
      const artistCol = `${THEME.muted}${artist.padEnd(cw.artist, ' ')}${RESET}`;
      const durCol    = ` ${THEME.dim}${timeStr}${RESET}`;
      lines.push(numCol + titleCol + artistCol + durCol);
    }
  }

  while (lines.length < maxRows - 1) lines.push('');

  // Footer hint
  const summary = `${THEME.dim}  ${state.queue.length} track${state.queue.length === 1 ? '' : 's'}   [Enter] Play  [D] Remove${RESET}`;
  lines.push(summary);

  return lines.slice(0, maxRows);
}

// ─── Compact Queue Strip ──────────────────────────────────────────────────────

/**
 * Render a compact 2-track queue strip (for the bottom of the main column).
 *
 * Always returns exactly `stripHeight` lines.
 * Layout:
 *   line 0: section header (── Queue (n) ─── total_dur ──)
 *   lines 1..stripHeight-2: one track each
 *   (last line is for the caller to use as separator if needed)
 */
export function renderQueueStrip(
  state: AppState,
  maxWidth: number,
  stripHeight: number
): string[] {
  const lines: string[] = [];

  // ── Header row ─────────────────────────────────────────────────────────────
  const count = state.queue.length;
  const totalSecs = state.queue.reduce((s, t) => s + (t.duration || 0), 0);
  const totalStr  = count > 0 ? formatTime(totalSecs) : '';
  const countPart = count > 0 ? ` (${count})` : '';
  const sectionLabel = ` Queue${countPart} `;
  const labelLen = stripAnsi(sectionLabel);

  let headerContent: string;
  if (totalStr) {
    const rightPart = ` ${THEME.dim}${totalStr}${RESET} `;
    const rightLen = stripAnsi(rightPart);
    const dashes = Math.max(0, maxWidth - labelLen - rightLen - 2);
    headerContent =
      `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}` +
      `${THEME.title}${sectionLabel}${RESET}` +
      `${THEME.border}${BOX.horizontal.repeat(Math.floor(dashes / 2))}${RESET}` +
      rightPart +
      `${THEME.border}${BOX.horizontal.repeat(dashes - Math.floor(dashes / 2))}${RESET}`;
  } else {
    const dashes = Math.max(0, maxWidth - labelLen - 2);
    headerContent =
      `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}` +
      `${THEME.title}${sectionLabel}${RESET}` +
      `${THEME.border}${BOX.horizontal.repeat(dashes)}${RESET}`;
  }
  lines.push(headerContent);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (count === 0) {
    const emptyMsg = `  ${THEME.muted}Queue is empty.${RESET}  ${THEME.dim}Press [A] to add songs.${RESET}`;
    lines.push(emptyMsg);
    while (lines.length < stripHeight) lines.push('');
    return lines.slice(0, stripHeight);
  }

  // ── Track rows — up to (stripHeight - 1) rows ─────────────────────────────
  const trackRows = Math.max(1, stripHeight - 1);
  const visible   = state.queue.slice(0, trackRows);

  for (let i = 0; i < visible.length; i++) {
    const track    = visible[i];
    const idx      = i;
    const isCurrent = idx === state.queueIndex;
    const timeStr  = formatTime(track.duration);
    const durWidth = 6;
    const prefixWidth = 5; // "  1. " or "▶ 1. "
    const textWidth = Math.max(10, maxWidth - prefixWidth - durWidth - 1);

    // Build "Title — Artist" string
    const combined = `${track.title}  —  ${track.artist}`;
    const text     = trunc(combined, textWidth).padEnd(textWidth, ' ');

    if (isCurrent) {
      const row =
        `${THEME.success}${BOLD}▶${RESET} ` +
        `${THEME.dim}${idx + 1}.${RESET} ` +
        `${THEME.accent}${BOLD}${text}${RESET}` +
        `${THEME.success} ${timeStr}${RESET}`;
      lines.push(row);
    } else {
      const row =
        `  ` +
        `${THEME.dim}${idx + 1}.${RESET} ` +
        `${THEME.primary}${text}${RESET}` +
        `${THEME.dim} ${timeStr}${RESET}`;
      lines.push(row);
    }
  }

  // If queue has more tracks than visible rows, show "+N more" hint
  if (count > trackRows) {
    const more = count - trackRows;
    const moreStr = `  ${THEME.dim}+${more} more track${more === 1 ? '' : 's'}…${RESET}`;
    // Replace last track row with hint if we ran out of space
    if (lines.length >= stripHeight) {
      lines[stripHeight - 1] = moreStr;
    } else {
      lines.push(moreStr);
    }
  }

  while (lines.length < stripHeight) lines.push('');
  return lines.slice(0, stripHeight);
}
