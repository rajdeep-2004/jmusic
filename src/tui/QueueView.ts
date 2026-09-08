import { AppState } from '../app/state.js';

export function renderQueueView(state: AppState, maxWidth: number): string[] {
  const lines: string[] = [];

  const countTag = state.queue.length > 0 ? ` (${state.queue.length}) ` : ' ';
  const title = ` Queue${countTag}`;
  lines.push(`──${title}${'─'.repeat(Math.max(0, maxWidth - title.length - 2))}`);

  if (state.queue.length === 0) {
    lines.push('  Queue is empty. Press "A" to add selected track to queue.');
    return lines;
  }

  const items = state.queue.map((track, idx) => {
    const isCurrent = idx === state.queueIndex;
    const prefix = isCurrent ? '▶ ' : '';
    return `${prefix}${idx + 1}. ${track.title}`;
  });

  const fullText = `  ${items.join('   ')}`;
  lines.push(fullText.slice(0, maxWidth));
  return lines;
}
