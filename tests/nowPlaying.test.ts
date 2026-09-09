import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/app/state.js';
import { renderNowPlaying } from '../src/tui/NowPlaying.js';
import { Track } from '../src/api/types.js';

describe('NowPlaying Component', () => {
  const dummyTrack: Track = {
    id: '123',
    title: 'Midnight Serenade',
    artist: 'Luna Jazz Quartet',
    album: 'Nocturne Echoes',
    duration: 245,
    audioUrl: 'https://example.com/audio.mp3',
  };

  test('renders stopped state with clean status and hint, no cat icon', () => {
    const state = createInitialState();
    const lines = renderNowPlaying(state, 12, 40);

    assert.equal(lines.length, 12);
    assert.ok(lines[0].includes('Now Playing'));
    assert.ok(lines.some((l) => l.includes('STOPPED')));
    assert.ok(lines.some((l) => l.includes('Select a song')));

    // Verify cat ascii is not present
    for (const l of lines) {
      assert.ok(!l.includes('( ^.^ )'), 'Should not contain cat face');
      assert.ok(!l.includes('( -.- )'), 'Should not contain sleeping cat');
      assert.ok(!l.includes('d[ o_0 ]b'), 'Should not contain dancing cat');
    }
  });

  test('renders active playing track cleanly', () => {
    const state = createInitialState();
    state.currentTrack = dummyTrack;
    state.playbackStatus = 'playing';
    state.currentPosition = 60;
    state.duration = 245;

    const lines = renderNowPlaying(state, 14, 45);
    assert.ok(lines.some((l) => l.includes('Midnight Serenade')));
    assert.ok(lines.some((l) => l.includes('Luna Jazz Quartet')));
    assert.ok(lines.some((l) => l.includes('PLAYING')));
    assert.ok(lines.some((l) => l.includes('01:00')));

    for (const l of lines) {
      assert.ok(!l.includes('d[ o_0 ]b'), 'Should not contain cat');
    }
  });
});
