import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { QueueManager } from '../src/queue/QueueManager.js';
import { Track } from '../src/api/types.js';

const mockTracks: Track[] = [
  { id: '1', title: 'Track 1', artist: 'Artist 1', duration: 180, audioUrl: 'http://a' },
  { id: '2', title: 'Track 2', artist: 'Artist 2', duration: 200, audioUrl: 'http://b' },
  { id: '3', title: 'Track 3', artist: 'Artist 3', duration: 220, audioUrl: 'http://c' },
];

describe('QueueManager', () => {
  test('initializes empty by default', () => {
    const qm = new QueueManager();
    assert.equal(qm.isEmpty(), true);
    assert.equal(qm.size(), 0);
    assert.equal(qm.getCurrentTrack(), null);
    assert.equal(qm.getCurrentIndex(), -1);
  });

  test('adds single and multiple tracks and maintains index', () => {
    const qm = new QueueManager();
    qm.addTrack(mockTracks[0]);
    assert.equal(qm.size(), 1);
    assert.equal(qm.getCurrentIndex(), 0);
    assert.equal(qm.getCurrentTrack()?.id, '1');

    qm.addTracks([mockTracks[1], mockTracks[2]]);
    assert.equal(qm.size(), 3);
  });

  test('getNextTrack advances index until end of queue', () => {
    const qm = new QueueManager(mockTracks);
    assert.equal(qm.getCurrentIndex(), 0);

    const t2 = qm.getNextTrack();
    assert.equal(t2?.id, '2');
    assert.equal(qm.getCurrentIndex(), 1);

    const t3 = qm.getNextTrack();
    assert.equal(t3?.id, '3');
    assert.equal(qm.getCurrentIndex(), 2);

    const tEnd = qm.getNextTrack();
    assert.equal(tEnd, null);
    assert.equal(qm.getCurrentIndex(), 2);
  });

  test('getNextTrack wraps to start when repeat is enabled', () => {
    const qm = new QueueManager(mockTracks);
    qm.setRepeat(true);
    qm.setCurrentIndex(2);

    const wrapped = qm.getNextTrack();
    assert.equal(wrapped?.id, '1');
    assert.equal(qm.getCurrentIndex(), 0);
  });

  test('getPreviousTrack decrements index until beginning', () => {
    const qm = new QueueManager(mockTracks);
    qm.setCurrentIndex(2);

    const t2 = qm.getPreviousTrack();
    assert.equal(t2?.id, '2');
    assert.equal(qm.getCurrentIndex(), 1);

    const t1 = qm.getPreviousTrack();
    assert.equal(t1?.id, '1');
    assert.equal(qm.getCurrentIndex(), 0);

    const tStart = qm.getPreviousTrack();
    assert.equal(tStart?.id, '1');
    assert.equal(qm.getCurrentIndex(), 0);
  });

  test('removes track at specific index and adjusts currentIndex', () => {
    const qm = new QueueManager(mockTracks);
    qm.setCurrentIndex(2);

    const removed = qm.removeTrack(1);
    assert.equal(removed, true);
    assert.equal(qm.size(), 2);
    assert.equal(qm.getCurrentIndex(), 1);

    assert.equal(qm.removeTrack(99), false);
    assert.equal(qm.removeTrack(-1), false);
  });

  test('clears queue completely', () => {
    const qm = new QueueManager(mockTracks);
    qm.clear();
    assert.equal(qm.isEmpty(), true);
    assert.equal(qm.size(), 0);
    assert.equal(qm.getCurrentIndex(), -1);
  });

  test('shuffle preserves elements and tracks count', () => {
    const qm = new QueueManager(mockTracks);
    qm.shuffle();
    assert.equal(qm.size(), 3);
    const ids = qm.getTracks().map((t) => t.id).sort();
    assert.deepEqual(ids, ['1', '2', '3']);
  });
});
