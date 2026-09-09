import {
  RESET, BOLD, DIM,
  THEME,
  padEndAnsi, stripAnsi,
} from './colors.js';

export function renderDancingCat(
  status: string,
  animTick: number,
  maxWidth: number
): string[] {
  const catColor = THEME.cat;
  const noteColor = THEME.note;
  const hpColor = THEME.accent;
  const faceColor = THEME.primary;

  let rawLines: string[] = [];

  if (status === 'playing') {
    const frame = animTick % 4;
    if (frame === 0) {
      rawLines = [
        `       ${catColor}/\\_/\\${RESET}   ${noteColor}♪${RESET}`,
        `    ${hpColor}🎧${catColor}( ${faceColor}^.^${catColor} )ﾉ${RESET} ${noteColor}♫${RESET}`,
        `      ${catColor}(  "  )${RESET}`,
        `       ${catColor}/   \\${RESET}`,
      ];
    } else if (frame === 1) {
      rawLines = [
        `   ${noteColor}♫${RESET}   ${catColor}/\\_/\\${RESET}`,
        `    ${catColor}ヽ( ${faceColor}^.^${catColor} )${hpColor}🎧${RESET} ${noteColor}♪${RESET}`,
        `      ${catColor}(  "  )${RESET}`,
        `       ${catColor}/   \\${RESET}`,
      ];
    } else if (frame === 2) {
      rawLines = [
        `       ${catColor}/\\_/\\${RESET}   ${noteColor}♬${RESET}`,
        `    ${hpColor}🎧${catColor}( ${faceColor}>.<${catColor} )>${RESET} ${noteColor}♫${RESET}`,
        `      ${catColor}(  "  )${RESET}`,
        `       ${catColor}/   \\${RESET}`,
      ];
    } else {
      rawLines = [
        `   ${noteColor}♪${RESET}   ${catColor}/\\_/\\${RESET}`,
        `     ${catColor}<( ${faceColor}>.<${catColor} )${hpColor}🎧${RESET} ${noteColor}♫${RESET}`,
        `      ${catColor}(  "  )${RESET}`,
        `       ${catColor}/   \\${RESET}`,
      ];
    }
  } else if (status === 'paused') {
    rawLines = [
      `       ${catColor}/\\_/\\${RESET}`,
      `    ${hpColor}🎧${catColor}( ${faceColor}'o'${catColor} )${RESET}  ${THEME.warning}⏸${RESET}`,
      `      ${catColor}(  "  )${RESET}`,
      `       ${catColor}/   \\${RESET}`,
    ];
  } else if (status === 'buffering') {
    rawLines = [
      `       ${catColor}/\\_/\\${RESET}   ${THEME.warning}◌${RESET}`,
      `    ${hpColor}🎧${catColor}( ${faceColor}o.o${catColor} )${RESET}`,
      `      ${catColor}(  "  )${RESET}`,
      `       ${catColor}/   \\${RESET}`,
    ];
  } else {
    // Stopped / idle: sleeping cat
    rawLines = [
      `       ${catColor}/\\_/\\${RESET}`,
      `      ${catColor}( ${THEME.dim}-.-${catColor} )${RESET} ${THEME.dim}zZ${RESET}`,
      `      ${catColor}(  "  )${RESET}`,
      `       ${catColor}/   \\${RESET}`,
    ];
  }

  // Center each line horizontally within maxWidth
  return rawLines.map((line) => {
    const visible = stripAnsi(line);
    const leftPad = Math.max(0, Math.floor((maxWidth - visible) / 2));
    return ' '.repeat(leftPad) + line;
  });
}
