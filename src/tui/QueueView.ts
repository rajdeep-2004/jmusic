import { AppState } from '../app/state.js';
import {
  RESET, BOLD, DIM,
  C_BORDER, C_SECTION_FG,
  C_QUEUE_ACTIVE, C_QUEUE_ITEM, C_QUEUE_EMPTY,
  stripAnsi,
} from './colors.js';

export function renderQueueView(state: AppState, maxWidth: number): string[] {
  const lines: string[] = [];

  const countTag = state.queue.length > 0 ? ` (${state.queue.length}) ` : ' ';
  const sectionLabel = ` 🎶 Queue${countTag}`;
  const labelLen = stripAnsi(sectionLabel);
  const divLen = Math.max(0, maxWidth - labelLen - 2);
  lines.push(
    `${C_BORDER}──${RESET}${C_SECTION_FG}${sectionLabel}${RESET}${C_BORDER}${'─'.repeat(divLen)}${RESET}`
  );

  if (state.queue.length === 0) {
    lines.push(`  ${C_QUEUE_EMPTY}${DIM}Queue is empty.${RESET}  ${C_SECTION_FG}Press "A" to enqueue selected track.${RESET}`);
    return lines;
  }

  const items = state.queue.map((track, idx) => {
    const isCurrent = idx === state.queueIndex;
    if (isCurrent) {
      return `${C_QUEUE_ACTIVE}${BOLD}▶ ${idx + 1}. ${track.title}${RESET}`;
    }
    return `${C_QUEUE_ITEM}${idx + 1}. ${track.title}${RESET}`;
  });

  // Render items inline, truncate if too wide
  let line = '  ';
  let visibleLen = 2;
  for (let i = 0; i < items.length; i++) {
    const sep  = i > 0 ? `${DIM}  ·  ${RESET}` : '';
    const sepV = i > 0 ? 5 : 0;
    const itemV = stripAnsi(items[i]);
    if (visibleLen + sepV + itemV > maxWidth - 2 && i > 0) {
      // Truncate remaining with count
      const remaining = state.queue.length - i;
      line += `${DIM}  +${remaining} more${RESET}`;
      break;
    }
    line += sep + items[i];
    visibleLen += sepV + itemV;
  }
  lines.push(line);

  return lines;
}
