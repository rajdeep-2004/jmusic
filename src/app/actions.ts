import { AppState } from './state.js';
import { JamendoClient } from '../api/jamendo.js';
import { Player } from '../player/Player.js';
import { Track } from '../api/types.js';
import { QueueManager } from '../queue/QueueManager.js';

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
    state.statusMessage = `Found ${results.length} tracks for "${trimmed}". ↑/↓: Navigate, Enter: Play, A: Add Queue.`;
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

export async function playTrackAction(
  state: AppState,
  player: Player,
  track: Track,
  onUpdate: () => void,
  queueManager?: QueueManager
): Promise<void> {
  if (!track || !track.audioUrl) {
    state.playbackStatus = 'error';
    state.statusMessage = 'Selected track has no playable audio URL.';
    onUpdate();
    return;
  }

  state.currentTrack = track;
  state.duration = track.duration || 0;
  state.currentPosition = 0;
  state.playbackStatus = 'buffering';
  state.statusMessage = `Buffering: "${track.title}" by ${track.artist}...`;

  if (queueManager) {
    const existingIdx = queueManager.getTracks().findIndex((t) => t.id === track.id);
    if (existingIdx !== -1) {
      queueManager.setCurrentIndex(existingIdx);
    } else {
      queueManager.addTrack(track);
      queueManager.setCurrentIndex(queueManager.size() - 1);
    }
    state.queue = queueManager.getTracks();
    state.queueIndex = queueManager.getCurrentIndex();
  }

  onUpdate();

  try {
    await player.play(track.audioUrl);
    state.playbackStatus = 'playing';
    state.statusMessage = `Playing: "${track.title}" by ${track.artist}`;
  } catch (err: any) {
    state.playbackStatus = 'error';
    state.statusMessage = `Playback failed: ${err?.message || err}`;
  } finally {
    onUpdate();
  }
}

export async function togglePlayPauseAction(
  state: AppState,
  player: Player,
  onUpdate: () => void,
  queueManager?: QueueManager
): Promise<void> {
  if (state.playbackStatus === 'playing') {
    try {
      await player.pause();
      state.playbackStatus = 'paused';
      state.statusMessage = `Paused: "${state.currentTrack?.title || 'Unknown'}"`;
    } catch (err: any) {
      state.statusMessage = `Pause failed: ${err?.message || err}`;
    }
  } else if (state.playbackStatus === 'paused') {
    try {
      await player.resume();
      state.playbackStatus = 'playing';
      state.statusMessage = `Resumed: "${state.currentTrack?.title || 'Unknown'}"`;
    } catch (err: any) {
      state.statusMessage = `Resume failed: ${err?.message || err}`;
    }
  } else if (state.selectedTrack) {
    await playTrackAction(state, player, state.selectedTrack, onUpdate, queueManager);
    return;
  } else if (queueManager && !queueManager.isEmpty()) {
    const current = queueManager.getCurrentTrack();
    if (current) {
      await playTrackAction(state, player, current, onUpdate, queueManager);
      return;
    }
  } else {
    state.statusMessage = 'Nothing to play. Select a track first.';
  }
  onUpdate();
}

export async function stopPlaybackAction(
  state: AppState,
  player: Player,
  onUpdate: () => void
): Promise<void> {
  try {
    await player.stop();
    state.playbackStatus = 'stopped';
    state.currentPosition = 0;
    state.statusMessage = 'Playback stopped.';
  } catch (err: any) {
    state.statusMessage = `Stop failed: ${err?.message || err}`;
  }
  onUpdate();
}

export function addToQueueAction(
  state: AppState,
  queueManager: QueueManager,
  track: Track,
  onUpdate: () => void
): void {
  if (!track) {
    state.statusMessage = 'No track selected to add to queue.';
    onUpdate();
    return;
  }

  queueManager.addTrack(track);
  state.queue = queueManager.getTracks();
  state.queueIndex = queueManager.getCurrentIndex();
  state.statusMessage = `Added to queue: "${track.title}" by ${track.artist}`;
  onUpdate();
}

export async function playNextTrackAction(
  state: AppState,
  player: Player,
  queueManager: QueueManager,
  onUpdate: () => void
): Promise<void> {
  if (queueManager.isEmpty()) {
    state.statusMessage = 'Queue is empty.';
    onUpdate();
    return;
  }

  const nextTrack = queueManager.getNextTrack();
  if (nextTrack) {
    state.statusMessage = `Next track: "${nextTrack.title}"`;
    await playTrackAction(state, player, nextTrack, onUpdate, queueManager);
  } else {
    // End of queue reached
    await player.stop();
    state.playbackStatus = 'stopped';
    state.currentPosition = 0;
    state.statusMessage = 'End of queue reached.';
    onUpdate();
  }
}

export async function playPreviousTrackAction(
  state: AppState,
  player: Player,
  queueManager: QueueManager,
  onUpdate: () => void
): Promise<void> {
  if (queueManager.isEmpty()) {
    state.statusMessage = 'Queue is empty.';
    onUpdate();
    return;
  }

  const prevTrack = queueManager.getPreviousTrack();
  if (prevTrack) {
    state.statusMessage = `Previous track: "${prevTrack.title}"`;
    await playTrackAction(state, player, prevTrack, onUpdate, queueManager);
  } else {
    state.statusMessage = 'Beginning of queue reached.';
    onUpdate();
  }
}
