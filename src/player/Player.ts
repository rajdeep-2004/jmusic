import { IPlayer } from './types.js';
import { VlcPlayer } from './VlcPlayer.js';

export class Player {
  private player: IPlayer;

  constructor(player?: IPlayer) {
    this.player = player || new VlcPlayer();
  }

  public getAdapter(): IPlayer {
    return this.player;
  }

  public async isAvailable(): Promise<boolean> {
    return this.player.isAvailable();
  }

  public async play(url: string): Promise<void> {
    return this.player.play(url);
  }

  public async pause(): Promise<void> {
    return this.player.pause();
  }

  public async resume(): Promise<void> {
    return this.player.resume();
  }

  public async stop(): Promise<void> {
    return this.player.stop();
  }

  public async seek(seconds: number): Promise<void> {
    return this.player.seek(seconds);
  }

  public async getPosition(): Promise<number> {
    return this.player.getPosition();
  }

  public async getDuration(): Promise<number> {
    return this.player.getDuration();
  }

  public async setVolume(volume: number): Promise<void> {
    return this.player.setVolume(volume);
  }

  public async getVolume(): Promise<number> {
    return this.player.getVolume();
  }

  public getState() {
    return this.player.getState();
  }

  public async destroy(): Promise<void> {
    return this.player.destroy();
  }
}

export const player = new Player();
