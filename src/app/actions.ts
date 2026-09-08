import { AppState } from './state.js';
import { JamendoClient } from '../api/jamendo.js';

export async function performSearch(
  state: AppState,
  client: JamendoClient,
  query: string,
  onUpdate: () => void
): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) {
    state.statusMessage = 'Search query cannot be empty.';
    onUpdate();
    return;
  }

  state.isLoading = true;
  state.searchQuery = trimmed;
  state.statusMessage = `Searching Jamendo for "${trimmed}"...`;
  onUpdate();

  try {
    const results = await client.searchTracks(trimmed);
    state.searchResults = results;
    state.selectedIndex = 0;
    state.selectedTrack = results.length > 0 ? results[0] : null;
    state.statusMessage = `Found ${results.length} tracks for "${trimmed}". Use ↑/↓ to navigate.`;
  } catch (err: any) {
    state.searchResults = [];
    state.selectedIndex = 0;
    state.selectedTrack = null;
    state.statusMessage = `Search failed: ${err?.message || err}`;
  } finally {
    state.isLoading = false;
    onUpdate();
  }
}

export function moveSelectionUp(state: AppState, onUpdate: () => void): void {
  if (state.searchResults.length === 0) return;
  if (state.selectedIndex > 0) {
    state.selectedIndex -= 1;
    state.selectedTrack = state.searchResults[state.selectedIndex];
    onUpdate();
  }
}

export function moveSelectionDown(state: AppState, onUpdate: () => void): void {
  if (state.searchResults.length === 0) return;
  if (state.selectedIndex < state.searchResults.length - 1) {
    state.selectedIndex += 1;
    state.selectedTrack = state.searchResults[state.selectedIndex];
    onUpdate();
  }
}

export function enterSearchMode(state: AppState, onUpdate: () => void): void {
  state.inputMode = 'search';
  state.searchBuffer = '';
  state.statusMessage = 'Search mode: type query, press Enter to search, Esc to cancel.';
  onUpdate();
}

export function exitSearchMode(state: AppState, onUpdate: () => void): void {
  state.inputMode = 'normal';
  state.searchBuffer = '';
  state.statusMessage = 'Search canceled. Press "/" to search.';
  onUpdate();
}
