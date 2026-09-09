import { AppState } from '../app/state.js';
import {
  RESET, BOLD, DIM,
  THEME, BOX,
  padEndAnsi, stripAnsi,
} from './colors.js';
import { formatTime } from '../utils/formatTime.js';

/** Render queue as a full vertical list panel */
export function renderQueueVertical(state: AppState, maxRows: number, maxWidth: number): string[] {
  const lines: string[] = [];

  const countTag = state.queue.length > 0 ? ` (${state.queue.length}) ` : ' ';
  const sectionLabel = ` 🎶 Playback Queue${countTag}`;
  const labelLen = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelLen - 2);
  lines.push(
    `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}${THEME.title}${sectionLabel}${RESET}${THEME.border}${BOX.horizontal.repeat(divLen)}${RESET}`
  );

  let availableRows = maxRows - 2; // leave 1 row for footer

  if (state.queue.length === 0) {
    const padTop = Math.max(0, Math.floor(availableRows / 2) - 1);
    for (let i = 0; i < padTop; i++) lines.push('');
    const emptyMsg = `${THEME.muted}Your queue is empty.${RESET}`;
    const hintMsg  = `${THEME.dim}Select a song in Discover or Search and press [A] to add it.${RESET}`;
    const leftPad1 = Math.max(0, Math.floor((maxWidth - stripAnsi(emptyMsg)) / 2));
    const leftPad2 = Math.max(0, Math.floor((maxWidth - stripAnsi(hintMsg)) / 2));
    lines.push(' '.repeat(leftPad1) + emptyMsg);
    lines.push(' '.repeat(leftPad2) + hintMsg);
    while (lines.length < maxRows) lines.push('');
    return lines.slice(0, maxRows);
  }

  const pageSize = Math.max(1, availableRows);
  const maxStart = Math.max(0, state.queue.length - pageSize);
  const idealStart = Math.max(0, state.queueSelectedIndex - Math.floor(pageSize / 2));
  const startIdx = Math.min(idealStart, maxStart);
  const visibleTracks = state.queue.slice(startIdx, startIdx + pageSize);

  for (let i = 0; i < visibleTracks.length; i++) {
    const track = visibleTracks[i];
    const actualIdx = startIdx + i;
    const isCurrentPlaying = actualIdx === state.queueIndex;
    const isSelected = actualIdx === state.queueSelectedIndex;
    const numStr = String(actualIdx + 1).padStart(2, '0');
    const timeStr = ` ${formatTime(track.duration)}`;

    const marker = isCurrentPlaying ? `${THEME.success}▶${RESET}` : ' ';

    if (isSelected) {
      const prefix = ` ${marker} ${numStr}. `;
      const availText = Math.max(10, maxWidth - stripAnsi(prefix) - stripAnsi(timeStr));
      const trackText = `${track.title} – ${track.artist}`.slice(0, availText).padEnd(availText, ' ');
      const row = `${THEME.selectedBg}${THEME.selectedFg}${BOLD}${prefix}${trackText}${timeStr}${RESET}`;
      lines.push(padEndAnsi(row, maxWidth));
    } else {
      const prefix = ` ${marker} ${THEME.dim}${numStr}.${RESET} `;
      const availText = Math.max(10, maxWidth - 8 - stripAnsi(timeStr));
      const rawText = `${track.title} – ${track.artist}`;
      const slicedText = rawText.length > availText ? rawText.slice(0, availText - 1) + '…' : rawText;

      const titlePartClean = slicedText.split(' – ')[0] || '';
      const artistPartClean = slicedText.includes(' – ') ? slicedText.slice(titlePartClean.length + 3) : '';

      let formattedText = isCurrentPlaying ? `${THEME.accent}${BOLD}${titlePartClean}${RESET}` : `${THEME.primary}${titlePartClean}${RESET}`;
      if (artistPartClean) {
        formattedText += `${THEME.muted} – ${artistPartClean}${RESET}`;
      }

      const visibleLen = 8 + stripAnsi(formattedText) + stripAnsi(timeStr);
      const pad = Math.max(0, maxWidth - visibleLen);
      const row = `${prefix}${formattedText}${' '.repeat(pad)}${THEME.muted}${timeStr}${RESET}`;
      lines.push(row);
    }
  }

  while (lines.length < maxRows - 1) lines.push('');

  // Queue summary footer
  const summary = `${THEME.dim}Total: ${state.queue.length} track${state.queue.length === 1 ? '' : 's'}  │  [Enter] Play  │  [D] Remove${RESET}`;
  lines.push(`  ${summary}`);

  return lines.slice(0, maxRows);
}

/** Render queue as a horizontal bottom strip (for split views) */
export function renderQueueView(state: AppState, maxWidth: number): string[] {
  const lines: string[] = [];

  const countTag = state.queue.length > 0 ? ` (${state.queue.length}) ` : ' ';
  const sectionLabel = ` 🎶 Queue${countTag}`;
  const labelLen = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelLen - 2);
  lines.push(
    `${THEME.border}${BOX.horizontal}${BOX.horizontal}${RESET}${THEME.title}${sectionLabel}${RESET}${THEME.border}${BOX.horizontal.repeat(divLen)}${RESET}`
  );

  if (state.queue.length === 0) {
    lines.push(`  ${THEME.muted}Queue is empty.${RESET}  ${THEME.dim}Press [A] on any song to add it.${RESET}`);
    return lines;
  }

  const items = state.queue.map((track, idx) => {
    const isCurrent = idx === state.queueIndex;
    if (isCurrent) {
      return `${THEME.accent}${BOLD}▶ ${idx + 1}. ${track.title}${RESET}`;
    }
    return `${THEME.muted}${idx + 1}. ${track.title}${RESET}`;
  });

  let line = '  ';
  let visibleLen = 2;
  for (let i = 0; i < items.length; i++) {
    const sep = i > 0 ? `  ${THEME.dim}·${RESET}  ` : '';
    const sepV = i > 0 ? 5 : 0;
    const itemV = stripAnsi(items[i]);
    if (visibleLen + sepV + itemV > maxWidth - 14 && i > 0) {
      const remaining = state.queue.length - i;
      line += `${sep}${THEME.dim}+${remaining} more${RESET}`;
      break;
    }
    line += sep + items[i];
    visibleLen += sepV + itemV;
  }
  lines.push(line);

  return lines;
}
