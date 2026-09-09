import { AppState, AppViewMode } from './state.js';
import { JamendoClient } from '../api/jamendo.js';
import { Player } from '../player/Player.js';
import { DISCOVER_CATEGORIES, Track } from '../api/types.js';
import { QueueManager } from '../queue/QueueManager.js';
import { DEFAULT_SEEK_SECONDS } from '../config/config.js';
import { formatTime } from '../utils/formatTime.js';

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

export async function seekForwardAction(
  state: AppState,
  player: Player,
  seekAmount: number = DEFAULT_SEEK_SECONDS,
  onUpdate: () => void
): Promise<void> {
  if (state.playbackStatus !== 'playing' && state.playbackStatus !== 'paused') {
    state.statusMessage = 'Cannot seek: no active playback.';
    onUpdate();
    return;
  }

  const maxDuration = state.duration > 0 ? state.duration : (state.currentTrack?.duration || Infinity);
  const target = Math.min(maxDuration, state.currentPosition + seekAmount);

  try {
    await player.seek(target);
    state.currentPosition = target;
    state.statusMessage = `Seek +${seekAmount}s → ${formatTime(target)}`;
  } catch (err: any) {
    state.statusMessage = `Seek failed: ${err?.message || err}`;
  }
  onUpdate();
}

export async function seekBackwardAction(
  state: AppState,
  player: Player,
  seekAmount: number = DEFAULT_SEEK_SECONDS,
  onUpdate: () => void
): Promise<void> {
  if (state.playbackStatus !== 'playing' && state.playbackStatus !== 'paused') {
    state.statusMessage = 'Cannot seek: no active playback.';
    onUpdate();
    return;
  }

  const target = Math.max(0, state.currentPosition - seekAmount);

  try {
    await player.seek(target);
    state.currentPosition = target;
    state.statusMessage = `Seek -${seekAmount}s → ${formatTime(target)}`;
  } catch (err: any) {
    state.statusMessage = `Seek failed: ${err?.message || err}`;
  }
  onUpdate();
}

let previousVolumeBeforeMute = 100;

export async function changeVolumeAction(
  state: AppState,
  player: Player,
  delta: number,
  onUpdate: () => void
): Promise<void> {
  const newVol = Math.max(0, Math.min(100, state.volume + delta));
  try {
    await player.setVolume(newVol);
    state.volume = newVol;
    state.statusMessage = `Volume: ${newVol}%`;
  } catch (err: any) {
    state.statusMessage = `Volume adjustment failed: ${err?.message || err}`;
  }
  onUpdate();
}

export async function toggleMuteAction(
  state: AppState,
  player: Player,
  onUpdate: () => void
): Promise<void> {
  if (state.volume > 0) {
    previousVolumeBeforeMute = state.volume;
    try {
      await player.setVolume(0);
      state.volume = 0;
      state.statusMessage = 'Volume: MUTED (0%)';
    } catch (err: any) {
      state.statusMessage = `Mute failed: ${err?.message || err}`;
    }
  } else {
    const restoreVol = previousVolumeBeforeMute > 0 ? previousVolumeBeforeMute : 100;
    try {
      await player.setVolume(restoreVol);
      state.volume = restoreVol;
      state.statusMessage = `Volume: ${restoreVol}%`;
    } catch (err: any) {
      state.statusMessage = `Unmute failed: ${err?.message || err}`;
    }
  }
  onUpdate();
}

export async function loadDiscoverTracks(
  state: AppState,
  client: JamendoClient,
  categoryKey: string = 'featured',
  onUpdate: () => void
): Promise<void> {
  state.isDiscoverLoading = true;
  state.discoverCategory = categoryKey;
  const catObj = DISCOVER_CATEGORIES.find((c) => c.key === categoryKey) || DISCOVER_CATEGORIES[0];
  state.statusMessage = `Loading ${catObj.name} tracks from Jamendo...`;
  onUpdate();

  try {
    const tracks = await client.getDiscoverTracks(categoryKey);
    state.discoverTracks = tracks;
    state.discoverSelectedIndex = 0;
    state.discoverSelectedTrack = tracks.length > 0 ? tracks[0] : null;
    state.statusMessage = `Loaded ${tracks.length} tracks in "${catObj.name}". Press Enter to play, A to queue.`;
  } catch (err: any) {
    state.discoverTracks = [];
    state.discoverSelectedIndex = 0;
    state.discoverSelectedTrack = null;
    state.statusMessage = `Failed loading ${catObj.name}: ${err?.message || err}`;
  } finally {
    state.isDiscoverLoading = false;
    onUpdate();
  }
}

export async function switchCategoryAction(
  state: AppState,
  client: JamendoClient,
  categoryKey: string,
  onUpdate: () => void
): Promise<void> {
  await loadDiscoverTracks(state, client, categoryKey, onUpdate);
}

export async function cycleCategoryAction(
  state: AppState,
  client: JamendoClient,
  direction: 1 | -1,
  onUpdate: () => void
): Promise<void> {
  const currentIdx = DISCOVER_CATEGORIES.findIndex((c) => c.key === state.discoverCategory);
  const nextIdx = (currentIdx + direction + DISCOVER_CATEGORIES.length) % DISCOVER_CATEGORIES.length;
  const nextCategory = DISCOVER_CATEGORIES[nextIdx];
  await switchCategoryAction(state, client, nextCategory.key, onUpdate);
}

