import { AppState } from '../app/state.js';
import {
  RESET, BOLD, DIM,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';
import { formatTime } from '../utils/formatTime.js';

export function renderSearchView(state: AppState, maxRows: number, maxWidth: number): string[] {
  const lines: string[] = [];

  const queryPart = state.searchQuery ? ` ${THEME.accent}[${state.searchQuery}]${RESET} ` : ' ';
  const sectionLabel = ` 🔍 Search Results${queryPart}`;
  const labelVisible = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelVisible - 2);
  lines.push(
    `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}${THEME.title}${sectionLabel}${RESET}${THEME.border}${BOX.horizontal.repeat(divLen)}${RESET}`
  );

  let availableRows = maxRows - 1;

  if (state.inputMode === 'search') {
    const prompt = ` ${THEME.accent}${BOLD}🔎 Search:${RESET} ${BOLD}${state.searchBuffer}${RESET}${THEME.accent}█${RESET}`;
    lines.push(padEndAnsi(prompt, maxWidth));
    lines.push(`${THEME.border}${BOX.horizontal.repeat(maxWidth)}${RESET}`);
    availableRows -= 2;
  }

  if (state.isLoading) {
    const padTop = Math.max(0, Math.floor(availableRows / 2) - 1);
    for (let i = 0; i < padTop; i++) lines.push('');
    const loadingText = `${THEME.warning}◌ Searching Jamendo for "${state.searchQuery}"...${RESET}`;
    const leftPad = Math.max(0, Math.floor((maxWidth - stripAnsi(loadingText)) / 2));
    lines.push(' '.repeat(leftPad) + loadingText);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  if (state.searchResults.length === 0) {
    const padTop = Math.max(0, Math.floor(availableRows / 2) - 1);
    for (let i = 0; i < padTop; i++) lines.push('');
    if (state.searchQuery) {
      const msg1 = `${THEME.muted}No tracks matched "${state.searchQuery}".${RESET}`;
      const msg2 = `${THEME.dim}Try searching for another artist, track, or genre.${RESET}`;
      const leftPad1 = Math.max(0, Math.floor((maxWidth - stripAnsi(msg1)) / 2));
      const leftPad2 = Math.max(0, Math.floor((maxWidth - stripAnsi(msg2)) / 2));
      lines.push(' '.repeat(leftPad1) + msg1);
      lines.push(' '.repeat(leftPad2) + msg2);
    } else {
      const msg1 = `${THEME.muted}Search Jamendo's Creative Commons Catalog${RESET}`;
      const msg2 = `${THEME.accent}Press "/" to enter search query.${RESET}`;
      const leftPad1 = Math.max(0, Math.floor((maxWidth - stripAnsi(msg1)) / 2));
      const leftPad2 = Math.max(0, Math.floor((maxWidth - stripAnsi(msg2)) / 2));
      lines.push(' '.repeat(leftPad1) + msg1);
      lines.push(' '.repeat(leftPad2) + msg2);
    }
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  const pageSize = Math.max(1, availableRows);
  const maxStart = Math.max(0, state.searchResults.length - pageSize);
  const idealStart = Math.max(0, state.selectedIndex - Math.floor(pageSize / 2));
  const startIdx = Math.min(idealStart, maxStart);
  const visibleTracks = state.searchResults.slice(startIdx, startIdx + pageSize);

  for (let i = 0; i < visibleTracks.length; i++) {
    const track = visibleTracks[i];
    const actualIdx = startIdx + i;
    const isSelected = actualIdx === state.selectedIndex;
    const numStr = String(actualIdx + 1).padStart(2, '0');
    const timeStr = ` ${formatTime(track.duration)}`;

    if (isSelected) {
      const prefix = ` ▶ ${numStr}. `;
      const availText = Math.max(10, maxWidth - stripAnsi(prefix) - stripAnsi(timeStr));
      const trackText = `${track.title} – ${track.artist}`.slice(0, availText).padEnd(availText, ' ');
      const row = `${THEME.selectedBg}${THEME.selectedFg}${BOLD}${prefix}${trackText}${timeStr}${RESET}`;
      lines.push(padEndAnsi(row, maxWidth));
    } else {
      const prefix = `   ${THEME.dim}${numStr}.${RESET} `;
      const availText = Math.max(10, maxWidth - 7 - stripAnsi(timeStr));
      const rawText = `${track.title} – ${track.artist}`;
      const slicedText = rawText.length > availText ? rawText.slice(0, availText - 1) + '…' : rawText;

      const titlePartClean = slicedText.split(' – ')[0] || '';
      const artistPartClean = slicedText.includes(' – ') ? slicedText.slice(titlePartClean.length + 3) : '';

      let formattedText = `${THEME.primary}${titlePartClean}${RESET}`;
      if (artistPartClean) {
        formattedText += `${THEME.muted} – ${artistPartClean}${RESET}`;
      }

      const visibleLen = 7 + stripAnsi(formattedText) + stripAnsi(timeStr);
      const pad = Math.max(0, maxWidth - visibleLen);
      const row = `${prefix}${formattedText}${' '.repeat(pad)}${THEME.muted}${timeStr}${RESET}`;
      lines.push(row);
    }
  }

  while (lines.length < maxRows) lines.push('');
  return lines.slice(0, maxRows);
}
