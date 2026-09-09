/**
 * SearchView.ts — Search results panel.
 *
 * Renders:
 *  - Search prompt when inputMode === 'search'
 *  - Column headers: #  Title  Artist  Duration
 *  - Aligned search results with same style as HomeView
 */

import { AppState } from '../app/state.js';
import {
  RESET, BOLD,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';
import { formatTime } from '../utils/formatTime.js';

// ─── Column widths (same logic as HomeView) ───────────────────────────────────

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
  const title = Math.max(8, Math.floor(remaining * 0.58));
  const artist = Math.max(6, remaining - title);
  return { num, dur, title, artist };
}

function trunc(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// ─── Public renderer ──────────────────────────────────────────────────────────

export function renderSearchView(
  state: AppState,
  maxRows: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];

  // ── Section header ─────────────────────────────────────────────────────────
  const queryPart = state.searchQuery
    ? ` ${THEME.accent}${state.searchQuery}${RESET} `
    : ' ';
  const sectionLabel = ` Search${state.searchQuery ? ` ${THEME.dim}/${RESET}` : ''}${queryPart}`;
  const labelLen = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelLen - 2);
  lines.push(
    `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}${THEME.title}${sectionLabel}${RESET}${THEME.border}${BOX.horizontal.repeat(divLen)}${RESET}`
  );

  let availableRows = maxRows - 1;

  // ── Search input bar ───────────────────────────────────────────────────────
  if (state.inputMode === 'search') {
    const promptLabel = `${THEME.accent}${BOLD} 🔎 Search: ${RESET}`;
    const bufText     = `${BOLD}${state.searchBuffer}${RESET}${THEME.accent}█${RESET}`;
    const promptLine  = `${promptLabel}${bufText}`;
    lines.push(padEndAnsi(promptLine, maxWidth));
    lines.push(`${THEME.border}${BOX.horizontal.repeat(maxWidth)}${RESET}`);
    availableRows -= 2;
  }

  const cw = colWidths(maxWidth);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state.isLoading) {
    lines.push('');
    const loadingText = `${THEME.warning}◌  Searching Jamendo for "${state.searchQuery}"…${RESET}`;
    const lp = Math.max(0, Math.floor((maxWidth - stripAnsi(loadingText)) / 2));
    lines.push(' '.repeat(lp) + loadingText);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (state.searchResults.length === 0) {
    lines.push('');
    if (state.searchQuery) {
      const msg1 = `${THEME.muted}No tracks matched "${state.searchQuery}".${RESET}`;
      const msg2 = `${THEME.dim}Try a different artist, title, or genre.${RESET}`;
      const lp1 = Math.max(0, Math.floor((maxWidth - stripAnsi(msg1)) / 2));
      const lp2 = Math.max(0, Math.floor((maxWidth - stripAnsi(msg2)) / 2));
      lines.push(' '.repeat(lp1) + msg1);
      lines.push(' '.repeat(lp2) + msg2);
    } else {
      const msg1 = `${THEME.muted}Search Jamendo's Creative Commons Catalog${RESET}`;
      const msg2 = `${THEME.accent}Press "/" to enter a search query.${RESET}`;
      const lp1 = Math.max(0, Math.floor((maxWidth - stripAnsi(msg1)) / 2));
      const lp2 = Math.max(0, Math.floor((maxWidth - stripAnsi(msg2)) / 2));
      lines.push(' '.repeat(lp1) + msg1);
      lines.push(' '.repeat(lp2) + msg2);
    }
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

  // ── Results list ───────────────────────────────────────────────────────────
  const pageSize   = Math.max(1, availableRows);
  const maxStart   = Math.max(0, state.searchResults.length - pageSize);
  const idealStart = Math.max(0, state.selectedIndex - Math.floor(pageSize / 2));
  const startIdx   = Math.min(idealStart, maxStart);
  const visible    = state.searchResults.slice(startIdx, startIdx + pageSize);

  for (let i = 0; i < visible.length; i++) {
    const track     = visible[i];
    const actualIdx = startIdx + i;
    const isSelected = actualIdx === state.selectedIndex;
    const isPlaying  =
      state.currentTrack !== null &&
      state.currentTrack.id === track.id &&
      (state.playbackStatus === 'playing' || state.playbackStatus === 'paused');

    const numStr  = String(actualIdx + 1).padStart(2, '0');
    const timeStr = formatTime(track.duration);
    const title   = trunc(track.title, cw.title);
    const artist  = trunc(track.artist, cw.artist);

    if (isSelected) {
      const marker = isPlaying ? '▶' : ' ';
      const content =
        `${marker} ${numStr} ` +
        title.padEnd(cw.title, ' ') + ' ' +
        artist.padEnd(cw.artist, ' ') +
        ' ' + timeStr;
      const padded = content.padEnd(maxWidth, ' ').slice(0, maxWidth);
      lines.push(`${THEME.selectedBg}${THEME.selectedFg}${BOLD}${padded}${RESET}`);
    } else if (isPlaying) {
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

  while (lines.length < maxRows) lines.push('');
  return lines.slice(0, maxRows);
}
