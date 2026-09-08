import { AppState, createInitialState } from './state.js';
import { AppView } from '../tui/AppView.js';

export class App {
  private state: AppState;
  private view: AppView;
  private isRunning: boolean = false;

  constructor() {
    this.state = createInitialState();
    this.view = new AppView();
  }

  public start(): void {
    this.isRunning = true;

    // Handle terminal interrupt signals to restore terminal cleanly
    process.on('SIGINT', this.handleExit);
    process.on('SIGTERM', this.handleExit);

    this.view.init(this.handleKey);
    process.stdout.on('resize', () => {
      if (this.isRunning) {
        this.view.render(this.state);
      }
    });

    this.view.render(this.state);
  }

  private handleKey = (key: string): void => {
    if (!this.isRunning) return;

    if (key === 'q' || key === 'Q' || key === 'Ctrl+C') {
      this.stop();
      return;
    }

    // Later steps will handle Space, N, P, Arrow keys, etc.
    // For now, update status and re-render
    this.state.statusMessage = `Key pressed: ${key}. Press 'Q' to quit.`;
    this.view.render(this.state);
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
