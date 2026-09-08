/**
 * ANSI colour helpers — thin wrappers so every TUI file imports one module.
 *
 * We use 256-colour (ESC[38;5;Nm) and 24-bit true-colour (ESC[38;2;R;G;Bm)
 * ANSI codes.  These work in all modern terminals (iTerm2, Windows Terminal,
 * Ghostty, Alacritty, Kitty, and standard macOS Terminal ≥ 3.x).
 *
 * Attribute codes:
 *   0 – reset   1 – bold   2 – dim   4 – underline
 */

// ─── Reset ───────────────────────────────────────────────────────────────────
export const RESET = '\x1b[0m';
export const BOLD  = '\x1b[1m';
export const DIM   = '\x1b[2m';

// ─── Foreground helpers ───────────────────────────────────────────────────────
const fg = (r: number, g: number, b: number) =>
  `\x1b[38;2;${r};${g};${b}m`;

// ─── Background helpers ───────────────────────────────────────────────────────
const bg = (r: number, g: number, b: number) =>
  `\x1b[48;2;${r};${g};${b}m`;

// ─── Palette ──────────────────────────────────────────────────────────────────
// Header / borders
export const C_BORDER      = fg(75, 85, 99);     // slate-500
export const C_HEADER_BG   = bg(30, 41, 59);     // slate-800
export const C_HEADER_FG   = fg(226, 232, 240);  // slate-200

// Section titles
export const C_SECTION_FG  = fg(148, 163, 184);  // slate-400
export const C_SECTION_BG  = bg(30, 41, 59);

// Search panel
export const C_RESULT_FG   = fg(203, 213, 225);  // slate-300
export const C_SELECTED_BG = bg(37, 99, 235);    // blue-600
export const C_SELECTED_FG = fg(255, 255, 255);
export const C_ARTIST_FG   = fg(148, 163, 184);  // slate-400
export const C_PROMPT_FG   = fg(99, 179, 237);   // sky-300
export const C_QUERY_FG    = fg(251, 191, 36);   // amber-400

// Now playing
export const C_NP_LABEL    = fg(100, 116, 139);  // slate-500
export const C_NP_VALUE    = fg(226, 232, 240);  // slate-200
export const C_NP_TITLE    = `${BOLD}${fg(255, 255, 255)}`;
export const C_NP_ARTIST   = fg(167, 243, 208);  // emerald-200
export const C_NP_ALBUM    = fg(148, 163, 184);

// Playback status colours
export const C_STATUS_PLAY   = fg(74, 222, 128);   // green-400  ▶ PLAYING
export const C_STATUS_PAUSE  = fg(251, 191, 36);   // amber-400  ⏸ PAUSED
export const C_STATUS_STOP   = fg(148, 163, 184);  // slate-400  ■ STOPPED
export const C_STATUS_BUF    = fg(96, 165, 250);   // blue-400   ◌ BUFFERING
export const C_STATUS_ERR    = fg(248, 113, 113);  // red-400    ✖ ERROR

// Progress bar
export const C_PROG_FILLED   = fg(99, 179, 237);   // sky-300 ━━━━
export const C_PROG_EMPTY    = fg(51, 65, 85);     // slate-700 ░░░
export const C_PROG_TIME     = fg(148, 163, 184);  // slate-400

// Volume
export const C_VOL_ON        = fg(74, 222, 128);   // green-400
export const C_VOL_MUTED     = fg(248, 113, 113);  // red-400

// Queue
export const C_QUEUE_ITEM    = fg(203, 213, 225);
export const C_QUEUE_ACTIVE  = fg(99, 179, 237);
export const C_QUEUE_EMPTY   = fg(100, 116, 139);

// Footer / controls
export const C_KEY_BG        = bg(51, 65, 85);     // slate-700
export const C_KEY_FG        = fg(255, 255, 255);
export const C_KEY_DESC      = fg(148, 163, 184);
export const C_STATUS_MSG_OK = fg(74, 222, 128);
export const C_STATUS_MSG_ERR= fg(248, 113, 113);

// ─── Utility functions ────────────────────────────────────────────────────────

/** Wrap text in an ANSI colour, reset afterwards. */
export function colored(color: string, text: string): string {
  return `${color}${text}${RESET}`;
}

/** Render a styled keyboard hint: [KEY] description */
export function keyHint(key: string, desc: string): string {
  return `${C_KEY_BG}${C_KEY_FG} ${key} ${RESET}${C_KEY_DESC}${desc}${RESET}`;
}

/** Strip all ANSI escape codes to get the visible character length. */
export function stripAnsi(str: string): number {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

/** Pad a string to a visible width, ignoring ANSI escape codes. */
export function padEndAnsi(str: string, targetWidth: number, padChar = ' '): string {
  const visible = stripAnsi(str);
  const needed  = Math.max(0, targetWidth - visible);
  return str + padChar.repeat(needed);
}
