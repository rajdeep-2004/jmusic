/**
 * layout.ts — Dynamic panel dimension calculator.
 *
 * Pure computation: no I/O, no ANSI. Returns a LayoutDimensions object
 * that every TUI component can use to know how wide/tall it should render.
 *
 * Layout structure (when wide enough):
 *
 *   ╭─ header (1 row) ─────────────────────────────────────────────╮
 *   │ sidebar │ main content                     │ now playing      │
 *   │         ├─ (main body rows) ───────────────┤                  │
 *   │         │ queue strip (0–4 rows)            │                  │
 *   ├─ footer (2 rows) ────────────────────────────────────────────┤
 *   ╰──────────────────────────────────────────────────────────────╯
 *
 * When cols < MIN_WIDE (80), falls back to single-column stacked mode.
 */

/** Minimum terminal width to show 3-column layout */
export const MIN_WIDE = 80;

export interface LayoutDimensions {
  cols: number;
  rows: number;

  /** Whether the 3-column wide layout is active */
  isWide: boolean;

  /** Height of the top header row (always 1) */
  headerHeight: number;

  /** Height of the bottom footer area (shortcut bar + status line) */
  footerHeight: number;

  /** Number of vertical rows available between header and footer */
  bodyHeight: number;

  /** Width of the left sidebar panel (includes its border characters) */
  sidebarWidth: number;

  /** Width of the right now-playing panel (includes its border characters) */
  nowPlayingWidth: number;

  /**
   * Width of the middle main content panel (includes its border characters).
   * mainWidth = cols - sidebarWidth - nowPlayingWidth - 2 (outer border chars)
   */
  mainWidth: number;

  /**
   * Number of rows used by the queue strip at the bottom of the main column.
   * 0 when hidden.  When visible: 1 header + queueStripTracks + 1 total line.
   */
  queueStripHeight: number;

  /** Number of queue tracks shown in the strip (queueStripHeight - 2 when > 0) */
  queueStripTracks: number;

  /**
   * Vertical rows available for the main list / now-playing panels
   * (bodyHeight minus queueStripHeight, minus the separator row when strip shown)
   */
  panelHeight: number;
}

/**
 * Compute the layout dimensions for the given terminal size.
 * Call this at the top of every render cycle.
 */
export function computeLayout(cols: number, rows: number): LayoutDimensions {
  // Fixed rows consumed by the compositor's outer frame:
  //   topBorder(1) + header(1) + threePanelSep/fullSep(1) = 3 top
  //   fullSep(1) + controls(1) + status(1) + bottomBorder(1) = 4 bottom
  const headerHeight = 3; // topBorder + header + body-separator row
  const footerHeight = 4; // fullSep + controls + statusLine + bottomBorder

  const bodyHeight = Math.max(4, rows - headerHeight - footerHeight);

  const isWide = cols >= MIN_WIDE;

  if (!isWide) {
    // Single-column fallback
    return {
      cols,
      rows,
      isWide: false,
      headerHeight,
      footerHeight,
      bodyHeight,
      sidebarWidth: 0,
      nowPlayingWidth: 0,
      mainWidth: cols - 2, // inside the outer box
      queueStripHeight: 0,
      queueStripTracks: 0,
      panelHeight: bodyHeight,
    };
  }

  // ── 3-column widths ────────────────────────────────────────────────────────
  // Sidebar: compact navigation and genre list
  const sidebarWidth = cols >= 140 ? 22 : cols >= 100 ? 20 : 18;

  // Now Playing (Right Pane):
  // Responsive sizing giving generous breathing room (~30-33% of total width)
  // so track info, progress bar, controls, and visual artwork can shine.
  let nowPlayingWidth: number;
  if (cols < 100) {
    nowPlayingWidth = 28;
  } else if (cols < 130) {
    nowPlayingWidth = 36;
  } else if (cols < 160) {
    nowPlayingWidth = 46;
  } else {
    nowPlayingWidth = Math.min(62, Math.max(48, Math.floor(cols * 0.32)));
  }

  // Main takes the rest. 4 border characters:
  // outer left (1) + divider 1 (1) + divider 2 (1) + outer right (1) = 4
  const mainWidth = Math.max(20, cols - sidebarWidth - nowPlayingWidth - 4);

  // ── Queue strip ────────────────────────────────────────────────────────────
  // Show if we have at least 22 rows.  Strip = header row + 2 track rows + total row = 4
  const showQueueStrip = bodyHeight >= 20;
  const queueStripTracks = showQueueStrip ? 2 : 0;
  const queueStripHeight = showQueueStrip ? queueStripTracks + 2 : 0; // +2 = header + total

  // panelHeight: remaining rows after the queue strip (and its separator row)
  const separatorRow = showQueueStrip ? 1 : 0;
  const panelHeight = Math.max(4, bodyHeight - queueStripHeight - separatorRow);

  return {
    cols,
    rows,
    isWide: true,
    headerHeight,
    footerHeight,
    bodyHeight,
    sidebarWidth,
    nowPlayingWidth,
    mainWidth,
    queueStripHeight,
    queueStripTracks,
    panelHeight,
  };
}
