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

  test('loadDiscoverTracks updates state with fetched tracks', async () => {
    const state = createInitialState();
    const dummyTracks: Track[] = [
      { id: '1', title: 'Track 1', artist: 'Artist 1', duration: 180, audioUrl: 'https://example.com/1.mp3' },
      { id: '2', title: 'Track 2', artist: 'Artist 2', duration: 240, audioUrl: 'https://example.com/2.mp3' },
    ];

    const mockClient = {
      getDiscoverTracks: async (categoryKey?: string) => {
        assert.equal(categoryKey, 'chill');
        return dummyTracks;
      },
    } as unknown as JamendoClient;

    let updateCalls = 0;
    await loadDiscoverTracks(state, mockClient, 'chill', () => {
      updateCalls++;
    });

    assert.equal(state.discoverCategory, 'chill');
    assert.equal(state.discoverTracks.length, 2);
    assert.equal(state.discoverSelectedIndex, 0);
    assert.equal(state.discoverSelectedTrack?.title, 'Track 1');
    assert.equal(state.isDiscoverLoading, false);
    assert.ok(updateCalls >= 2);
  });

  test('switchCategoryAction updates category and loads tracks', async () => {
    const state = createInitialState();
    const mockClient = {
      getDiscoverTracks: async () => [],
    } as unknown as JamendoClient;

    await switchCategoryAction(state, mockClient, 'rock', () => {});
    assert.equal(state.discoverCategory, 'rock');
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
