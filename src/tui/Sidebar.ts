/**
 * Sidebar.ts — Left navigation panel.
 *
 * Renders:
 *  - App logo mark
 *  - Navigation items (Discover, Search, Queue, Now Playing)
 *  - Genre / category list
 *
 * All business logic lives in App.ts / actions.ts. This file is pure rendering.
 */

import { AppState, AppViewMode } from '../app/state.js';
import { DISCOVER_CATEGORIES } from '../api/types.js';
import {
  RESET, BOLD,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';

// ─── Nav items ───────────────────────────────────────────────────────────────

interface NavItem {
  id: AppViewMode;
  key: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',       key: '1', label: 'Discover',   icon: '♪' },
  { id: 'search',     key: '2', label: 'Search',     icon: '🔍' },
  { id: 'queue',      key: '3', label: 'Queue',      icon: '≡' },
  { id: 'nowPlaying', key: '4', label: 'Now Playing', icon: '▶' },
];

// ─── Category icons ──────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  featured:   '★',
  chill:      '~',
  electronic: '⚡',
  jazz:       '♫',
  rock:       '♦',
  recent:     '◷',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Pad a content string to exactly `innerWidth` visible characters,
 * then wrap it in the sidebar's left and right border chars.
 */
function sidebarRow(content: string, innerWidth: number): string {
  const padded = padEndAnsi(content, innerWidth);
  return `${THEME.border}${BOX.vertical}${RESET}${padded}${THEME.border}${BOX.vertical}${RESET}`;
}

function divider(innerWidth: number): string {
  return `${THEME.border}${BOX.teeLeft}${BOX.horizontal.repeat(innerWidth)}${BOX.teeRight}${RESET}`;
}

// ─── Renderer ────────────────────────────────────────────────────────────────

/**
 * Render the sidebar as an array of exactly `height` lines.
 * Each line is `totalWidth` visible characters wide.
 *
 * @param state      - Current application state
 * @param height     - Number of rows to fill (bodyHeight)
 * @param totalWidth - Total sidebar column width including border chars (sidebarWidth)
 */
export function renderSidebar(
  state: AppState,
  height: number,
  totalWidth: number
): string[] {
  // Inner content width = totalWidth minus the 2 vertical border chars
  const inner = Math.max(4, totalWidth - 2);
  const lines: string[] = [];

  // ── Logo mark ──────────────────────────────────────────────────────────────
  const logoLine1 = `${THEME.accent}${BOLD} ♪ JMusic${RESET}`;
  lines.push(sidebarRow(logoLine1, inner));

  const tagLine = `${THEME.dim} music for devs${RESET}`;
  if (stripAnsi(tagLine) <= inner) {
    lines.push(sidebarRow(tagLine, inner));
  } else {
    lines.push(sidebarRow('', inner));
  }

  lines.push(divider(inner));

  // ── Navigation items ───────────────────────────────────────────────────────
  const queueCount = state.queue.length > 0 ? ` (${state.queue.length})` : '';

  for (const item of NAV_ITEMS) {
    const isActive = state.currentView === item.id;
    const label = item.id === 'queue'
      ? `${item.label}${queueCount}`
      : item.label;

    // Truncate label if sidebar is very narrow
    const maxLabelLen = inner - 5; // space for icon + key + spaces
    const truncLabel = label.length > maxLabelLen
      ? label.slice(0, maxLabelLen - 1) + '…'
      : label;

    let row: string;
    if (isActive) {
      const content = ` ${item.icon} ${truncLabel}`;
      const padded = padEndAnsi(
        `${THEME.selectedBg}${THEME.selectedFg}${BOLD}${content}${RESET}`,
        inner
      );
      // The padded call doesn't know about the bg color, so extend manually
      const visLen = stripAnsi(content);
      const pad = Math.max(0, inner - visLen);
      row = `${THEME.border}${BOX.vertical}${RESET}${THEME.selectedBg}${THEME.selectedFg}${BOLD}${content}${' '.repeat(pad)}${RESET}${THEME.border}${BOX.vertical}${RESET}`;
    } else {
      const content = ` ${THEME.dim}${item.key}${RESET} ${THEME.muted}${truncLabel}${RESET}`;
      row = sidebarRow(content, inner);
    }

    lines.push(row);
  }

  lines.push(divider(inner));

  // ── Genre / Category list ──────────────────────────────────────────────────
  // Section heading
  const genreHeading = ` ${THEME.dim}GENRES${RESET}`;
  lines.push(sidebarRow(genreHeading, inner));

  for (const cat of DISCOVER_CATEGORIES) {
    const isActive = state.discoverCategory === cat.key;
    const icon = CATEGORY_ICONS[cat.key] ?? '·';

    if (isActive) {
      const content = ` ${icon} ${cat.name}`;
      const visLen = stripAnsi(content);
      const pad = Math.max(0, inner - visLen);
      lines.push(
        `${THEME.border}${BOX.vertical}${RESET}${THEME.selectedBg}${THEME.accent}${BOLD}${content}${' '.repeat(pad)}${RESET}${THEME.border}${BOX.vertical}${RESET}`
      );
    } else {
      const content = ` ${THEME.dim}${icon}${RESET} ${THEME.muted}${cat.name}${RESET}`;
      lines.push(sidebarRow(content, inner));
    }
  }

  // ── Fill remaining rows ────────────────────────────────────────────────────
  while (lines.length < height) {
    lines.push(sidebarRow('', inner));
  }

  return lines.slice(0, height);
}
