import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/app/state.js';
import { QueueManager } from '../src/queue/QueueManager.js';
import {
  addToQueueAction,
  changeVolumeAction,
  enterSearchMode,
  exitSearchMode,
  moveSelectionDown,
  moveSelectionUp,
  playNextTrackAction,
  playPreviousTrackAction,
  playTrackAction,
  seekBackwardAction,
  seekForwardAction,
  toggleMuteAction,
} from '../src/app/actions.js';
import { Player } from '../src/player/Player.js';
import { IPlayer, PlayerState } from '../src/player/types.js';
import { EventEmitter } from 'events';

class MockPlayerAdapter extends EventEmitter implements IPlayer {
  private state: PlayerState = 'stopped';
  private volume: number = 100;
  private position: number = 0;

  async play(_url: string): Promise<void> {
    this.state = 'playing';
    this.emit('statusChange', this.state);
  }
  async pause(): Promise<void> {
    this.state = 'paused';
    this.emit('statusChange', this.state);
  }
  async resume(): Promise<void> {
    this.state = 'playing';
    this.emit('statusChange', this.state);
  }
  async stop(): Promise<void> {
    this.state = 'stopped';
    this.emit('statusChange', this.state);
  }
  async seek(seconds: number): Promise<void> {
    this.position = seconds;
  }
  async getPosition(): Promise<number> {
    return this.position;
  }
  async getDuration(): Promise<number> {
    return 200;
  }
  async setVolume(vol: number): Promise<void> {
    this.volume = vol;
  }
  async getVolume(): Promise<number> {
    return this.volume;
  }
  getState(): PlayerState {
    return this.state;
  }
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async destroy(): Promise<void> {}
}

describe('Application Actions', () => {
  test('moveSelectionDown and moveSelectionUp navigate within search results', () => {
    const state = createInitialState();
    state.searchResults = [
      { id: '1', title: 'T1', artist: 'A1', duration: 100, audioUrl: 'http://1' },
      { id: '2', title: 'T2', artist: 'A2', duration: 100, audioUrl: 'http://2' },
    ];
    state.selectedIndex = 0;

    moveSelectionDown(state, () => {});
    assert.equal(state.selectedIndex, 1);
    assert.equal(state.selectedTrack?.id, '2');

    // Cannot move beyond bounds
    moveSelectionDown(state, () => {});
    assert.equal(state.selectedIndex, 1);

    moveSelectionUp(state, () => {});
    assert.equal(state.selectedIndex, 0);
    assert.equal(state.selectedTrack?.id, '1');

    // Cannot move above 0
    moveSelectionUp(state, () => {});
    assert.equal(state.selectedIndex, 0);
  });

  test('enterSearchMode and exitSearchMode toggle input mode', () => {
    const state = createInitialState();
    enterSearchMode(state, () => {});
    assert.equal(state.inputMode, 'search');
    assert.equal(state.searchBuffer, '');

    exitSearchMode(state, () => {});
    assert.equal(state.inputMode, 'normal');
  });

  test('changeVolumeAction clamps volume between 0 and 100', async () => {
    const state = createInitialState();
    const player = new Player(new MockPlayerAdapter());

    await changeVolumeAction(state, player, -30, () => {});
    assert.equal(state.volume, 70);

    await changeVolumeAction(state, player, 50, () => {});
    assert.equal(state.volume, 100);

    await changeVolumeAction(state, player, -150, () => {});
    assert.equal(state.volume, 0);
  });

  test('toggleMuteAction mutes and restores volume', async () => {
    const state = createInitialState();
    state.volume = 80;
    const player = new Player(new MockPlayerAdapter());

    await toggleMuteAction(state, player, () => {});
    assert.equal(state.volume, 0);

    await toggleMuteAction(state, player, () => {});
    assert.equal(state.volume, 80);
  });

  test('seekForwardAction and seekBackwardAction adjust position with bounds', async () => {
    const state = createInitialState();
    state.playbackStatus = 'playing';
    state.duration = 100;
    state.currentPosition = 20;
    const player = new Player(new MockPlayerAdapter());

    await seekForwardAction(state, player, 10, () => {});
    assert.equal(state.currentPosition, 30);

    await seekBackwardAction(state, player, 15, () => {});
    assert.equal(state.currentPosition, 15);

    // Backward seek clamp at 0
    await seekBackwardAction(state, player, 50, () => {});
    assert.equal(state.currentPosition, 0);
  });

  test('playTrackAction flags error on missing audio URL', async () => {
    const state = createInitialState();
    const player = new Player(new MockPlayerAdapter());
    const badTrack = { id: 'x', title: 'No Audio', artist: 'None', duration: 0, audioUrl: '' };

    await playTrackAction(state, player, badTrack, () => {});
    assert.equal(state.playbackStatus, 'error');
  });

  test('addToQueueAction enqueues track into queue manager and state', () => {
    const state = createInitialState();
    const qm = new QueueManager();
    const track = { id: 'q1', title: 'Queued', artist: 'Art', duration: 120, audioUrl: 'http://q' };

    addToQueueAction(state, qm, track, () => {});
    assert.equal(state.queue.length, 1);
    assert.equal(state.queue[0].id, 'q1');
    assert.equal(qm.size(), 1);
  });

  test('playNextTrackAction and playPreviousTrackAction traverse queue', async () => {
    const state = createInitialState();
    const qm = new QueueManager([
      { id: '1', title: 'Track 1', artist: 'A', duration: 100, audioUrl: 'http://1' },
      { id: '2', title: 'Track 2', artist: 'B', duration: 100, audioUrl: 'http://2' },
    ]);
    const player = new Player(new MockPlayerAdapter());

    await playNextTrackAction(state, player, qm, () => {});
    assert.equal(state.currentTrack?.id, '2');

    await playPreviousTrackAction(state, player, qm, () => {});
    assert.equal(state.currentTrack?.id, '1');
  });
});
