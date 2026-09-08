import { Track } from '../api/types.js';

export type PlaybackStatus = 'stopped' | 'playing' | 'paused' | 'buffering' | 'error';
export type InputMode = 'normal' | 'search';

export interface AppState {
  currentTrack: Track | null;
  playbackStatus: PlaybackStatus;
  currentPosition: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0 - 100
  queue: Track[];
  queueIndex: number;
  searchQuery: string;
  searchResults: Track[];
  selectedTrack: Track | null;
  selectedIndex: number;
  statusMessage?: string;
  inputMode: InputMode;
  searchBuffer: string;
  isLoading: boolean;
}

export function createInitialState(): AppState {
  return {
    currentTrack: null,
    playbackStatus: 'stopped',
    currentPosition: 0,
    duration: 0,
    volume: 100,
    queue: [],
    queueIndex: -1,
    searchQuery: '',
    searchResults: [],
    selectedTrack: null,
    selectedIndex: 0,
    statusMessage: 'Ready. Press "/" to search, "Q" to quit.',
    inputMode: 'normal',
    searchBuffer: '',
    isLoading: false,
  };
}
