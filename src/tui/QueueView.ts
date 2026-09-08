import { AppState } from '../app/state.js';

export function renderQueueView(state: AppState, maxWidth: number): string[] {
  const lines: string[] = [];

  const title = ' Queue ';
  lines.push(`──${title}${'─'.repeat(Math.max(0, maxWidth - title.length - 2))}`);

  if (state.queue.length === 0) {
    lines.push('  Queue is empty.');
    return lines;
  }

  const items = state.queue.map((track, idx) => {
    const isCurrent = idx === state.queueIndex;
    const marker = isCurrent ? '▶ ' : '';
    return `${marker}${idx + 1}. ${track.title}`;
  });

  lines.push(`  ${items.join('   ')}`.slice(0, maxWidth));
  return lines;
}
