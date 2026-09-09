import { BOLD, RESET, THEME, stripAnsi } from './colors.js';

export const JMUSIC_LOGO_LINES = [
  '  _ __  __           _      ',
  ' | |  \\/  |_   _ ___(_) ___ ',
  ' | | |\\/| | | | / __| |/ __|',
  ' |_|_|  |_|\\__,_|___/_|\\___|',
];

export function renderLogo(maxWidth: number): string[] {
  const logoWidth = stripAnsi(JMUSIC_LOGO_LINES[0]);
  if (maxWidth < logoWidth + 4) {
    // Compact single-line fallback
    const compact = `♪ ${THEME.accent}${BOLD}JMUSIC${RESET} ${THEME.muted}Terminal Audio Player${RESET} ♪`;
    return [compact];
  }

  return JMUSIC_LOGO_LINES.map(
    (line) => `${THEME.accent}${BOLD}${line}${RESET}`
  );
}
