import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderDancingCat } from '../src/tui/DancingCat.js';

describe('DancingCat Component', () => {
  test('renders 4 lines for playing status and alternates frames', () => {
    const frame0 = renderDancingCat('playing', 0, 50);
    assert.equal(frame0.length, 4);

    const frame1 = renderDancingCat('playing', 1, 50);
    assert.equal(frame1.length, 4);

    // Ensure frames have differences (animation poses)
    assert.notEqual(frame0[1], frame1[1]);
  });

  test('renders pause and stopped states', () => {
    const paused = renderDancingCat('paused', 0, 50);
    assert.equal(paused.length, 4);

    const stopped = renderDancingCat('stopped', 0, 50);
    assert.equal(stopped.length, 4);
    assert.ok(stopped.some((line) => line.includes('zZ')));
  });
});
