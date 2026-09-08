import { AppState } from '../app/state.js';
import { renderProgressBar } from './ProgressBar.js';

export function renderNowPlaying(state: AppState, maxRows: number, maxWidth: number): string[] {
  const lines: string[] = [];

  const title = ' Now Playing ';
  lines.push(`──${title}${'─'.repeat(Math.max(0, maxWidth - title.length - 2))}`);

  const statusTag = state.playbackStatus.toUpperCase();

  if (!state.currentTrack || state.playbackStatus === 'stopped') {
    lines.push('  No track currently playing.');
    lines.push(`  Status: [${statusTag}]`);
    while (lines.length < maxRows) {
      lines.push('');
    }
    return lines.slice(0, maxRows);
  }

  if (state.playbackStatus === 'buffering') {
    lines.push(`  Title : ${state.currentTrack.title}`.slice(0, maxWidth));
    lines.push(`  Artist: ${state.currentTrack.artist}`.slice(0, maxWidth));
    lines.push(`  Status: [${statusTag}] Loading stream...`);
    while (lines.length < maxRows) {
      lines.push('');
    }
    return lines.slice(0, maxRows);
  }

  if (state.playbackStatus === 'error') {
    lines.push(`  Title : ${state.currentTrack.title}`.slice(0, maxWidth));
    lines.push(`  Artist: ${state.currentTrack.artist}`.slice(0, maxWidth));
    lines.push(`  Status: [${statusTag}] Playback error occurred.`);
    while (lines.length < maxRows) {
      lines.push('');
    }
    return lines.slice(0, maxRows);
  }

  // Playing or Paused
  lines.push(`  Title : ${state.currentTrack.title}`.slice(0, maxWidth));
  lines.push(`  Artist: ${state.currentTrack.artist}`.slice(0, maxWidth));
  if (state.currentTrack.album) {
    lines.push(`  Album : ${state.currentTrack.album}`.slice(0, maxWidth));
  }
  lines.push(`  Status: [${statusTag}]   Vol: ${state.volume}%`);
  lines.push('');

  const barWidth = Math.max(10, maxWidth - 22);
  const totalDuration = state.duration > 0 ? state.duration : (state.currentTrack.duration || 0);
  lines.push(`  ${renderProgressBar(state.currentPosition, totalDuration, barWidth)}`.slice(0, maxWidth));

  while (lines.length < maxRows) {
    lines.push('');
  }

  return lines.slice(0, maxRows);
}
