import { AppState } from '../app/state.js';
import {
  RESET, BOLD, DIM,
  C_SECTION_FG, C_BORDER,
  C_SELECTED_BG, C_SELECTED_FG,
  C_RESULT_FG, C_ARTIST_FG,
  C_PROMPT_FG, C_QUERY_FG,
  C_STATUS_MSG_ERR, C_STATUS_MSG_OK,
  padEndAnsi, stripAnsi,
} from './colors.js';
import { formatTime } from '../utils/formatTime.js';

export function renderSearchView(state: AppState, maxRows: number, maxWidth: number): string[] {
  const lines: string[] = [];

  const queryPart = state.searchQuery ? ` ${C_QUERY_FG}[${state.searchQuery}]${RESET}${C_SECTION_FG} ` : ' ';
  const sectionLabel = ` 🔍 Search Results${queryPart}`;
  const labelVisible = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelVisible - 2);
  lines.push(
    `${C_BORDER}──${RESET}${C_SECTION_FG}${sectionLabel}${RESET}${C_BORDER}${'─'.repeat(divLen)}${RESET}`
  );

  let availableRows = maxRows - 1;

  if (state.inputMode === 'search') {
    const prompt = `${C_PROMPT_FG} 🔎 Search:${RESET} ${BOLD}${state.searchBuffer}${RESET}█`;
    lines.push(padEndAnsi(prompt, maxWidth));
    lines.push(`${C_BORDER}${'─'.repeat(maxWidth)}${RESET}`);
    availableRows -= 2;
  }

  if (state.isLoading) {
    lines.push(`  ${C_PROMPT_FG}Searching Jamendo...${RESET}`);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  if (state.searchResults.length === 0) {
    if (
      state.statusMessage &&
      (state.statusMessage.startsWith('Search failed') || state.statusMessage.startsWith('Error'))
    ) {
      lines.push(`  ${C_STATUS_MSG_ERR}${state.statusMessage}${RESET}`.slice(0, maxWidth + 20));
    } else if (state.searchQuery) {
      lines.push(`  ${DIM}No tracks found for "${state.searchQuery}".${RESET}`);
    } else {
      lines.push(`  ${DIM}No tracks loaded.${RESET}`);
    }
    lines.push(`  ${C_STATUS_MSG_OK}Press "/" to search Jamendo.${RESET}`);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  const pageSize  = Math.max(1, availableRows);
  const maxStart  = Math.max(0, state.searchResults.length - pageSize);
  const idealStart = Math.max(0, state.selectedIndex - Math.floor(pageSize / 2));
  const startIdx  = Math.min(idealStart, maxStart);
  const visibleTracks = state.searchResults.slice(startIdx, startIdx + pageSize);

  for (let i = 0; i < visibleTracks.length; i++) {
    const track    = visibleTracks[i];
    const actualIdx = startIdx + i;
    const isSelected = actualIdx === state.selectedIndex;
    const timeStr  = ` (${formatTime(track.duration)})`;

    if (isSelected) {
      const prefix     = ` ▶  `;
      const availText  = Math.max(10, maxWidth - stripAnsi(prefix) - stripAnsi(timeStr));
      const trackInfo  = `${track.title} – ${track.artist}`.slice(0, availText).padEnd(availText, ' ');
      const line       = `${C_SELECTED_BG}${C_SELECTED_FG}${BOLD}${prefix}${trackInfo}${timeStr}${RESET}`;
      lines.push(padEndAnsi(line, maxWidth));
    } else {
      const prefix     = `   `;
      const availText  = Math.max(10, maxWidth - prefix.length - stripAnsi(timeStr));
      const titlePart  = `${C_RESULT_FG}${track.title}${RESET}`;
      const artistPart = `${C_ARTIST_FG} – ${track.artist}${RESET}`;
      const trackInfo  = (track.title + ' – ' + track.artist).slice(0, availText);
      // Pad to fill width based on visible length
      const visibleLen = prefix.length + trackInfo.length + stripAnsi(timeStr);
      const pad        = Math.max(0, maxWidth - visibleLen);
      const line       = `${prefix}${C_RESULT_FG}${trackInfo}${RESET}${' '.repeat(pad)}${C_ARTIST_FG}${timeStr}${RESET}`;
      lines.push(line);
    }
  }

  while (lines.length < maxRows) lines.push('');
  return lines.slice(0, maxRows);
}
