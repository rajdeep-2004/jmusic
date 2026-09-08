import { formatTime } from '../utils/formatTime.js';

export function renderProgressBar(currentPosition: number, duration: number, barWidth: number = 20): string {
  const currentStr = formatTime(currentPosition);
  const durationStr = formatTime(duration);

  const ratio = duration > 0 ? Math.min(1, Math.max(0, currentPosition / duration)) : 0;
  const filledCount = Math.round(ratio * barWidth);
  const emptyCount = Math.max(0, barWidth - filledCount);

  const filledBar = '━'.repeat(filledCount);
  const emptyBar = '░'.repeat(emptyCount);

  return `${currentStr} ${filledBar}${emptyBar} ${durationStr}`;
}
