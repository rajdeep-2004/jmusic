import { AppState, createInitialState } from './state.js';
import { AppView } from '../tui/AppView.js';
import { JamendoClient, jamendoClient } from '../api/jamendo.js';
import { Player, player as defaultPlayer } from '../player/Player.js';
import {
  enterSearchMode,
  exitSearchMode,
  moveSelectionDown,
  moveSelectionUp,
  performSearch,
  playTrackAction,
  stopPlaybackAction,
  togglePlayPauseAction,
} from './actions.js';

export class App {
  private state: AppState;
  private view: AppView;
  private client: JamendoClient;
  private player: Player;
  private isRunning: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(
    client: JamendoClient = jamendoClient,
    playerInstance: Player = defaultPlayer
  ) {
    this.state = createInitialState();
    this.view = new AppView();
    this.client = client;
    this.player = playerInstance;
  }

  public start(): void {
    this.isRunning = true;

    process.on('SIGINT', this.handleExit);
    process.on('SIGTERM', this.handleExit);

    // Wire player event listeners
    const adapter = this.player.getAdapter();
    adapter.on('statusChange', (status) => {
      this.state.playbackStatus = status;
      if (status === 'playing') {
        this.startPlayerSync();
      } else if (status === 'stopped') {
        this.stopPlayerSync();
        this.state.currentPosition = 0;
      }
      this.render();
    });

    adapter.on('ended', () => {
      this.stopPlayerSync();
      this.state.playbackStatus = 'stopped';
      this.state.currentPosition = 0;
      this.state.statusMessage = 'Track finished playing.';
      this.render();
    });

    adapter.on('error', (err) => {
      this.stopPlayerSync();
      this.state.playbackStatus = 'error';
      this.state.statusMessage = `Player error: ${err.message}`;
      this.render();
    });

    this.view.init(this.handleKey);
    process.stdout.on('resize', () => {
      if (this.isRunning) {
        this.view.render(this.state);
      }
    });

    this.render();
  }

  private startPlayerSync(): void {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(async () => {
      await this.syncPlayerState();
    }, 1000);
  }

  private stopPlayerSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private async syncPlayerState(): Promise<void> {
    if (!this.isRunning) return;
    if (this.state.playbackStatus !== 'playing' && this.state.playbackStatus !== 'paused') {
      return;
    }

    try {
      const pos = await this.player.getPosition();
      if (typeof pos === 'number' && pos >= 0) {
        this.state.currentPosition = pos;
      }
      const dur = await this.player.getDuration();
      if (typeof dur === 'number' && dur > 0) {
        this.state.duration = dur;
      }
      const vol = await this.player.getVolume();
      if (typeof vol === 'number' && vol >= 0) {
        this.state.volume = vol;
      }
      this.render();
    } catch {
      // Ignore transient query errors during transitions
    }
  }

  private render = (): void => {
    if (this.isRunning) {
      this.view.render(this.state);
    }
  };

  private handleKey = async (key: string): Promise<void> => {
    if (!this.isRunning) return;

    if (key === 'Ctrl+C') {
      this.stop();
      return;
    }

    if (this.state.inputMode === 'search') {
      if (key === 'Escape') {
        exitSearchMode(this.state, this.render);
        return;
      }

      if (key === 'Enter') {
        const query = this.state.searchBuffer;
        this.state.inputMode = 'normal';
        this.state.searchBuffer = '';
        await performSearch(this.state, this.client, query, this.render);
        return;
      }

      if (key === 'Backspace') {
        this.state.searchBuffer = this.state.searchBuffer.slice(0, -1);
        this.render();
        return;
      }

      if (key === 'Space') {
        this.state.searchBuffer += ' ';
        this.render();
        return;
      }

      if (key.length === 1 && key >= ' ') {
        this.state.searchBuffer += key;
        this.render();
        return;
      }
      return;
    }

    // Normal mode controls
    if (key === 'q' || key === 'Q') {
      this.stop();
      return;
    }

    if (key === '/') {
      enterSearchMode(this.state, this.render);
      return;
    }

    if (key === 'up') {
      moveSelectionUp(this.state, this.render);
      return;
    }

    if (key === 'down') {
      moveSelectionDown(this.state, this.render);
      return;
    }

    if (key === 'Enter') {
      if (this.state.selectedTrack) {
        await playTrackAction(this.state, this.player, this.state.selectedTrack, this.render);
      }
      return;
    }

    if (key === 'Space') {
      await togglePlayPauseAction(this.state, this.player, this.render);
      return;
    }

    if (key === 's' || key === 'S') {
      await stopPlaybackAction(this.state, this.player, this.render);
      return;
    }

    this.state.statusMessage = `Key: ${key}. Space: Play/Pause, Enter: Play selected, '/': Search, 'Q': Quit.`;
    this.render();
  };

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.stopPlayerSync();
    process.removeListener('SIGINT', this.handleExit);
    process.removeListener('SIGTERM', this.handleExit);
    this.player.destroy().catch(() => {});
    this.view.destroy();
    process.exit(0);
  }

  private handleExit = (): void => {
    this.stop();
  };

  public getState(): AppState {
    return this.state;
  }
}
