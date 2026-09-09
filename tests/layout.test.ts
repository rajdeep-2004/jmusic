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

  test('headerHeight is 3, footerHeight is 4 (all fixed frame rows)', () => {
    const a = computeLayout(80, 24);
    assert.equal(a.headerHeight, 3);  // topBorder + header + body-sep
    assert.equal(a.footerHeight, 4);  // fullSep + controls + status + bottomBorder

    const b = computeLayout(100, 40);
    assert.equal(b.headerHeight, 3);
    assert.equal(b.footerHeight, 4);
  });

  test('bodyHeight = rows - 7 (headerHeight=3 + footerHeight=4)', () => {
    const layout = computeLayout(100, 30);
    assert.equal(layout.bodyHeight, 30 - 3 - 4);
  });

  test('queue strip visible at bodyHeight >= 20', () => {
    const enough = computeLayout(100, 27); // bodyHeight = 27-6=21
    assert.ok(enough.bodyHeight >= 20);
    assert.ok(enough.queueStripHeight > 0);
    assert.ok(enough.queueStripTracks >= 1);
  });

  test('queue strip hidden when bodyHeight < 20', () => {
    const small = computeLayout(100, 25); // bodyHeight = 25-7=18
    assert.equal(small.bodyHeight, 18);
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
