/**
 * HomeView.ts — Discover panel.
 *
 * Renders the track list for the currently active Jamendo discovery category.
 * Category tabs have been moved to the Sidebar; this panel focuses on the
 * track list with proper column headers.
 *
 * Columns:  #   Title (flexible)   Artist (flexible)   Duration (right)
 */

import { AppState } from '../app/state.js';
import {
  RESET, BOLD,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';
import { formatTime } from '../utils/formatTime.js';
import { DISCOVER_CATEGORIES } from '../api/types.js';

// ─── Column-width calculation ─────────────────────────────────────────────────

interface ColWidths {
  num: number;    // fixed  4  "  01 "
  dur: number;    // fixed  6  " 03:22"
  title: number;  // flexible
  artist: number; // flexible
}

function colWidths(maxWidth: number): ColWidths {
  const num = 4;
  const dur = 6;
  const sep = 2; // spaces between title and artist
  const remaining = Math.max(20, maxWidth - num - dur - sep);
  // title gets ~58%, artist gets ~42%
  const title = Math.max(8, Math.floor(remaining * 0.58));
  const artist = Math.max(6, remaining - title);
  return { num, dur, title, artist };
}

/** Truncate str to maxLen visible chars, appending '…' if cut */
function trunc(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// ─── Public renderer ──────────────────────────────────────────────────────────

export function renderHomeView(
  state: AppState,
  maxRows: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];

  // ── Section header ─────────────────────────────────────────────────────────
  const activeCategory =
    DISCOVER_CATEGORIES.find((c) => c.key === state.discoverCategory) ||
    DISCOVER_CATEGORIES[0];

  const sectionLabel = ` Discover ${THEME.dim}/${RESET} ${THEME.accent}${BOLD}${activeCategory.name}${RESET} `;
  const labelLen = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelLen - 2);
  lines.push(
    `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}${THEME.title}${sectionLabel}${RESET}${THEME.border}${BOX.horizontal.repeat(divLen)}${RESET}`
  );

  const cw = colWidths(maxWidth);
  let availableRows = maxRows - 1; // header row used above

  // ── Loading state ──────────────────────────────────────────────────────────
  if (state.isDiscoverLoading) {
    lines.push('');
    const loadingText = `${THEME.warning}◌  Loading ${activeCategory.name} tracks from Jamendo…${RESET}`;
    const lp = Math.max(0, Math.floor((maxWidth - stripAnsi(loadingText)) / 2));
    lines.push(' '.repeat(lp) + loadingText);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  // ── Empty / error state ───────────────────────────────────────────────────
  if (state.discoverTracks.length === 0) {
    lines.push('');
    const msg1 = `${THEME.muted}No tracks loaded for ${activeCategory.name}.${RESET}`;
    const msg2 = `${THEME.dim}Press [Tab] or [C] to switch genre, or [/] to search.${RESET}`;
    const lp1 = Math.max(0, Math.floor((maxWidth - stripAnsi(msg1)) / 2));
    const lp2 = Math.max(0, Math.floor((maxWidth - stripAnsi(msg2)) / 2));
    lines.push(' '.repeat(lp1) + msg1);
    lines.push(' '.repeat(lp2) + msg2);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  // ── Column headers ─────────────────────────────────────────────────────────
  const numHdr    = `${THEME.dim} #  ${RESET}`;
  const titleHdr  = padEndAnsi(`${THEME.dim}Title${RESET}`, cw.title + 4); // +4 for ansi
  const artistHdr = padEndAnsi(`${THEME.dim}Artist${RESET}`, cw.artist + 4);
  const durHdr    = `${THEME.dim}  Dur${RESET}`;
  lines.push(`${numHdr}${titleHdr}${artistHdr}${durHdr}`);

  // Thin separator under column headers
  lines.push(`${THEME.dim}${BOX.horizontal.repeat(maxWidth)}${RESET}`);
  availableRows -= 2;

  // ── Track list with pagination ─────────────────────────────────────────────
  const pageSize  = Math.max(1, availableRows);
  const maxStart  = Math.max(0, state.discoverTracks.length - pageSize);
  const idealStart = Math.max(0, state.discoverSelectedIndex - Math.floor(pageSize / 2));
  const startIdx  = Math.min(idealStart, maxStart);
  const visible   = state.discoverTracks.slice(startIdx, startIdx + pageSize);

  for (let i = 0; i < visible.length; i++) {
    const track     = visible[i];
    const actualIdx = startIdx + i;
    const isSelected = actualIdx === state.discoverSelectedIndex;
    const isPlaying  =
      state.currentTrack !== null &&
      state.currentTrack.id === track.id &&
      (state.playbackStatus === 'playing' || state.playbackStatus === 'paused');

    const numStr  = String(actualIdx + 1).padStart(2, '0');
    const timeStr = formatTime(track.duration);
    const title   = trunc(track.title,  cw.title);
    const artist  = trunc(track.artist, cw.artist);

    if (isSelected) {
      // Highlighted row (cursor position)
      const marker = isPlaying ? '▶' : ' ';
      const prefix = `${marker} ${numStr} `;
      const content =
        prefix +
        title.padEnd(cw.title, ' ') + ' ' +
        artist.padEnd(cw.artist, ' ') +
        ' ' + timeStr;
      const padded = content.padEnd(maxWidth, ' ').slice(0, maxWidth);
      lines.push(
        `${THEME.selectedBg}${THEME.selectedFg}${BOLD}${padded}${RESET}`
      );
    } else if (isPlaying) {
      // Currently playing (not cursor)
      const numCol    = `${THEME.success}▶ ${numStr}${RESET} `;
      const titleCol  = `${THEME.accent}${BOLD}${title.padEnd(cw.title, ' ')}${RESET} `;
      const artistCol = `${THEME.muted}${artist.padEnd(cw.artist, ' ')}${RESET}`;
      const durCol    = ` ${THEME.success}${timeStr}${RESET}`;
      lines.push(numCol + titleCol + artistCol + durCol);
    } else {
      // Normal row
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
