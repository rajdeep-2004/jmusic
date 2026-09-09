import { AppState, createInitialState } from './state.js';
import { AppView } from '../tui/AppView.js';
import { JamendoClient, jamendoClient } from '../api/jamendo.js';
import { Player, player as defaultPlayer } from '../player/Player.js';
import { QueueManager } from '../queue/QueueManager.js';
import { config as appConfig, AppConfig } from '../config/config.js';
import {
  addActiveSelectionToQueueAction,
  changeVolumeAction,
  cycleCategoryAction,
  cycleViewAction,
  enterSearchMode,
  exitSearchMode,
  loadDiscoverTracks,
  moveActiveSelectionDown,
  moveActiveSelectionUp,
  moveSelectionDown,
  moveSelectionUp,
  performSearch,
  playActiveSelectionAction,
  playNextTrackAction,
  playPreviousTrackAction,
  playTrackAction,
  removeSelectedFromQueueAction,
  seekBackwardAction,
  seekForwardAction,
  stopPlaybackAction,
  switchViewAction,
  toggleMuteAction,
  togglePlayPauseAction,
} from './actions.js';

export class App {
  private state: AppState;
  private view: AppView;
  private client: JamendoClient;
  private player: Player;
  private queueManager: QueueManager;
  private config: AppConfig;
  private isRunning: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(
    client: JamendoClient = jamendoClient,
    playerInstance: Player = defaultPlayer,
    queueManagerInstance: QueueManager = new QueueManager(),
    configuration: AppConfig = appConfig
  ) {
    this.state = createInitialState();
    this.view = new AppView();
    this.client = client;
    this.player = playerInstance;
    this.queueManager = queueManagerInstance;
    this.config = configuration;
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

    // Automatic next track progression per buildPlan §12
    adapter.on('ended', async () => {
      this.stopPlayerSync();
      if (!this.queueManager.isEmpty()) {
        await playNextTrackAction(this.state, this.player, this.queueManager, this.render);
      } else {
        this.state.playbackStatus = 'stopped';
        this.state.currentPosition = 0;
        this.state.statusMessage = 'Playback finished.';
        this.render();
      }
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

    // Dynamically fetch initial Discover tracks from Jamendo on launch
    loadDiscoverTracks(this.state, this.client, 'featured', this.render).catch(() => {});
  }

  private startPlayerSync(): void {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(async () => {
      await this.syncPlayerState();
    }, 500);
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
      if (this.state.playbackStatus === 'playing') {
        this.state.animTick = (this.state.animTick + 1) % 10000;
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
        switchViewAction(this.state, 'search', this.render);
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

    // ── Normal Mode Controls ──────────────────────────────────────────────────
    if (key === 'q' || key === 'Q') {
      this.stop();
      return;
    }

    // View switching tabs (1: Discover, 2: Search, 3: Queue, 4: Now Playing)
    if (key === '1') {
      switchViewAction(this.state, 'home', this.render);
      return;
    }

    if (key === '2') {
      switchViewAction(this.state, 'search', this.render);
      return;
    }

    if (key === '3') {
      switchViewAction(this.state, 'queue', this.render);
      return;
    }

    if (key === '4') {
      switchViewAction(this.state, 'nowPlaying', this.render);
      return;
    }

    // Tab key: Consistently cycles through views (1: Discover -> 2: Search -> 3: Queue -> 4: Now Playing)
    if (key === 'Tab') {
      cycleViewAction(this.state, this.render);
      return;
    }

    // Category navigation shortcuts inside Discover (C, ], Shift+Tab forward; [ backward)
    if (key === 'c' || key === 'C' || key === ']' || key === 'Shift+Tab') {
      await cycleCategoryAction(this.state, this.client, 1, this.render);
      return;
    }

    if (key === '[') {
      await cycleCategoryAction(this.state, this.client, -1, this.render);
      return;
    }

    // Search prompt trigger
    if (key === '/') {
      switchViewAction(this.state, 'search', this.render);
      enterSearchMode(this.state, this.render);
      return;
    }

    // List navigation (works across Discover, Search, and Queue)
    if (key === 'up' || key === 'k') {
      moveActiveSelectionUp(this.state, this.render);
      return;
    }

    if (key === 'down' || key === 'j') {
      moveActiveSelectionDown(this.state, this.render);
      return;
    }

    // Seeking (5s back / forward)
    if (key === 'left') {
      await seekBackwardAction(this.state, this.player, this.config.seekSeconds, this.render);
      return;
    }

    if (key === 'right') {
      await seekForwardAction(this.state, this.player, this.config.seekSeconds, this.render);
      return;
    }

    // Play active track
    if (key === 'Enter') {
      await playActiveSelectionAction(this.state, this.player, this.render, this.queueManager);
      return;
    }

    // Enqueue active track
    if (key === 'a' || key === 'A') {
      addActiveSelectionToQueueAction(this.state, this.queueManager, this.render);
      return;
    }

    // Remove from queue when in Queue view
    if (key === 'd' || key === 'D' || key === 'x' || key === 'X') {
      if (this.state.currentView === 'queue') {
        removeSelectedFromQueueAction(this.state, this.queueManager, this.render);
        return;
      }
    }

    // Track progression controls
    if (key === 'n' || key === 'N') {
      await playNextTrackAction(this.state, this.player, this.queueManager, this.render);
      return;
    }

    if (key === 'p' || key === 'P') {
      await playPreviousTrackAction(this.state, this.player, this.queueManager, this.render);
      return;
    }

    if (key === 'Space') {
      await togglePlayPauseAction(this.state, this.player, this.render, this.queueManager);
      return;
    }

    // Volume controls
    if (key === '+' || key === '=') {
      await changeVolumeAction(this.state, this.player, this.config.volumeStep, this.render);
      return;
    }

    if (key === '-' || key === '_') {
      await changeVolumeAction(this.state, this.player, -this.config.volumeStep, this.render);
      return;
    }

    if (key === 'm' || key === 'M') {
      await toggleMuteAction(this.state, this.player, this.render);
      return;
    }

    if (key === 's' || key === 'S') {
      await stopPlaybackAction(this.state, this.player, this.render);
      return;
    }

    this.state.statusMessage = `Key: ${key}. Space: Play/Pause, 1-4: Tabs, Tab/C: Category, Enter: Play, Q: Quit.`;
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

  public getQueueManager(): QueueManager {
    return this.queueManager;
  }
}
