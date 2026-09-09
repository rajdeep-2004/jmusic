import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/app/state.js';
import { Track } from '../src/api/types.js';
import { QueueManager } from '../src/queue/QueueManager.js';
import {
  addActiveSelectionToQueueAction,
  cycleViewAction,
  moveActiveSelectionDown,
  moveActiveSelectionUp,
  playActiveSelectionAction,
  removeSelectedFromQueueAction,
  switchViewAction,
} from '../src/app/actions.js';
import { Player } from '../src/player/Player.js';
import { IPlayer, PlayerState } from '../src/player/types.js';
import { EventEmitter } from 'events';

class MockPlayerAdapter extends EventEmitter implements IPlayer {
  private state: PlayerState = 'stopped';
  public playedUrl: string | null = null;

  async play(url: string): Promise<void> {
    this.playedUrl = url;
    this.state = 'playing';
    this.emit('statusChange', this.state);
  }
  async pause(): Promise<void> { this.state = 'paused'; }
  async resume(): Promise<void> { this.state = 'playing'; }
  async stop(): Promise<void> { this.state = 'stopped'; }
  async seek(_s: number): Promise<void> {}
  async getPosition(): Promise<number> { return 0; }
  async getDuration(): Promise<number> { return 100; }
  async setVolume(_v: number): Promise<void> {}
  async getVolume(): Promise<number> { return 100; }
  getState(): PlayerState { return this.state; }
  async isAvailable(): Promise<boolean> { return true; }
  async destroy(): Promise<void> {}
}

describe('View Navigation and Multi-View Actions', () => {
  const dummyTrack1: Track = { id: '1', title: 'Song 1', artist: 'Artist 1', duration: 100, audioUrl: 'https://example.com/1.mp3' };
  const dummyTrack2: Track = { id: '2', title: 'Song 2', artist: 'Artist 2', duration: 200, audioUrl: 'https://example.com/2.mp3' };

  test('switchViewAction preserves playback status and track metadata', () => {
    const state = createInitialState();
    state.currentTrack = dummyTrack1;
    state.playbackStatus = 'playing';
    state.currentPosition = 42;

    switchViewAction(state, 'search', () => {});
    assert.equal(state.currentView, 'search');
    assert.equal(state.playbackStatus, 'playing');
    assert.equal(state.currentTrack?.id, '1');
    assert.equal(state.currentPosition, 42);

    switchViewAction(state, 'queue', () => {});
    assert.equal(state.currentView, 'queue');
    assert.equal(state.playbackStatus, 'playing');

    switchViewAction(state, 'home', () => {});
    assert.equal(state.currentView, 'home');
    assert.equal(state.playbackStatus, 'playing');
  });

  test('cycleViewAction iterates through views in order', () => {
    const state = createInitialState();
    assert.equal(state.currentView, 'home');

    cycleViewAction(state, () => {});
    assert.equal(state.currentView, 'search');

    cycleViewAction(state, () => {});
    assert.equal(state.currentView, 'queue');

    cycleViewAction(state, () => {});
    assert.equal(state.currentView, 'nowPlaying');

    cycleViewAction(state, () => {});
    assert.equal(state.currentView, 'home');
  });

  test('moveActiveSelection moves selection within current active view', () => {
    const state = createInitialState();
    state.discoverTracks = [dummyTrack1, dummyTrack2];
    state.discoverSelectedIndex = 0;
    state.discoverSelectedTrack = dummyTrack1;

    // Moving down in home view
    state.currentView = 'home';
    moveActiveSelectionDown(state, () => {});
    assert.equal(state.discoverSelectedIndex, 1);
    assert.equal(state.discoverSelectedTrack?.id, '2');

    moveActiveSelectionUp(state, () => {});
    assert.equal(state.discoverSelectedIndex, 0);
    assert.equal(state.discoverSelectedTrack?.id, '1');

    // Moving down in search view
    state.currentView = 'search';
    state.searchResults = [dummyTrack1, dummyTrack2];
    state.selectedIndex = 0;
    state.selectedTrack = dummyTrack1;

    moveActiveSelectionDown(state, () => {});
    assert.equal(state.selectedIndex, 1);
    assert.equal(state.selectedTrack?.id, '2');

    // Moving in queue view
    state.currentView = 'queue';
    state.queue = [dummyTrack1, dummyTrack2];
    state.queueSelectedIndex = 0;

    moveActiveSelectionDown(state, () => {});
    assert.equal(state.queueSelectedIndex, 1);
  });

  test('playActiveSelectionAction plays highlighted track in active view', async () => {
    const state = createInitialState();
    const mockAdapter = new MockPlayerAdapter();
    const player = new Player(mockAdapter);
    const queueManager = new QueueManager();

    state.currentView = 'home';
    state.discoverTracks = [dummyTrack1, dummyTrack2];
    state.discoverSelectedIndex = 1;
    state.discoverSelectedTrack = dummyTrack2;

    await playActiveSelectionAction(state, player, () => {}, queueManager);
    assert.equal(state.currentTrack?.id, '2');
    assert.equal(mockAdapter.playedUrl, dummyTrack2.audioUrl);
    assert.equal(state.playbackStatus, 'playing');
  });

  test('addActiveSelectionToQueueAction adds track from active view', () => {
    const state = createInitialState();
    const queueManager = new QueueManager();

    state.currentView = 'home';
    state.discoverTracks = [dummyTrack1];
    state.discoverSelectedTrack = dummyTrack1;

    addActiveSelectionToQueueAction(state, queueManager, () => {});
    assert.equal(queueManager.size(), 1);
    assert.equal(queueManager.getCurrentTrack()?.title, 'Song 1');
  });

  test('removeSelectedFromQueueAction removes highlighted item from queue', () => {
    const state = createInitialState();
    const queueManager = new QueueManager([dummyTrack1, dummyTrack2]);
    state.queue = queueManager.getTracks();
    state.queueSelectedIndex = 0;

    removeSelectedFromQueueAction(state, queueManager, () => {});
    assert.equal(queueManager.size(), 1);
    assert.equal(state.queue.length, 1);
    assert.equal(state.queue[0].id, '2');
  });
});
