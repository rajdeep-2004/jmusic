import { AppState } from './state.js';
import { JamendoClient } from '../api/jamendo.js';
import { Player } from '../player/Player.js';
import { Track } from '../api/types.js';
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
