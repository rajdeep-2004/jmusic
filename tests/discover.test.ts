import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/app/state.js';
import { DISCOVER_CATEGORIES, Track } from '../src/api/types.js';
import { JamendoClient } from '../src/api/jamendo.js';
import {
  cycleCategoryAction,
  loadDiscoverTracks,
  switchCategoryAction,
} from '../src/app/actions.js';

describe('Discover and Categories', () => {
  const dummyTracksChill: Track[] = [
    { id: '1', title: 'Chill 1', artist: 'Artist 1', duration: 180, audioUrl: 'https://example.com/1.mp3' },
    { id: '2', title: 'Chill 2', artist: 'Artist 2', duration: 240, audioUrl: 'https://example.com/2.mp3' },
  ];

  const dummyTracksRock: Track[] = [
    { id: '3', title: 'Rock 1', artist: 'Artist 3', duration: 200, audioUrl: 'https://example.com/3.mp3' },
  ];

  test('DISCOVER_CATEGORIES contains all required Jamendo discovery categories', () => {
    const keys = DISCOVER_CATEGORIES.map((c) => c.key);
    assert.ok(keys.includes('featured'));
    assert.ok(keys.includes('chill'));
    assert.ok(keys.includes('electronic'));
    assert.ok(keys.includes('jazz'));
    assert.ok(keys.includes('rock'));
    assert.ok(keys.includes('recent'));
  });

  test('JamendoClient.getDiscoverTracks fails if client ID is missing', async () => {
    const client = new JamendoClient('');
    await assert.rejects(async () => {
      await client.getDiscoverTracks('featured');
    }, /JAMENDO_CLIENT_ID is not configured/);
  });

  test('loadDiscoverTracks updates state with fetched tracks and caches them', async () => {
    const state = createInitialState();

    const mockClient = {
      getDiscoverTracks: async (categoryKey?: string) => {
        assert.equal(categoryKey, 'chill');
        return dummyTracksChill;
      },
    } as unknown as JamendoClient;

    let updateCalls = 0;
    await loadDiscoverTracks(state, mockClient, 'chill', () => {
      updateCalls++;
    });

    assert.equal(state.discoverCategory, 'chill');
    assert.equal(state.discoverTracks.length, 2);
    assert.equal(state.discoverSelectedIndex, 0);
    assert.equal(state.discoverSelectedTrack?.title, 'Chill 1');
    assert.equal(state.isDiscoverLoading, false);
    assert.ok(state.discoverCache['chill']);
    assert.equal(state.discoverCache['chill'].length, 2);
    assert.ok(updateCalls >= 2);
  });

  test('category caching preserves selected index when switching back and forth', async () => {
    const state = createInitialState();

    const mockClient = {
      getDiscoverTracks: async (categoryKey?: string) => {
        if (categoryKey === 'chill') return dummyTracksChill;
        if (categoryKey === 'rock') return dummyTracksRock;
        return [];
      },
    } as unknown as JamendoClient;

    // Load chill
    await switchCategoryAction(state, mockClient, 'chill', () => {});
    assert.equal(state.discoverCategory, 'chill');
    state.discoverSelectedIndex = 1;
    state.discoverSelectedTrack = state.discoverTracks[1];

    // Switch to rock
    await switchCategoryAction(state, mockClient, 'rock', () => {});
    assert.equal(state.discoverCategory, 'rock');
    assert.equal(state.discoverTracks[0].title, 'Rock 1');

    // Switch back to chill (should restore instantly from cache with saved index 1!)
    let fetchCalled = false;
    const noFetchClient = {
      getDiscoverTracks: async () => {
        fetchCalled = true;
        return [];
      },
    } as unknown as JamendoClient;

    await switchCategoryAction(state, noFetchClient, 'chill', () => {});
    assert.equal(fetchCalled, false); // Instant cache hit
    assert.equal(state.discoverCategory, 'chill');
    assert.equal(state.discoverSelectedIndex, 1);
    assert.equal(state.discoverSelectedTrack?.title, 'Chill 2');
  });

  test('prevents race conditions from out-of-order network responses', async () => {
    const state = createInitialState();

    let resolveChill: (tracks: Track[]) => void;
    const slowChillPromise = new Promise<Track[]>((resolve) => {
      resolveChill = resolve;
    });

    const mockClient = {
      getDiscoverTracks: async (categoryKey?: string) => {
        if (categoryKey === 'chill') return slowChillPromise;
        if (categoryKey === 'rock') return dummyTracksRock;
        return [];
      },
    } as unknown as JamendoClient;

    // Start slow chill request
    const chillCall = loadDiscoverTracks(state, mockClient, 'chill', () => {});

    // User immediately switches to rock
    await loadDiscoverTracks(state, mockClient, 'rock', () => {});
    assert.equal(state.discoverCategory, 'rock');
    assert.equal(state.discoverTracks[0].title, 'Rock 1');

    // Now slow chill request resolves
    resolveChill!(dummyTracksChill);
    await chillCall;

    // Visible tracks should STILL be rock tracks, not clobbered by late chill response!
    assert.equal(state.discoverCategory, 'rock');
    assert.equal(state.discoverTracks[0].title, 'Rock 1');
  });

  test('cycleCategoryAction cycles forward and backward through categories', async () => {
    const state = createInitialState();
    state.discoverCategory = 'featured';

    const mockClient = {
      getDiscoverTracks: async () => [],
    } as unknown as JamendoClient;

    // Cycle forward (+1)
    await cycleCategoryAction(state, mockClient, 1, () => {});
    assert.equal(state.discoverCategory, 'chill');

    // Cycle forward (+1)
    await cycleCategoryAction(state, mockClient, 1, () => {});
    assert.equal(state.discoverCategory, 'electronic');

    // Cycle backward (-1)
    await cycleCategoryAction(state, mockClient, -1, () => {});
    assert.equal(state.discoverCategory, 'chill');
  });
});
