import { AppState } from '../app/state.js';
import { renderSearchView } from './SearchView.js';
import { renderNowPlaying } from './NowPlaying.js';
import { renderQueueView } from './QueueView.js';

export type KeyHandler = (key: string) => void;

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

    // Handle Ctrl+C (character 0x03)
    if (chunk === '\u0003') {
      this.onKeyCallback('Ctrl+C');
      return;
    }

    // Handle standalone Escape key
    if (chunk === '\x1b') {
      this.onKeyCallback('Escape');
      return;
    }

    // Handle Backspace (DEL or BS)
    if (chunk === '\x7f' || chunk === '\b') {
      this.onKeyCallback('Backspace');
      return;
    }

    // Handle ANSI arrow sequences
    if (chunk === '\x1b[A') {
      this.onKeyCallback('up');
      return;
    }
    if (chunk === '\x1b[B') {
      this.onKeyCallback('down');
      return;
    }
    if (chunk === '\x1b[C') {
      this.onKeyCallback('right');
      return;
    }
    if (chunk === '\x1b[D') {
      this.onKeyCallback('left');
      return;
    }

    // Enter key (\r or \n)
    if (chunk === '\r' || chunk === '\n') {
      this.onKeyCallback('Enter');
      return;
    }

    // Space key
    if (chunk === ' ') {
      this.onKeyCallback('Space');
      return;
    }

    // Standard character keys
    this.onKeyCallback(chunk);
  };

  public render(state: AppState): void {
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    if (cols < 40 || rows < 10) {
      process.stdout.write(`\x1b[H\x1b[2JWindow too small (${cols}x${rows}). Please expand your terminal to at least 40x10.\n`);
      return;
    }

    const output: string[] = [];

    // Header
    const title = ' JMusic ';
    const leftPad = Math.max(0, Math.floor((cols - title.length - 2) / 2));
    const rightPad = Math.max(0, cols - title.length - 2 - leftPad);
    output.push(`┌${'─'.repeat(leftPad)}${title}${'─'.repeat(rightPad)}┐`);

    // Available height for panels:
    const panelHeight = Math.max(6, rows - 10);
    const leftWidth = Math.floor((cols - 3) / 2);
    const rightWidth = cols - 3 - leftWidth;

    const leftLines = renderSearchView(state, panelHeight, leftWidth);
    const rightLines = renderNowPlaying(state, panelHeight, rightWidth);

    for (let i = 0; i < panelHeight; i++) {
      const left = (leftLines[i] || '').padEnd(leftWidth, ' ').slice(0, leftWidth);
      const right = (rightLines[i] || '').padEnd(rightWidth, ' ').slice(0, rightWidth);
      output.push(`│${left}│${right}│`);
    }

    // Middle separator for Queue
    output.push(`├${'─'.repeat(cols - 2)}┤`);

    // Queue section
    const queueLines = renderQueueView(state, cols - 4);
    for (const qLine of queueLines) {
      output.push(`│ ${qLine.padEnd(cols - 4, ' ')} │`);
    }
    while (output.length < rows - 4) {
      output.push(`│${' '.repeat(cols - 2)}│`);
    }

    // Footer divider
    output.push(`├${'─'.repeat(cols - 2)}┤`);

    // Controls line
    const controls = state.inputMode === 'search'
      ? ' Type to search | Enter: Search | Esc: Cancel '
      : ' /: Search | Enter: Play | Space: Play/Pause | ←/→: Seek | +/-: Vol | N: Next | P: Prev | A: Queue | Q: Quit ';
    output.push(`│ ${controls.padEnd(cols - 4, ' ')} │`);

    // Status message line (if any)
    const statusMsg = state.statusMessage ? ` ${state.statusMessage} ` : '';
    output.push(`│${statusMsg.padEnd(cols - 2, ' ')}│`);

    // Bottom border
    output.push(`└${'─'.repeat(cols - 2)}┘`);

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
    // Restore main screen buffer and show cursor
    process.stdout.write('\x1b[?1049l\x1b[?25h\n');
  }
}
