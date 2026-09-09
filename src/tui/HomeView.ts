import { AppState } from '../app/state.js';
import { DISCOVER_CATEGORIES } from '../api/types.js';
import {
  RESET, BOLD, DIM,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';
import { formatTime } from '../utils/formatTime.js';

export function renderHomeView(state: AppState, maxRows: number, maxWidth: number): string[] {
  const lines: string[] = [];

  // ── Header divider ──────────────────────────────────────────────────────────
  const activeCategory = DISCOVER_CATEGORIES.find((c) => c.key === state.discoverCategory) || DISCOVER_CATEGORIES[0];
  const sectionLabel = ` 📻 Discover: ${THEME.accent}${BOLD}${activeCategory.name}${RESET} `;
  const labelVisible = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelVisible - 2);
  lines.push(
    `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}${THEME.title}${sectionLabel}${RESET}${THEME.border}${BOX.horizontal.repeat(divLen)}${RESET}`
  );

  let availableRows = maxRows - 1;

  // ── Category Tabs Bar with Adaptive Viewport ──────────────────────────────
  const activeIdx = Math.max(0, DISCOVER_CATEGORIES.findIndex((c) => c.key === state.discoverCategory));

  const renderedTabs = DISCOVER_CATEGORIES.map((cat, idx) => {
    const isActive = idx === activeIdx;
    if (isActive) {
      return `${THEME.selectedBg}${THEME.selectedFg}${BOLD} [ ${cat.name} ] ${RESET}`;
    }
    return `${THEME.dim}[ ${cat.name} ]${RESET}`;
  });

  const allTabsStr = ' ' + renderedTabs.join(' ');
  if (stripAnsi(allTabsStr) <= maxWidth) {
    lines.push(padEndAnsi(allTabsStr, maxWidth));
  } else {
    // Sliding window centered on active category
    let windowStart = activeIdx;
    let windowEnd = activeIdx;

    while (true) {
      let expanded = false;

      if (windowStart > 0) {
        const testTabs = renderedTabs.slice(windowStart - 1, windowEnd + 1);
        const leftIndicator = windowStart - 1 > 0 ? `${THEME.accent}‹ ${RESET}` : ' ';
        const rightIndicator = windowEnd < DISCOVER_CATEGORIES.length - 1 ? `${THEME.accent} ›${RESET}` : ' ';
        const line = leftIndicator + testTabs.join(' ') + rightIndicator;
        if (stripAnsi(line) <= maxWidth) {
          windowStart--;
          expanded = true;
        }
      }

      if (windowEnd < DISCOVER_CATEGORIES.length - 1) {
        const testTabs = renderedTabs.slice(windowStart, windowEnd + 2);
        const leftIndicator = windowStart > 0 ? `${THEME.accent}‹ ${RESET}` : ' ';
        const rightIndicator = windowEnd + 2 < DISCOVER_CATEGORIES.length ? `${THEME.accent} ›${RESET}` : ' ';
        const line = leftIndicator + testTabs.join(' ') + rightIndicator;
        if (stripAnsi(line) <= maxWidth) {
          windowEnd++;
          expanded = true;
        }
      }

      if (!expanded) break;
    }

    const leftIndicator = windowStart > 0 ? `${THEME.accent}‹ ${RESET}` : ' ';
    const rightIndicator = windowEnd < DISCOVER_CATEGORIES.length - 1 ? `${THEME.accent} ›${RESET}` : ' ';
    const visibleTabs = renderedTabs.slice(windowStart, windowEnd + 1);
    const line = leftIndicator + visibleTabs.join(' ') + rightIndicator;
    lines.push(padEndAnsi(line, maxWidth));
  }

  lines.push(`${THEME.border}${BOX.horizontal.repeat(maxWidth)}${RESET}`);
  availableRows -= 2;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (state.isDiscoverLoading) {
    const padTop = Math.max(0, Math.floor(availableRows / 2) - 1);
    for (let i = 0; i < padTop; i++) lines.push('');
    const loadingText = `${THEME.warning}◌ Loading ${activeCategory.name} from Jamendo...${RESET}`;
    const leftPad = Math.max(0, Math.floor((maxWidth - stripAnsi(loadingText)) / 2));
    lines.push(' '.repeat(leftPad) + loadingText);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  // ── Empty / error state ────────────────────────────────────────────────────
  if (state.discoverTracks.length === 0) {
    const padTop = Math.max(0, Math.floor(availableRows / 2) - 1);
    for (let i = 0; i < padTop; i++) lines.push('');
    const emptyMsg = `${THEME.muted}No tracks loaded for ${activeCategory.name}.${RESET}`;
    const hintMsg  = `${THEME.dim}Press [C] or [Tab] to switch category, or [/] to search.${RESET}`;
    const leftPad1 = Math.max(0, Math.floor((maxWidth - stripAnsi(emptyMsg)) / 2));
    const leftPad2 = Math.max(0, Math.floor((maxWidth - stripAnsi(hintMsg)) / 2));
    lines.push(' '.repeat(leftPad1) + emptyMsg);
    lines.push(' '.repeat(leftPad2) + hintMsg);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  // ── Track List Pagination ──────────────────────────────────────────────────
  const pageSize = Math.max(1, availableRows);
  const maxStart = Math.max(0, state.discoverTracks.length - pageSize);
  const idealStart = Math.max(0, state.discoverSelectedIndex - Math.floor(pageSize / 2));
  const startIdx = Math.min(idealStart, maxStart);
  const visibleTracks = state.discoverTracks.slice(startIdx, startIdx + pageSize);

  for (let i = 0; i < visibleTracks.length; i++) {
    const track = visibleTracks[i];
    const actualIdx = startIdx + i;
    const isSelected = actualIdx === state.discoverSelectedIndex;
    const numStr = String(actualIdx + 1).padStart(2, '0');
    const timeStr = ` ${formatTime(track.duration)}`;

    if (isSelected) {
      const prefix = ` ▶ ${numStr}. `;
      const availText = Math.max(10, maxWidth - stripAnsi(prefix) - stripAnsi(timeStr));
      const trackText = `${track.title} – ${track.artist}`.slice(0, availText).padEnd(availText, ' ');
      const row = `${THEME.selectedBg}${THEME.selectedFg}${BOLD}${prefix}${trackText}${timeStr}${RESET}`;
      lines.push(padEndAnsi(row, maxWidth));
    } else {
      const prefix = `   ${THEME.dim}${numStr}.${RESET} `;
      const availText = Math.max(10, maxWidth - 7 - stripAnsi(timeStr));
      const trackTitle = `${THEME.primary}${track.title}${RESET}`;
      const artistPart = `${THEME.muted} – ${track.artist}${RESET}`;
      const rawText = `${track.title} – ${track.artist}`;
      const slicedText = rawText.length > availText ? rawText.slice(0, availText - 1) + '…' : rawText;

      const titlePartClean = slicedText.split(' – ')[0] || '';
      const artistPartClean = slicedText.includes(' – ') ? slicedText.slice(titlePartClean.length + 3) : '';

      let formattedText = `${THEME.primary}${titlePartClean}${RESET}`;
      if (artistPartClean) {
        formattedText += `${THEME.muted} – ${artistPartClean}${RESET}`;
      }

      const visibleLen = 7 + stripAnsi(formattedText) + stripAnsi(timeStr);
      const pad = Math.max(0, maxWidth - visibleLen);
      const row = `${prefix}${formattedText}${' '.repeat(pad)}${THEME.muted}${timeStr}${RESET}`;
      lines.push(row);
    }
  }

  while (lines.length < maxRows) lines.push('');
  return lines.slice(0, maxRows);
}
