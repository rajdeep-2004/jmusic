import { formatTime } from '../utils/formatTime.js';

export function renderProgressBar(
  currentPosition: number,
  duration: number,
  barWidth: number = 20
): string {
  const currentStr = formatTime(currentPosition);
  const durationStr = formatTime(duration);

  const safeDuration = duration > 0 ? duration : 0;
  const safePosition = Math.max(0, Math.min(currentPosition, safeDuration || currentPosition));

  const ratio = safeDuration > 0 ? Math.min(1, Math.max(0, safePosition / safeDuration)) : 0;
  const actualBarWidth = Math.max(5, barWidth);
  const filledCount = Math.min(actualBarWidth, Math.max(0, Math.round(ratio * actualBarWidth)));
  const emptyCount = Math.max(0, actualBarWidth - filledCount);

  const filledBar = '━'.repeat(filledCount);
  const emptyBar = '░'.repeat(emptyCount);

  return `${currentStr} ${filledBar}${emptyBar} ${durationStr}`;
}
