import { Track } from '../api/types.js';

export type PlaybackStatus = 'stopped' | 'playing' | 'paused' | 'buffering' | 'error';
export type InputMode = 'normal' | 'search';
export type AppViewMode = 'home' | 'search' | 'queue' | 'nowPlaying';

export interface AppState {
  currentView: AppViewMode;
  currentTrack: Track | null;
  playbackStatus: PlaybackStatus;
  currentPosition: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0 - 100
  queue: Track[];
  queueIndex: number;
  queueSelectedIndex: number;
  searchQuery: string;
  searchResults: Track[];
  selectedTrack: Track | null;
  selectedIndex: number;
  discoverCategory: string;
  discoverTracks: Track[];
  discoverSelectedTrack: Track | null;
  discoverSelectedIndex: number;
  isDiscoverLoading: boolean;
  statusMessage?: string;
  inputMode: InputMode;
  searchBuffer: string;
  isLoading: boolean;
}

export function createInitialState(): AppState {
  return {
    currentView: 'home',
    currentTrack: null,
    playbackStatus: 'stopped',
    currentPosition: 0,
    duration: 0,
    volume: 100,
    queue: [],
    queueIndex: -1,
    queueSelectedIndex: 0,
    searchQuery: '',
    searchResults: [],
    selectedTrack: null,
    selectedIndex: 0,
    discoverCategory: 'featured',
    discoverTracks: [],
    discoverSelectedTrack: null,
    discoverSelectedIndex: 0,
    isDiscoverLoading: false,
    statusMessage: 'Ready. Press "/" to search, "1-4" for tabs, "Q" to quit.',
    inputMode: 'normal',
    searchBuffer: '',
    isLoading: false,
  };
}
