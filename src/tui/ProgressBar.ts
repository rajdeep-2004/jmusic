import { formatTime } from '../utils/formatTime.js';
import {
  RESET, BOLD,
  C_PROG_FILLED, C_PROG_EMPTY, C_PROG_TIME,
} from './colors.js';

export function renderProgressBar(
  currentPosition: number,
  duration: number,
  barWidth: number = 20
): string {
  const safeDuration = duration > 0 ? duration : 0;
  const safePosition = Math.max(0, Math.min(currentPosition, safeDuration || currentPosition));

  const currentStr = formatTime(safePosition);
  const durationStr = formatTime(safeDuration);

  const ratio = safeDuration > 0 ? Math.min(1, Math.max(0, safePosition / safeDuration)) : 0;
  const actualBarWidth = Math.max(5, barWidth);
  const filledCount = Math.min(actualBarWidth, Math.max(0, Math.round(ratio * actualBarWidth)));
  const emptyCount = Math.max(0, actualBarWidth - filledCount);

  const filledBar = `${C_PROG_FILLED}${'━'.repeat(filledCount)}${RESET}`;
  const emptyBar  = `${C_PROG_EMPTY}${'░'.repeat(emptyCount)}${RESET}`;
  const timeLeft  = `${C_PROG_TIME}${currentStr}${RESET}`;
  const timeRight = `${C_PROG_TIME}${durationStr}${RESET}`;

  return `${timeLeft} ${filledBar}${emptyBar} ${timeRight}`;
}

/**
 * Plain (no ANSI) version used by unit tests so assertions can match
 * exact character sequences without escape codes.
 */
export function renderProgressBarPlain(
  currentPosition: number,
  duration: number,
  barWidth: number = 20
): string {
  const safeDuration = duration > 0 ? duration : 0;
  const safePosition = Math.max(0, Math.min(currentPosition, safeDuration || currentPosition));

  const currentStr  = formatTime(safePosition);
  const durationStr = formatTime(safeDuration);

  const ratio      = safeDuration > 0 ? Math.min(1, Math.max(0, safePosition / safeDuration)) : 0;
  const actualBarWidth = Math.max(5, barWidth);
  const filledCount    = Math.min(actualBarWidth, Math.max(0, Math.round(ratio * actualBarWidth)));
  const emptyCount     = Math.max(0, actualBarWidth - filledCount);

  return `${currentStr} ${'━'.repeat(filledCount)}${'░'.repeat(emptyCount)} ${durationStr}`;
}
