import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, MIN_WIDE } from '../src/tui/layout.js';

describe('Layout System', () => {
  test('returns narrow layout below MIN_WIDE', () => {
    const layout = computeLayout(79, 24);
    assert.equal(layout.isWide, false);
    assert.equal(layout.sidebarWidth, 0);
    assert.equal(layout.nowPlayingWidth, 0);
    // mainWidth = cols - 2 (outer box)
    assert.equal(layout.mainWidth, 77);
    assert.equal(layout.queueStripHeight, 0);
  });

  test('returns 3-column layout at MIN_WIDE (80)', () => {
    const layout = computeLayout(80, 30);
    assert.equal(layout.isWide, true);
    assert.equal(layout.sidebarWidth, 18);
    assert.equal(layout.nowPlayingWidth, 26);
    // mainWidth = 80 - 18 - 26 - 4 = 32
    assert.equal(layout.mainWidth, 32);
  });

  test('uses wider panels at 120+ cols', () => {
    const layout = computeLayout(120, 30);
    assert.equal(layout.isWide, true);
    assert.equal(layout.sidebarWidth, 20);
    assert.equal(layout.nowPlayingWidth, 30);
    // mainWidth = 120 - 20 - 30 - 4 = 66
    assert.equal(layout.mainWidth, 66);
  });

  test('headerHeight is always 1, footerHeight is always 2', () => {
    const a = computeLayout(80, 24);
    assert.equal(a.headerHeight, 1);
    assert.equal(a.footerHeight, 2);

    const b = computeLayout(100, 40);
    assert.equal(b.headerHeight, 1);
    assert.equal(b.footerHeight, 2);
  });

  test('bodyHeight = rows - header - footer', () => {
    const layout = computeLayout(100, 30);
    assert.equal(layout.bodyHeight, 30 - 1 - 2);
  });

  test('queue strip visible at bodyHeight >= 20', () => {
    const enough = computeLayout(100, 24); // bodyHeight = 21
    assert.ok(enough.bodyHeight >= 20);
    assert.ok(enough.queueStripHeight > 0);
    assert.ok(enough.queueStripTracks >= 1);
  });

  test('queue strip hidden when bodyHeight < 20', () => {
    const small = computeLayout(100, 22); // bodyHeight = 22-1-2=19
    assert.equal(small.bodyHeight, 19);
    assert.equal(small.queueStripHeight, 0);
    assert.equal(small.queueStripTracks, 0);
  });

  test('panelHeight is positive in all configurations', () => {
    const configs = [
      [80, 24], [100, 30], [120, 40], [60, 15], [200, 50],
    ];
    for (const [c, r] of configs) {
      const layout = computeLayout(c, r);
      assert.ok(layout.panelHeight > 0, `panelHeight should be > 0 for ${c}x${r}`);
    }
  });

  test('mainWidth + sidebarWidth + nowPlayingWidth + 4 === cols in wide mode', () => {
    for (const cols of [80, 100, 120, 160]) {
      const layout = computeLayout(cols, 30);
      if (layout.isWide) {
        const total = layout.mainWidth + layout.sidebarWidth + layout.nowPlayingWidth + 4;
        // Allow off-by-1 for floor rounding on very odd widths
        assert.ok(
          Math.abs(total - cols) <= 1,
          `total panels (${total}) should equal cols (${cols}) at width ${cols}`
        );
      }
    }
  });
});
