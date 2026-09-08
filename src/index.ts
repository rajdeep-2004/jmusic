import { config, validateConfig } from './config/config.js';
import { App } from './app/App.js';

export function main(): void {
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.warn(`[Config Warning] ${validation.error}`);
  }

  const app = new App();
  app.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
