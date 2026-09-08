import { AppState } from '../app/state.js';
import { renderProgressBar } from './ProgressBar.js';

export function renderNowPlaying(state: AppState, maxRows: number, maxWidth: number): string[] {
  const lines: string[] = [];

  const title = ' Now Playing ';
  lines.push(`──${title}${'─'.repeat(Math.max(0, maxWidth - title.length - 2))}`);

  if (!state.currentTrack) {
    lines.push('  No track currently playing.');
    lines.push(`  Status: [${state.playbackStatus}]`);
    while (lines.length < maxRows) {
      lines.push('');
    }
    return lines.slice(0, maxRows);
  }

  lines.push(`  Title : ${state.currentTrack.title}`.slice(0, maxWidth));
  lines.push(`  Artist: ${state.currentTrack.artist}`.slice(0, maxWidth));
  if (state.currentTrack.album) {
    lines.push(`  Album : ${state.currentTrack.album}`.slice(0, maxWidth));
  }
  lines.push(`  Status: [${state.playbackStatus.toUpperCase()}]   Vol: ${state.volume}%`);
  lines.push('');
  const barWidth = Math.max(10, maxWidth - 20);
  lines.push(`  ${renderProgressBar(state.currentPosition, state.duration, barWidth)}`.slice(0, maxWidth));

  while (lines.length < maxRows) {
    lines.push('');
  }

  return lines.slice(0, maxRows);
}
