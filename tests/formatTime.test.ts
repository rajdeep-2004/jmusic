import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime } from '../src/utils/formatTime.js';

describe('formatTime utility', () => {
  test('formats zero seconds as 00:00', () => {
    assert.equal(formatTime(0), '00:00');
  });

  test('formats seconds less than a minute with leading zero', () => {
    assert.equal(formatTime(9), '00:09');
    assert.equal(formatTime(45), '00:45');
  });

  test('formats minutes and seconds accurately', () => {
    assert.equal(formatTime(60), '01:00');
    assert.equal(formatTime(92), '01:32');
    assert.equal(formatTime(225), '03:45');
    assert.equal(formatTime(599), '09:59');
  });

  test('formats hours when duration exceeds 3600 seconds', () => {
    assert.equal(formatTime(3600), '01:00:00');
    assert.equal(formatTime(3665), '01:01:05');
    assert.equal(formatTime(7325), '02:02:05');
  });

  test('guards against negative and invalid numbers', () => {
    assert.equal(formatTime(-1), '00:00');
    assert.equal(formatTime(-100), '00:00');
    assert.equal(formatTime(NaN), '00:00');
  });
});
