/**
 * AppView.ts — Full-screen TUI compositor.
 *
 * Layout (wide mode, cols >= 80):
 *
 *   ╭── header (1 row) ─────────────────────────────────────────────╮
 *   │ sidebar │ main panel (Discover / Search / Queue)  │ NowPlaying │
 *   │         ├── queue strip (0–4 rows, below main) ───┤            │
 *   ├── footer (shortcut bar + status line) ───────────────────────┤
 *   ╰────────────────────────────────────────────────────────────────╯
 *
 * Narrow mode (cols < 80): single column, stacked, current behaviour.
 *
 * Business logic lives in App.ts / actions.ts — this file is pure rendering.
 */

import { AppState, AppViewMode } from '../app/state.js';
import { computeLayout } from './layout.js';
import { renderSidebar }     from './Sidebar.js';
import { renderHomeView }    from './HomeView.js';
import { renderSearchView }  from './SearchView.js';
import { renderNowPlaying }  from './NowPlaying.js';
import { renderQueueVertical, renderQueueStrip } from './QueueView.js';
import {
  RESET, BOLD,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';

export type KeyHandler = (key: string) => void;

// ─── Box-drawing primitives ───────────────────────────────────────────────────

function topBorder(cols: number): string {
  return `${THEME.border}${BOX.topLeft}${BOX.horizontal.repeat(cols - 2)}${BOX.topRight}${RESET}`;
}

function bottomBorder(cols: number): string {
  return `${THEME.border}${BOX.bottomLeft}${BOX.horizontal.repeat(cols - 2)}${BOX.bottomRight}${RESET}`;
}

function fullSep(cols: number): string {
  return `${THEME.border}${BOX.teeLeft}${BOX.horizontal.repeat(cols - 2)}${BOX.teeRight}${RESET}`;
}

/**
 * A separator that spans the full width with T-junctions at the positions
 * where the sidebar and now-playing vertical dividers sit.
 */
function threePanelSep(
  cols: number,
  sidebarWidth: number,
  nowPlayingWidth: number,
  topRow: boolean       // true → ┬  (top T), false → ┴ (bottom T) or ─ at join
): string {
  // We use ┼ at column intersections during mid-body separators
  const dash = BOX.horizontal;
  const left  = sidebarWidth + 1;           // position of first inner vertical
  const right = cols - nowPlayingWidth - 2; // position of second inner vertical

  let row = BOX.teeLeft;
  for (let c = 1; c < cols - 1; c++) {
    if (c === left || c === right) {
      row += BOX.cross; // ┼
    } else {
      row += dash;
    }
  }
  row += BOX.teeRight;
  return `${THEME.border}${row}${RESET}`;
}

/** Full-width boxed row (outer border only) */
function fullRow(content: string, cols: number): string {
  const inner = cols - 4;
  const padded = padEndAnsi(content, inner);
  return `${THEME.border}${BOX.vertical}${RESET} ${padded} ${THEME.border}${BOX.vertical}${RESET}`;
}

/**
 * Compose a 3-panel row from sidebar, main, and now-playing content strings.
 * Each content string should already be `colWidth` visible chars wide or less.
 */
function threeCol(
  sidebar: string,
  main: string,
  nowPlaying: string,
  sidebarWidth: number,
  mainWidth: number,
  nowPlayingWidth: number
): string {
  const s = padEndAnsi(sidebar,    sidebarWidth);
  const m = padEndAnsi(main,       mainWidth);
  const n = padEndAnsi(nowPlaying, nowPlayingWidth);
  return (
    `${THEME.border}${BOX.vertical}${RESET}` +
    s +
    `${THEME.border}${BOX.vertical}${RESET}` +
    m +
    `${THEME.border}${BOX.vertical}${RESET}` +
    n +
    `${THEME.border}${BOX.vertical}${RESET}`
  );
}

/** 2-panel row: sidebar on left, combined (main+nowPlaying) on right */
function twoColRight(
  sidebar: string,
  right: string,
  sidebarWidth: number,
  rightWidth: number
): string {
  const s = padEndAnsi(sidebar, sidebarWidth);
  const r = padEndAnsi(right,   rightWidth);
  return (
    `${THEME.border}${BOX.vertical}${RESET}` +
    s +
    `${THEME.border}${BOX.vertical}${RESET}` +
    r +
    `${THEME.border}${BOX.vertical}${RESET}`
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function renderHeader(state: AppState, cols: number): string {
  // Compact single-line header with app name left and status right
  const appName = `${THEME.accent}${BOLD} ♪ JMusic${RESET}  ${THEME.dim}Terminal Audio Player${RESET}`;
  const appNameLen = stripAnsi(appName);

  // Right: currently playing track (if any)
  let rightPart = '';
  if (state.currentTrack && state.playbackStatus !== 'stopped') {
    const statusSymbol = state.playbackStatus === 'playing' ? '▶' : '⏸';
    const trackStr = `${statusSymbol} ${state.currentTrack.title}`.slice(0, 40);
    rightPart = `${THEME.dim}${trackStr}${RESET}  `;
  }
  const rightLen = stripAnsi(rightPart);

  const innerWidth = cols - 4; // inside the outer border chars + 2 spaces
  const gap = Math.max(1, innerWidth - appNameLen - rightLen);
  const content = appName + ' '.repeat(gap) + rightPart;

  return fullRow(content, cols);
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function renderBadge(key: string, desc: string): string {
  return `${THEME.badgeKeyBg}${THEME.badgeKeyFg}${BOLD} ${key} ${RESET}${THEME.muted} ${desc}${RESET}`;
}

function renderControls(state: AppState, cols: number): string {
  if (state.inputMode === 'search') {
    const hints = [
      renderBadge('Enter', 'Search'),
      renderBadge('Esc',   'Cancel'),
      renderBadge('Bksp',  'Delete'),
    ];
    return fullRow(hints.join(`  ${THEME.dim}│${RESET}  `), cols);
  }

  const allHints = [
    renderBadge('Space', 'Play/Pause'),
    renderBadge('Tab/C', 'Genre'),
    renderBadge('1-4',   'Views'),
    renderBadge('Enter', 'Play'),
    renderBadge('A',     'Queue'),
    renderBadge('/',     'Search'),
    renderBadge('←/→',  'Seek'),
    renderBadge('+/−',  'Vol'),
    renderBadge('N/P',   'Next/Prev'),
    renderBadge('Q',     'Quit'),
  ];

  // Fit as many hints as possible
  let line = '';
  let lineLen = 0;
  const sep = `  ${THEME.dim}│${RESET}  `;
  const sepLen = 5;
  const maxLen = cols - 4;

  for (let i = 0; i < allHints.length; i++) {
    const hLen = stripAnsi(allHints[i]);
    const addLen = i === 0 ? hLen : hLen + sepLen;
    if (lineLen + addLen > maxLen) break;
    line += i === 0 ? allHints[i] : sep + allHints[i];
    lineLen += addLen;
  }

  return fullRow(line, cols);
}

function renderStatusLine(state: AppState, cols: number): string {
  const msg = state.statusMessage || '';
  const isError =
    msg.toLowerCase().includes('error') ||
    msg.toLowerCase().includes('fail') ||
    msg.toLowerCase().includes('unavailable');
  const color = isError
    ? THEME.error
    : msg.includes('Playing') || msg.includes('Loaded') || msg.includes('Added')
    ? THEME.success
    : THEME.muted;
  const styled = msg ? `${color}${msg}${RESET}` : '';
  return fullRow(styled, cols);
}

// ─── AppView class ────────────────────────────────────────────────────────────

export class AppView {
  private onKeyCallback: KeyHandler | null = null;
  private resizeHandler: (() => void) | null = null;
  private isRaw: boolean = false;

  public init(onKey: KeyHandler): void {
    this.onKeyCallback = onKey;

    // Enter alternate screen and hide cursor
    process.stdout.write('\x1b[?1049h\x1b[?25l');

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      this.isRaw = true;
      process.stdin.resume();
      process.stdin.setEncoding('utf-8');
      process.stdin.on('data', this.handleInput);
    }

    this.resizeHandler = () => { /* handled in App.ts via stdout resize */ };
    process.stdout.on('resize', this.resizeHandler);

    process.on('uncaughtException', this.emergencyCleanup);
    process.on('unhandledRejection', this.emergencyCleanup);
  }

  private emergencyCleanup = (err: any): void => {
    this.destroy();
    console.error('[Emergency Exit] Unhandled error:', err?.message || err);
    process.exit(1);
  };

  private handleInput = (chunk: string): void => {
    if (!this.onKeyCallback) return;

    if (chunk === '\u0003') { this.onKeyCallback('Ctrl+C'); return; }
    if (chunk === '\x1b')   { this.onKeyCallback('Escape'); return; }
    if (chunk === '\x7f' || chunk === '\b') { this.onKeyCallback('Backspace'); return; }
    if (chunk === '\t')     { this.onKeyCallback('Tab'); return; }
    if (chunk === '\x1b[Z') { this.onKeyCallback('Shift+Tab'); return; }
    if (chunk === '\x1b[A') { this.onKeyCallback('up'); return; }
    if (chunk === '\x1b[B') { this.onKeyCallback('down'); return; }
    if (chunk === '\x1b[C') { this.onKeyCallback('right'); return; }
    if (chunk === '\x1b[D') { this.onKeyCallback('left'); return; }
    if (chunk === '\r' || chunk === '\n') { this.onKeyCallback('Enter'); return; }
    if (chunk === ' ') { this.onKeyCallback('Space'); return; }

    this.onKeyCallback(chunk);
  };

  // ─── Main render ─────────────────────────────────────────────────────────────

  public render(state: AppState): void {
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows    || 24;

    // ── Too small ───────────────────────────────────────────────────────────
    if (cols < 40 || rows < 10) {
      process.stdout.write(
        `\x1b[H\x1b[2J${THEME.error}Window too small (${cols}×${rows}). ` +
        `Please resize to at least 40×10.${RESET}\n`
      );
      return;
    }

    const layout = computeLayout(cols, rows);
    const output: string[] = [];

    // ── Top border + header ─────────────────────────────────────────────────
    output.push(topBorder(cols));
    output.push(renderHeader(state, cols));

    if (layout.isWide) {
      this.renderWide(state, layout, output);
    } else {
      this.renderNarrow(state, layout, output);
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    output.push(fullSep(cols));
    output.push(renderControls(state, cols));
    output.push(renderStatusLine(state, cols));
    output.push(bottomBorder(cols));

    // Pad any under-height (safety guard)
    while (output.length < rows) {
      output.push('');
    }

    // Atomic write — cursor to top, no flicker
    process.stdout.write(`\x1b[H${output.slice(0, rows).join('\n')}`);
  }

  // ─── Wide (3-column) layout ───────────────────────────────────────────────

  private renderWide(
    state: AppState,
    layout: ReturnType<typeof computeLayout>,
    output: string[]
  ): void {
    const {
      cols,
      sidebarWidth,
      mainWidth,
      nowPlayingWidth,
      panelHeight,
      queueStripHeight,
      queueStripTracks,
      bodyHeight,
    } = layout;

    // ── Top body separator (with T-junctions for 3 columns) ───────────────
    output.push(threePanelSep(cols, sidebarWidth, nowPlayingWidth, true));

    // ── Render panel contents ──────────────────────────────────────────────
    const sidebarLines   = renderSidebar(state, panelHeight, sidebarWidth);
    const nowPlayLines   = renderNowPlaying(state, panelHeight, nowPlayingWidth);

    let mainLines: string[];
    if (state.currentView === 'queue') {
      mainLines = renderQueueVertical(state, panelHeight, mainWidth);
    } else if (state.currentView === 'search') {
      mainLines = renderSearchView(state, panelHeight, mainWidth);
    } else if (state.currentView === 'nowPlaying') {
      // In "Now Playing" full-view mode on wide screen we still show
      // Discover in main and full NowPlaying on the right
      mainLines = renderHomeView(state, panelHeight, mainWidth);
    } else {
      mainLines = renderHomeView(state, panelHeight, mainWidth);
    }

    // Compose 3-column body rows
    for (let i = 0; i < panelHeight; i++) {
      output.push(
        threeCol(
          sidebarLines[i]  || '',
          mainLines[i]     || '',
          nowPlayLines[i]  || '',
          sidebarWidth,
          mainWidth,
          nowPlayingWidth
        )
      );
    }

    // ── Queue strip (below main, between sidebar vertical and NowPlaying) ──
    if (queueStripHeight > 0) {
      // Separator across full width with T-junctions
      output.push(threePanelSep(cols, sidebarWidth, nowPlayingWidth, false));

      const queueLines = renderQueueStrip(state, mainWidth, queueStripTracks + 1);
      // The strip shares the sidebar+nowplaying vertical space:
      // sidebar continues blank, nowplaying continues blank
      const blankSidebar = ' '.repeat(sidebarWidth);
      const blankNP      = ' '.repeat(nowPlayingWidth);

      for (let i = 0; i < queueLines.length; i++) {
        const ql = padEndAnsi(queueLines[i] || '', mainWidth);
        output.push(
          `${THEME.border}${BOX.vertical}${RESET}` +
          blankSidebar +
          `${THEME.border}${BOX.vertical}${RESET}` +
          ql +
          `${THEME.border}${BOX.vertical}${RESET}` +
          blankNP +
          `${THEME.border}${BOX.vertical}${RESET}`
        );
      }
    }

    // ── Pad remaining body rows ──────────────────────────────────────────
    const usedBodyRows = panelHeight + (queueStripHeight > 0 ? 1 + queueStripHeight : 0);
    const remaining = Math.max(0, bodyHeight - usedBodyRows);
    const blankRow =
      `${THEME.border}${BOX.vertical}${RESET}` +
      ' '.repeat(sidebarWidth) +
      `${THEME.border}${BOX.vertical}${RESET}` +
      ' '.repeat(mainWidth) +
      `${THEME.border}${BOX.vertical}${RESET}` +
      ' '.repeat(nowPlayingWidth) +
      `${THEME.border}${BOX.vertical}${RESET}`;
    for (let i = 0; i < remaining; i++) {
      output.push(blankRow);
    }
  }

  // ─── Narrow (single-column) layout ───────────────────────────────────────

  private renderNarrow(
    state: AppState,
    layout: ReturnType<typeof computeLayout>,
    output: string[]
  ): void {
    const { cols, bodyHeight } = layout;

    output.push(fullSep(cols));

    const panelWidth  = cols - 4;
    const panelHeight = Math.max(6, bodyHeight - 1);

    let lines: string[];
    if (state.currentView === 'home') {
      lines = renderHomeView(state, panelHeight, panelWidth);
    } else if (state.currentView === 'search') {
      lines = renderSearchView(state, panelHeight, panelWidth);
    } else if (state.currentView === 'queue') {
      lines = renderQueueVertical(state, panelHeight, panelWidth);
    } else {
      lines = renderNowPlaying(state, panelHeight, panelWidth);
    }

    for (let i = 0; i < panelHeight; i++) {
      output.push(fullRow(lines[i] || '', cols));
    }

    // Pad remaining
    while (output.length < layout.rows - layout.footerHeight - 1) {
      output.push(`${THEME.border}${BOX.vertical}${RESET}${' '.repeat(cols - 2)}${THEME.border}${BOX.vertical}${RESET}`);
    }
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  public destroy(): void {
    if (this.isRaw && process.stdin.isTTY) {
      try {
        process.stdin.removeListener('data', this.handleInput);
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch { /* ignore on exit */ }
    }
    if (this.resizeHandler) {
      process.stdout.removeListener('resize', this.resizeHandler);
    }
    // Restore alternate screen and show cursor
    process.stdout.write('\x1b[?1049l\x1b[?25h\n');
  }
}
