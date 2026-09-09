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

// ─── Semantic Theme (Warm Beige / Cream / Champagne Aesthetic) ──────────────
export const THEME = {
  primary: fg(250, 247, 242),      // Warm Cream / Pearl (#FAF7F2)
  accent: fg(243, 201, 139),       // Warm Champagne / Golden Sand (#F3C98B)
  accentWarm: fg(218, 160, 109),   // Toasted Caramel / Biscuit (#DAA06D)
  muted: fg(181, 168, 149),        // Warm Oat / Greige (#B5A895)
  dim: fg(125, 114, 101),          // Warm Taupe (#7D7265)
  success: fg(168, 198, 134),      // Soft Matcha / Sage Green (#A8C686)
  warning: fg(232, 184, 109),      // Warm Honey Amber (#E8B86D)
  error: fg(217, 119, 108),        // Warm Terracotta (#D9776C)
  selectedBg: bg(74, 53, 37),      // Rich Espresso Brown (#4A3525)
  selectedFg: fg(255, 251, 245),   // Pure Cream (#FFFBF5)
  border: fg(94, 84, 72),          // Deep Roast Walnut (#5E5448)
  borderActive: fg(243, 201, 139), // Champagne
  title: `${BOLD}${fg(250, 247, 242)}`,
  tagBg: bg(43, 37, 32),           // Very dark warm coffee
  badgeKeyBg: bg(61, 53, 45),      // Deep mocha badge
  badgeKeyFg: fg(245, 235, 224),   // Light beige text
  cat: fg(235, 211, 186),          // Calico Cream
  catPaws: fg(245, 203, 167),      // Peach paws
  note: fg(250, 215, 160),         // Golden melody notes
};

// ─── Box-Drawing Unicode Constants (Rounded Aesthetic) ──────────────────────
export const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  teeLeft: '├',
  teeRight: '┤',
  teeTop: '┬',
  teeBottom: '┴',
  cross: '┼',
};

// ─── Palette (Backward Compatibility & Beige Tuning) ─────────────────────────
// Header / borders
export const C_BORDER      = fg(94, 84, 72);     // Deep Roast Walnut
export const C_HEADER_BG   = bg(43, 37, 32);     // Dark Coffee
export const C_HEADER_FG   = fg(245, 235, 224);  // Light Beige

// Section titles
export const C_SECTION_FG  = fg(181, 168, 149);  // Warm Oat
export const C_SECTION_BG  = bg(43, 37, 32);

// Search panel
export const C_RESULT_FG   = fg(235, 228, 218);  // Soft Cream
export const C_SELECTED_BG = bg(74, 53, 37);     // Rich Espresso Brown
export const C_SELECTED_FG = fg(255, 251, 245);  // Pure Cream
export const C_ARTIST_FG   = fg(181, 168, 149);  // Warm Oat
export const C_PROMPT_FG   = fg(243, 201, 139);  // Champagne
export const C_QUERY_FG    = fg(232, 184, 109);  // Honey Amber

// Now playing
export const C_NP_LABEL    = fg(125, 114, 101);  // Taupe
export const C_NP_VALUE    = fg(245, 235, 224);  // Light Beige
export const C_NP_TITLE    = `${BOLD}${fg(250, 247, 242)}`;
export const C_NP_ARTIST   = fg(243, 201, 139);  // Warm Champagne
export const C_NP_ALBUM    = fg(181, 168, 149);  // Oat

// Playback status colours
export const C_STATUS_PLAY   = fg(168, 198, 134);  // Matcha Green ▶ PLAYING
export const C_STATUS_PAUSE  = fg(232, 184, 109);  // Honey Amber  ⏸ PAUSED
export const C_STATUS_STOP   = fg(125, 114, 101);  // Warm Taupe   ■ STOPPED
export const C_STATUS_BUF    = fg(218, 160, 109);  // Caramel      ◌ BUFFERING
export const C_STATUS_ERR    = fg(217, 119, 108);  // Terracotta   ✖ ERROR

// Progress bar
export const C_PROG_FILLED   = fg(243, 201, 139);  // Warm Champagne ━━━━
export const C_PROG_EMPTY    = fg(66, 58, 49);     // Roasted Walnut ░░░
export const C_PROG_TIME     = fg(181, 168, 149);  // Warm Oat

// Volume
export const C_VOL_ON        = fg(168, 198, 134);  // Matcha Green
export const C_VOL_MUTED     = fg(217, 119, 108);  // Terracotta

// Queue
export const C_QUEUE_ITEM    = fg(218, 209, 197);
export const C_QUEUE_ACTIVE  = fg(243, 201, 139);
export const C_QUEUE_EMPTY   = fg(125, 114, 101);

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
  return `${THEME.badgeKeyBg}${THEME.badgeKeyFg}${BOLD} ${key} ${RESET}${THEME.muted} ${desc}${RESET}`;
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
