import { BOLD, RESET, THEME, stripAnsi } from './colors.js';

export const JMUSIC_LOGO_LINES = [
  '   __  __  __           _      ',
  '  / / /  |/  /_  _______(_)____',
  ' / / / /|_/ / / / / ___/ / ___/',
  '/ /_/ /  / / /_/ (__  ) / /__  ',
  '\\____/_/  /_/\\__,_/____/_/\\___/ ',
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