export function switchViewAction(
  state: AppState,
  view: AppViewMode,
  onUpdate: () => void
): void {
  state.currentView = view;
  const viewNames: Record<AppViewMode, string> = {
    home: 'Discover',
    search: 'Search',
    queue: 'Queue',
    nowPlaying: 'Now Playing',
  };
  state.statusMessage = `View: ${viewNames[view]}. Press 1-4 or Tab to switch views.`;
  onUpdate();
}

export function cycleViewAction(state: AppState, onUpdate: () => void): void {
  const views: AppViewMode[] = ['home', 'search', 'queue', 'nowPlaying'];
  const curIdx = views.indexOf(state.currentView);
  const nextIdx = (curIdx + 1) % views.length;
  switchViewAction(state, views[nextIdx], onUpdate);
}

export function moveActiveSelectionUp(state: AppState, onUpdate: () => void): void {
  if (state.currentView === 'home') {
    if (state.discoverTracks.length === 0) return;
    if (state.discoverSelectedIndex > 0) {
      state.discoverSelectedIndex -= 1;
      state.discoverSelectedTrack = state.discoverTracks[state.discoverSelectedIndex];
      onUpdate();
    }
  } else if (state.currentView === 'search') {
    moveSelectionUp(state, onUpdate);
  } else if (state.currentView === 'queue') {
    if (state.queue.length === 0) return;
    if (state.queueSelectedIndex > 0) {
      state.queueSelectedIndex -= 1;
      onUpdate();
    }
  }
}

export function moveActiveSelectionDown(state: AppState, onUpdate: () => void): void {
  if (state.currentView === 'home') {
    if (state.discoverTracks.length === 0) return;
    if (state.discoverSelectedIndex < state.discoverTracks.length - 1) {
      state.discoverSelectedIndex += 1;
      state.discoverSelectedTrack = state.discoverTracks[state.discoverSelectedIndex];
      onUpdate();
    }
  } else if (state.currentView === 'search') {
    moveSelectionDown(state, onUpdate);
  } else if (state.currentView === 'queue') {
    if (state.queue.length === 0) return;
    if (state.queueSelectedIndex < state.queue.length - 1) {
      state.queueSelectedIndex += 1;
      onUpdate();
    }
  }
}

export async function playActiveSelectionAction(
  state: AppState,
  player: Player,
  onUpdate: () => void,
  queueManager?: QueueManager
): Promise<void> {
  if (state.currentView === 'home') {
    if (state.discoverSelectedTrack) {
      await playTrackAction(state, player, state.discoverSelectedTrack, onUpdate, queueManager);
    } else {
      state.statusMessage = 'No track selected in Discover.';
      onUpdate();
    }
  } else if (state.currentView === 'search') {
    if (state.selectedTrack) {
      await playTrackAction(state, player, state.selectedTrack, onUpdate, queueManager);
    } else {
      state.statusMessage = 'No track selected in Search.';
      onUpdate();
    }
  } else if (state.currentView === 'queue') {
    if (queueManager && !queueManager.isEmpty()) {
      const track = state.queue[state.queueSelectedIndex];
      if (track) {
        queueManager.setCurrentIndex(state.queueSelectedIndex);
        state.queueIndex = state.queueSelectedIndex;
        await playTrackAction(state, player, track, onUpdate, queueManager);
      }
    } else {
      state.statusMessage = 'Queue is empty.';
      onUpdate();
    }
  } else if (state.currentView === 'nowPlaying') {
    await togglePlayPauseAction(state, player, onUpdate, queueManager);
  }
}

export function addActiveSelectionToQueueAction(
  state: AppState,
  queueManager: QueueManager,
  onUpdate: () => void
): void {
  if (state.currentView === 'home') {
    if (state.discoverSelectedTrack) {
      addToQueueAction(state, queueManager, state.discoverSelectedTrack, onUpdate);
    } else {
      state.statusMessage = 'No track selected to add to queue.';
      onUpdate();
    }
  } else if (state.currentView === 'search') {
    if (state.selectedTrack) {
      addToQueueAction(state, queueManager, state.selectedTrack, onUpdate);
    } else {
      state.statusMessage = 'No track selected to add to queue.';
      onUpdate();
    }
  } else if (state.currentView === 'queue') {
    state.statusMessage = 'Track is already in queue.';
    onUpdate();
  } else if (state.currentView === 'nowPlaying') {
    if (state.currentTrack) {
      addToQueueAction(state, queueManager, state.currentTrack, onUpdate);
    }
  }
}

export function removeSelectedFromQueueAction(
  state: AppState,
  queueManager: QueueManager,
  onUpdate: () => void
): void {
  if (queueManager.isEmpty()) {
    state.statusMessage = 'Queue is already empty.';
    onUpdate();
    return;
  }

  const removedTrack = state.queue[state.queueSelectedIndex];
  const removed = queueManager.removeTrack(state.queueSelectedIndex);
  if (removed) {
    state.queue = queueManager.getTracks();
    state.queueIndex = queueManager.getCurrentIndex();
    if (state.queueSelectedIndex >= state.queue.length) {
      state.queueSelectedIndex = Math.max(0, state.queue.length - 1);
    }
    state.statusMessage = removedTrack
      ? `Removed "${removedTrack.title}" from queue.`
      : 'Removed track from queue.';
  }
  onUpdate();
}
