import { AppState } from '../app/state.js';
import { renderSearchView } from './SearchView.js';
import { renderNowPlaying } from './NowPlaying.js';
import { renderQueueView } from './QueueView.js';
import {
  RESET, BOLD, DIM,
  C_BORDER, C_HEADER_FG, C_HEADER_BG,
  C_SECTION_FG,
  C_STATUS_MSG_OK, C_STATUS_MSG_ERR,
  C_KEY_BG, C_KEY_FG, C_KEY_DESC,
  padEndAnsi, stripAnsi,
} from './colors.js';

export type KeyHandler = (key: string) => void;

// ─── Colour helpers local to AppView ─────────────────────────────────────────

function renderHeader(cols: number): string {
  const title = ' ♪  J M u s i c  ♪ ';
  const titleColored = `${C_HEADER_BG}${C_HEADER_FG}${BOLD}${title}${RESET}`;
  const titleV = title.length + 2; // +2 for the ┌ and space chars
  const leftPad  = Math.max(0, Math.floor((cols - titleV) / 2));
  const rightPad = Math.max(0, cols - titleV - leftPad);
  return (
    `${C_BORDER}┌${RESET}` +
    `${C_BORDER}${'─'.repeat(leftPad)}${RESET}` +
    titleColored +
    `${C_BORDER}${'─'.repeat(rightPad)}${RESET}` +
    `${C_BORDER}┐${RESET}`
  );
}

function renderPanelSep(cols: number): string {
  return `${C_BORDER}├${'─'.repeat(cols - 2)}┤${RESET}`;
}

function renderBottomBorder(cols: number): string {
  return `${C_BORDER}└${'─'.repeat(cols - 2)}┘${RESET}`;
}

function renderSideRow(left: string, right: string, leftWidth: number, rightWidth: number): string {
  const l = padEndAnsi(left, leftWidth).slice(0, leftWidth + (left.length - stripAnsi(left)));
  const r = padEndAnsi(right, rightWidth).slice(0, rightWidth + (right.length - stripAnsi(right)));
  return `${C_BORDER}│${RESET}${l}${C_BORDER}│${RESET}${r}${C_BORDER}│${RESET}`;
}

function renderFullRow(content: string, cols: number): string {
  const inner = cols - 4;
  const padded = padEndAnsi(content, inner);
  return `${C_BORDER}│${RESET} ${padded} ${C_BORDER}│${RESET}`;
}

/** Render a single styled key-hint badge: [KEY] desc */
function badge(key: string, desc: string): string {
  return `${C_KEY_BG}${C_KEY_FG}${BOLD} ${key} ${RESET}${C_KEY_DESC}${desc}${RESET}`;
}

function renderControls(state: AppState, cols: number): string {
  if (state.inputMode === 'search') {
    const hints = [
      badge('Enter', 'Search'),
      badge('Esc', 'Cancel'),
      badge('Bksp', 'Delete'),
    ];
    const row = '  ' + hints.join(`  ${DIM}|${RESET}  `);
    return renderFullRow(row, cols);
  }

  const hints = [
    badge('/', 'Search'),
    badge('Enter', 'Play'),
    badge('Space', 'Pause'),
    badge('←/→', 'Seek'),
    badge('+/−', 'Vol'),
    badge('M', 'Mute'),
    badge('A', 'Queue'),
    badge('N/P', 'Next/Prev'),
    badge('Q', 'Quit'),
  ];

  // Join with dim separators; if row is too wide it wraps gracefully in-terminal
  const row = hints.join(`  ${DIM}│${RESET}  `);
  return renderFullRow(row, cols);
}

function renderStatusLine(state: AppState, cols: number): string {
  let msg = state.statusMessage || '';
  const isError = msg.toLowerCase().includes('error') ||
                  msg.toLowerCase().includes('fail') ||
                  msg.toLowerCase().includes('unavailable');
  const color = isError ? C_STATUS_MSG_ERR : C_STATUS_MSG_OK;
  const styled = msg ? `${color}${msg}${RESET}` : '';
  return renderFullRow(styled, cols);
}

// ─── AppView class ────────────────────────────────────────────────────────────

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
      // Re-render will be triggered by App
    };
    process.stdout.on('resize', this.resizeHandler);

    // Emergency crash safety: ensure terminal is restored
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
    if (chunk === '\x1b[A') { this.onKeyCallback('up');    return; }
    if (chunk === '\x1b[B') { this.onKeyCallback('down');  return; }
    if (chunk === '\x1b[C') { this.onKeyCallback('right'); return; }
    if (chunk === '\x1b[D') { this.onKeyCallback('left');  return; }
    if (chunk === '\r' || chunk === '\n') { this.onKeyCallback('Enter'); return; }
    if (chunk === ' ') { this.onKeyCallback('Space'); return; }

    this.onKeyCallback(chunk);
  };

  public render(state: AppState): void {
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    if (cols < 40 || rows < 10) {
      process.stdout.write(
        `\x1b[H\x1b[2J${C_STATUS_MSG_ERR}Window too small (${cols}×${rows}). ` +
        `Please expand to at least 40×10.${RESET}\n`
      );
      return;
    }

    const output: string[] = [];

    // ── Header ────────────────────────────────────────────────────────────────
    output.push(renderHeader(cols));

    // ── Main panels ───────────────────────────────────────────────────────────
    const panelHeight = Math.max(6, rows - 10);
    const leftWidth   = Math.floor((cols - 3) / 2);
    const rightWidth  = cols - 3 - leftWidth;

    const leftLines  = renderSearchView(state, panelHeight, leftWidth);
    const rightLines = renderNowPlaying(state, panelHeight, rightWidth);

    for (let i = 0; i < panelHeight; i++) {
      output.push(
        renderSideRow(
          leftLines[i]  || '',
          rightLines[i] || '',
          leftWidth,
          rightWidth
        )
      );
    }

    // ── Queue ─────────────────────────────────────────────────────────────────
    output.push(renderPanelSep(cols));
    const queueLines = renderQueueView(state, cols - 4);
    for (const qLine of queueLines) {
      output.push(renderFullRow(qLine, cols));
    }

    // Pad any remaining rows before footer
    while (output.length < rows - 4) {
      output.push(`${C_BORDER}│${RESET}${' '.repeat(cols - 2)}${C_BORDER}│${RESET}`);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    output.push(renderPanelSep(cols));
    output.push(renderControls(state, cols));
    output.push(renderStatusLine(state, cols));
    output.push(renderBottomBorder(cols));

    // Render atomically
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
    // Restore main screen buffer and show cursor
    process.stdout.write('\x1b[?1049l\x1b[?25h\n');
  }
}
