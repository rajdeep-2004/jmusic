import { AppState } from '../app/state.js';

export function renderSearchView(state: AppState, maxRows: number, maxWidth: number): string[] {
  const lines: string[] = [];

  const title = ' Search Results ';
  lines.push(`──${title}${'─'.repeat(Math.max(0, maxWidth - title.length - 2))}`);

  if (state.searchResults.length === 0) {
    lines.push('  No tracks loaded.');
    lines.push('  (Search will be available in Step 4)');
    while (lines.length < maxRows) {
      lines.push('');
    }
    return lines.slice(0, maxRows);
  }

  const startIdx = Math.max(0, Math.min(state.selectedIndex - Math.floor(maxRows / 2), state.searchResults.length - maxRows));
  const visibleTracks = state.searchResults.slice(startIdx, startIdx + maxRows - 1);

  for (let i = 0; i < visibleTracks.length; i++) {
    const track = visibleTracks[i];
    const actualIdx = startIdx + i;
    const isSelected = actualIdx === state.selectedIndex;
    const prefix = isSelected ? ' > ' : '   ';
    const text = `${prefix}${track.title} - ${track.artist}`;
    lines.push(text.slice(0, maxWidth));
  }

  while (lines.length < maxRows) {
    lines.push('');
  }

  return lines.slice(0, maxRows);
}
