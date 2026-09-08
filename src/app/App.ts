import { AppState, createInitialState } from './state.js';
import { AppView } from '../tui/AppView.js';
import { JamendoClient, jamendoClient } from '../api/jamendo.js';
import {
  enterSearchMode,
  exitSearchMode,
  moveSelectionDown,
  moveSelectionUp,
  performSearch,
} from './actions.js';

export class App {
  private state: AppState;
  private view: AppView;
  private client: JamendoClient;
  private isRunning: boolean = false;

  constructor(client: JamendoClient = jamendoClient) {
    this.state = createInitialState();
    this.view = new AppView();
    this.client = client;
  }

  public start(): void {
    this.isRunning = true;

    process.on('SIGINT', this.handleExit);
    process.on('SIGTERM', this.handleExit);

    this.view.init(this.handleKey);
    process.stdout.on('resize', () => {
      if (this.isRunning) {
        this.view.render(this.state);
      }
    });

    this.render();
  }

  private render = (): void => {
    if (this.isRunning) {
      this.view.render(this.state);
    }
  };

  private handleKey = (key: string): void => {
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
        performSearch(this.state, this.client, query, this.render);
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

      // Add regular printable characters
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
      if (this.state.searchResults.length > 0) {
        this.state.selectedTrack = this.state.searchResults[this.state.selectedIndex];
        this.state.statusMessage = `Selected: "${this.state.selectedTrack.title}" by ${this.state.selectedTrack.artist}. (Playback in Step 5/6)`;
        this.render();
      }
      return;
    }

    this.state.statusMessage = `Key: ${key}. Press '/' to search, ↑/↓ to navigate, 'Q' to quit.`;
    this.render();
  };

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    process.removeListener('SIGINT', this.handleExit);
    process.removeListener('SIGTERM', this.handleExit);
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
