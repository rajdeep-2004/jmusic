import { config, validateConfig } from './config/config.js';
import { App } from './app/App.js';
import { player } from './player/Player.js';

export async function main(): Promise<void> {
  // 1. Validate Jamendo credentials (buildPlan §2.6, §5.1)
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error(`\n[Startup Error] ${validation.error}`);
    console.error('Please configure your Jamendo API Client ID in a .env file.');
    console.error('Example:');
    console.error('  JAMENDO_CLIENT_ID=your_client_id_here\n');
    process.exit(1);
  }

  // 2. Validate VLC availability (buildPlan §2.2, §5.1)
  const vlcAvailable = await player.isAvailable();
  if (!vlcAvailable) {
    console.error('\n[Startup Error] VLC media player was not found on your system.');
    console.error('JMusic requires VLC for audio playback. Please install VLC:');
    console.error('  • macOS: brew install --cask vlc (or download from https://www.videolan.org/vlc/)');
    console.error('  • Linux: sudo apt-get install vlc (or your distribution package manager)');
    console.error('  • Windows: Download from https://www.videolan.org/vlc/\n');
    process.exit(1);
  }

  // 3. Initialize App and start TUI
  const app = new App();
  app.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('[Fatal Error]', err?.message || err);
    process.exit(1);
  });
}
