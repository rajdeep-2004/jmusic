import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJamendoTrack, JamendoClient } from '../src/api/jamendo.js';
import { RawJamendoTrack } from '../src/api/types.js';

describe('Jamendo Client and Normalization', () => {
  test('normalizeJamendoTrack correctly converts raw response to Track model', () => {
    const raw: RawJamendoTrack = {
      id: '12345',
      name: 'Sample Track',
      artist_name: 'Sample Artist',
      album_name: 'Sample Album',
      duration: 215,
      audio: 'https://example.com/audio.mp3',
      image: 'https://example.com/art.jpg',
    };

    const track = normalizeJamendoTrack(raw);
    assert.equal(track.id, '12345');
    assert.equal(track.title, 'Sample Track');
    assert.equal(track.artist, 'Sample Artist');
    assert.equal(track.album, 'Sample Album');
    assert.equal(track.duration, 215);
    assert.equal(track.audioUrl, 'https://example.com/audio.mp3');
    assert.equal(track.artworkUrl, 'https://example.com/art.jpg');
  });

  test('normalizeJamendoTrack decodes HTML entities in titles and artists', () => {
    const raw: RawJamendoTrack = {
      id: '999',
      name: 'Rock &amp; Roll &quot;Live&#039;s&quot;',
      artist_name: 'Simon &amp; Garfunkel',
      album_name: '&lt;Best Of&gt;',
      duration: 180,
      audio: 'https://example.com/audio.mp3',
    };

    const track = normalizeJamendoTrack(raw);
    assert.equal(track.title, "Rock & Roll \"Live's\"");
    assert.equal(track.artist, 'Simon & Garfunkel');
    assert.equal(track.album, '<Best Of>');
  });

  test('normalizeJamendoTrack handles string duration', () => {
    const raw: RawJamendoTrack = {
      id: '1',
      name: 'Title',
      artist_name: 'Artist',
      duration: '145' as any,
      audio: 'https://example.com/audio.mp3',
    };

    const track = normalizeJamendoTrack(raw);
    assert.equal(track.duration, 145);
  });

  test('JamendoClient throws JamendoApiError when clientId is missing', async () => {
    const client = new JamendoClient('');
    await assert.rejects(
      async () => {
        await client.searchTracks('test');
      },
      {
        name: 'JamendoApiError',
        code: 'MISSING_CLIENT_ID',
      }
    );
  });

  test('JamendoClient returns empty array for empty query', async () => {
    const client = new JamendoClient('dummy_key');
    const results = await client.searchTracks('   ');
    assert.deepEqual(results, []);
  });
});
