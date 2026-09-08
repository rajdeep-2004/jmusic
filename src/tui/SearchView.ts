import { AppState } from '../app/state.js';
import { formatTime } from '../utils/formatTime.js';

export function renderSearchView(state: AppState, maxRows: number, maxWidth: number): string[] {
  const lines: string[] = [];

  const queryLabel = state.searchQuery ? ` [${state.searchQuery}] ` : ' ';
  const title = ` Search Results${queryLabel}`;
  lines.push(`──${title}${'─'.repeat(Math.max(0, maxWidth - title.length - 2))}`);

  let availableRows = maxRows - 1;

  if (state.inputMode === 'search') {
    const prompt = ` Search: ${state.searchBuffer}█`;
    lines.push(prompt.padEnd(maxWidth, ' ').slice(0, maxWidth));
    lines.push('─'.repeat(maxWidth));
    availableRows -= 2;
  }

  if (state.isLoading) {
    lines.push('  Searching Jamendo...');
    while (lines.length < maxRows) {
      lines.push('');
    }
    return lines.slice(0, maxRows);
  }

  if (state.searchResults.length === 0) {
    if (state.searchQuery) {
      lines.push(`  No tracks found for "${state.searchQuery}".`);
    } else {
      lines.push('  No tracks loaded.');
    }
    lines.push('  Press "/" to search Jamendo.');
    while (lines.length < maxRows) {
      lines.push('');
    }
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
    const prefix = isSelected ? ' > ' : '   ';
    const timeStr = ` (${formatTime(track.duration)})`;
    const availTextWidth = Math.max(10, maxWidth - prefix.length - timeStr.length);
    const trackInfo = `${track.title} - ${track.artist}`.slice(0, availTextWidth);
    const line = `${prefix}${trackInfo.padEnd(availTextWidth, ' ')}${timeStr}`;
    lines.push(line.slice(0, maxWidth));
  }

  while (lines.length < maxRows) {
    lines.push('');
  }

  return lines.slice(0, maxRows);
}
