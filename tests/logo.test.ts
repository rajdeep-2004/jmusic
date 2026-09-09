import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderLogo, JMUSIC_LOGO_LINES } from '../src/tui/Logo.js';

describe('Logo Component', () => {
  test('renders 5 lines of JMusic logo when width is sufficient', () => {
    const lines = renderLogo(80);
    assert.equal(lines.length, 5);
    // Verify first line has top of J and M
    assert.ok(lines[0].includes('__'));
    // Verify last line has J hook and base
    assert.ok(lines[4].includes('____/'));
  });

  test('falls back to compact single-line logo when width is narrow', () => {
    const lines = renderLogo(20);
    assert.equal(lines.length, 1);
    assert.ok(lines[0].includes('JMUSIC'));
    assert.ok(lines[0].includes('Terminal Audio Player'));
  });
});
