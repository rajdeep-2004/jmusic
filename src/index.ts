import { config, validateConfig } from './config/config.js';

export function main(): void {
  console.log('JMusic — Terminal Music Player');
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.warn(`[Config Warning] ${validation.error}`);
  } else {
    console.log('[Config OK] Jamendo credentials configured.');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
