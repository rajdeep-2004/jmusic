import { AppState, AppViewMode } from '../app/state.js';
import { renderHomeView } from './HomeView.js';
import { renderSearchView } from './SearchView.js';
import { renderNowPlaying } from './NowPlaying.js';
import { renderQueueView, renderQueueVertical } from './QueueView.js';
import { renderLogo } from './Logo.js';
import {
  RESET, BOLD, DIM,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';

export type KeyHandler = (key: string) => void;

function renderTopBorder(cols: number): string {
  return `${THEME.border}${BOX.topLeft}${BOX.horizontal.repeat(cols - 2)}${BOX.topRight}${RESET}`;
}

function renderPanelSep(cols: number): string {
  return `${THEME.border}${BOX.teeLeft}${BOX.horizontal.repeat(cols - 2)}${BOX.teeRight}${RESET}`;
}

function renderBottomBorder(cols: number): string {
  return `${THEME.border}${BOX.bottomLeft}${BOX.horizontal.repeat(cols - 2)}${BOX.bottomRight}${RESET}`;
}

function renderFullRow(content: string, cols: number): string {
  const inner = cols - 4;
  const padded = padEndAnsi(content, inner);
  return `${THEME.border}${BOX.vertical}${RESET} ${padded} ${THEME.border}${BOX.vertical}${RESET}`;
}

function renderSideRow(left: string, right: string, leftWidth: number, rightWidth: number): string {
  const l = padEndAnsi(left, leftWidth).slice(0, leftWidth + (left.length - stripAnsi(left)));
  const r = padEndAnsi(right, rightWidth).slice(0, rightWidth + (right.length - stripAnsi(right)));
  return `${THEME.border}${BOX.vertical}${RESET}${l}${THEME.border}${BOX.vertical}${RESET}${r}${THEME.border}${BOX.vertical}${RESET}`;
}

function renderBadge(key: string, desc: string): string {
  return `${THEME.badgeKeyBg}${THEME.badgeKeyFg}${BOLD} ${key} ${RESET}${THEME.muted} ${desc}${RESET}`;
}

function renderHeaderBanner(cols: number, rows: number): string[] {
  const lines: string[] = [];

  // Show ASCII art logo if terminal has enough height and width
  if (rows >= 28 && cols >= 70) {
    const logoLines = renderLogo(cols - 4);
    for (const l of logoLines) {
      const padLeft = Math.max(0, Math.floor((cols - 4 - stripAnsi(l)) / 2));
      lines.push(renderFullRow(' '.repeat(padLeft) + l, cols));
    }
  } else {
    const title = `♪  ${THEME.accent}${BOLD}J M U S I C${RESET}  ${THEME.muted}•  Terminal Audio Player${RESET}  ♪`;
    const titleVisible = stripAnsi(title);
    const padLeft = Math.max(0, Math.floor((cols - 4 - titleVisible) / 2));
    lines.push(renderFullRow(' '.repeat(padLeft) + title, cols));
  }

  return lines;
}

function renderNavTabs(currentView: AppViewMode, cols: number): string {
  const tabsConfig: Array<{ id: AppViewMode; key: string; label: string }> = [
    { id: 'home', key: '1', label: 'Discover' },
    { id: 'search', key: '2', label: 'Search' },
    { id: 'queue', key: '3', label: 'Queue' },
    { id: 'nowPlaying', key: '4', label: 'Now Playing' },
  ];

  const renderedTabs = tabsConfig.map((tab) => {
    const isActive = tab.id === currentView;
    if (isActive) {
      return `${THEME.selectedBg}${THEME.selectedFg}${BOLD} ${tab.key}:${tab.label} ${RESET}`;
    }
    return `${THEME.dim}${tab.key}:${tab.label}${RESET}`;
  });

  const row = '  ' + renderedTabs.join(`   ${THEME.border}│${RESET}   `);
  return renderFullRow(row, cols);
}

function renderControls(state: AppState, cols: number): string {
  if (state.inputMode === 'search') {
    const hints = [
      renderBadge('Enter', 'Submit Search'),
      renderBadge('Esc', 'Cancel Search'),
      renderBadge('Bksp', 'Delete'),
    ];
    const row = '  ' + hints.join(`   ${THEME.dim}│${RESET}   `);
    return renderFullRow(row, cols);
  }

  const row1Hints = [
    renderBadge('Space', 'Play/Pause'),
    renderBadge('Tab / 1-4', 'Views'),
    renderBadge('C', 'Genre'),
    renderBadge('Enter', 'Play'),
    renderBadge('A', 'Queue'),
  ];

  const row2Hints = [
    renderBadge('/', 'Search'),
    renderBadge('←/→', 'Seek -/+5s'),
    renderBadge('+/−', 'Vol'),
    renderBadge('M', 'Mute'),
    renderBadge('N/P', 'Next/Prev'),
    renderBadge('Q', 'Quit'),
  ];

  const row1 = ' ' + row1Hints.join(`  ${THEME.dim}│${RESET}  `);
  const row2 = ' ' + row2Hints.join(`  ${THEME.dim}│${RESET}  `);

  if (cols >= 90) {
    const merged = [
      renderBadge('Space', 'Play/Pause'),
      renderBadge('Tab / 1-4', 'Views'),
      renderBadge('C', 'Genre'),
      renderBadge('Enter', 'Play'),
      renderBadge('A', 'Queue'),
      renderBadge('/', 'Search'),
      renderBadge('←/→', 'Seek'),
      renderBadge('+/−', 'Vol'),
      renderBadge('M', 'Mute'),
      renderBadge('N/P', 'Next/Prev'),
      renderBadge('Q', 'Quit'),
    ].join(`  ${THEME.dim}│${RESET}  `);
    return renderFullRow(merged, cols);
  }

  return renderFullRow(row1, cols);
}

function renderStatusLine(state: AppState, cols: number): string {
  const msg = state.statusMessage || '';
  const isError = msg.toLowerCase().includes('error') ||
                  msg.toLowerCase().includes('fail') ||
                  msg.toLowerCase().includes('unavailable');
  const color = isError ? THEME.error : (msg.includes('Playing') || msg.includes('Loaded') ? THEME.success : THEME.muted);
  const styled = msg ? `${color}${msg}${RESET}` : '';
  return renderFullRow(styled, cols);
}

export class AppView {
  private onKeyCallback: KeyHandler | null = null;
  private resizeHandler: (() => void) | null = null;
  private isRaw: boolean = false;

  public init(onKey: KeyHandler): void {
    this.onKeyCallback = onKey;

    // Switch to alternate screen buffer and hide cursor
    process.stdout.write('\x1b[?1049h\x1b[?25l');

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      this.isRaw = true;
      process.stdin.resume();
      process.stdin.setEncoding('utf-8');
      process.stdin.on('data', this.handleInput);
    }

    this.resizeHandler = () => {
      // Handled in main App loop
    };
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

  public render(state: AppState): void {
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    if (cols < 40 || rows < 10) {
      process.stdout.write(
        `\x1b[H\x1b[2J${THEME.error}Window too small (${cols}×${rows}). ` +
        `Please resize to at least 40×10.${RESET}\n`
      );
      return;
    }

    const output: string[] = [];

    // ── Header ────────────────────────────────────────────────────────────────
    output.push(renderTopBorder(cols));
    const bannerLines = renderHeaderBanner(cols, rows);
    for (const bLine of bannerLines) {
      output.push(bLine);
    }
    output.push(renderPanelSep(cols));
    output.push(renderNavTabs(state.currentView, cols));
    output.push(renderPanelSep(cols));

    // Calculate vertical budget
    // header (border + banner + sep + nav + sep = ~5 rows)
    // footer (sep + controls + status + border = 4 rows)
    const fixedRows = output.length + 4;
    const isWide = cols >= 88;

    if (isWide && state.currentView !== 'nowPlaying') {
      // Split view: Left = Active View (Home, Search, or Queue), Right = Now Playing
      const leftWidth = Math.floor((cols - 3) / 2);
      const rightWidth = cols - 3 - leftWidth;

      // Bottom queue strip only if queue is not empty and we have enough rows (>= 25)
      const showBottomQueue = rows >= 25 && state.currentView !== 'queue';
      const queueStripRows = showBottomQueue ? 2 : 0;
      const panelHeight = Math.max(6, rows - fixedRows - queueStripRows);

      let leftLines: string[] = [];
      if (state.currentView === 'home') {
        leftLines = renderHomeView(state, panelHeight, leftWidth);
      } else if (state.currentView === 'search') {
        leftLines = renderSearchView(state, panelHeight, leftWidth);
      } else if (state.currentView === 'queue') {
        leftLines = renderQueueVertical(state, panelHeight, leftWidth);
      }

      const rightLines = renderNowPlaying(state, panelHeight, rightWidth);

      for (let i = 0; i < panelHeight; i++) {
        output.push(
          renderSideRow(
            leftLines[i] || '',
            rightLines[i] || '',
            leftWidth,
            rightWidth
          )
        );
      }

      if (showBottomQueue) {
        output.push(renderPanelSep(cols));
        const qLines = renderQueueView(state, cols - 4);
        for (const ql of qLines) {
          output.push(renderFullRow(ql, cols));
        }
      }
    } else {
      // Full view or narrow screen
      const panelWidth = cols - 4;
      const panelHeight = Math.max(6, rows - fixedRows);

      let lines: string[] = [];
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
        output.push(renderFullRow(lines[i] || '', cols));
      }
    }

    // Pad any remaining rows before footer
    while (output.length < rows - 4) {
      output.push(`${THEME.border}${BOX.vertical}${RESET}${' '.repeat(cols - 2)}${THEME.border}${BOX.vertical}${RESET}`);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    output.push(renderPanelSep(cols));
    output.push(renderControls(state, cols));
    output.push(renderStatusLine(state, cols));
    output.push(renderBottomBorder(cols));

    // Render atomically to screen
    process.stdout.write(`\x1b[H${output.join('\n')}`);
  }

  public destroy(): void {
    if (this.isRaw && process.stdin.isTTY) {
      try {
        process.stdin.removeListener('data', this.handleInput);
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch {
        // ignore on exit
      }
    }
    if (this.resizeHandler) {
      process.stdout.removeListener('resize', this.resizeHandler);
    }
    // Restore alternate screen buffer and show cursor
    process.stdout.write('\x1b[?1049l\x1b[?25h\n');
  }
}
