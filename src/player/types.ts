import { PlaybackStatus } from '../app/state.js';

export type PlayerState = PlaybackStatus;

export interface IPlayer {
  play(url: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(positionInSeconds: number): Promise<void>;
  getPosition(): Promise<number>;
  getDuration(): Promise<number>;
  setVolume(volume: number): Promise<void>; // 0 - 100
  getVolume(): Promise<number>;
  getState(): PlayerState;
  isAvailable(): Promise<boolean>;
  destroy(): Promise<void>;
  on(event: 'statusChange', listener: (status: PlayerState) => void): this;
  on(event: 'ended', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
}
