import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderProgressBarPlain as renderProgressBar } from '../src/tui/ProgressBar.js';

describe('ProgressBar component', () => {
  test('renders 0% progress correctly', () => {
    const result = renderProgressBar(0, 100, 10);
    assert.equal(result, '00:00 ░░░░░░░░░░ 01:40');
  });

  test('renders 50% progress correctly', () => {
    const result = renderProgressBar(50, 100, 10);
    assert.equal(result, '00:50 ━━━━━░░░░░ 01:40');
  });

  test('renders 100% progress correctly', () => {
    const result = renderProgressBar(100, 100, 10);
    assert.equal(result, '01:40 ━━━━━━━━━━ 01:40');
  });

  test('handles zero duration gracefully without dividing by zero', () => {
    const result = renderProgressBar(0, 0, 10);
    assert.equal(result, '00:00 ░░░░░░░░░░ 00:00');
  });

  test('clamps position that exceeds duration', () => {
    const result = renderProgressBar(150, 100, 10);
    assert.equal(result, '01:40 ━━━━━━━━━━ 01:40');
  });

  test('clamps negative position to 0', () => {
    const result = renderProgressBar(-10, 100, 10);
    assert.equal(result, '00:00 ░░░░░░░░░░ 01:40');
  });

  test('matches buildPlan format with timestamps and bar', () => {
    const result = renderProgressBar(92, 225, 10);
    assert.ok(result.startsWith('01:32 '));
    assert.ok(result.endsWith(' 03:45'));
    assert.ok(result.includes('━'));
    assert.ok(result.includes('░'));
  });
});
