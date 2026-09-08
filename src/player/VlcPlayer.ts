import { EventEmitter } from 'events';
import { spawn, ChildProcess, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { IPlayer, PlayerState } from './types.js';
import { VlcPlaybackError, VlcUnavailableError } from '../utils/errors.js';

export function findVlcBinary(): string | null {
  // 1. Explicit environment variable
  if (process.env.VLC_PATH && fs.existsSync(process.env.VLC_PATH)) {
    return process.env.VLC_PATH;
  }

  const platform = os.platform();

  // 2. macOS candidates
  if (platform === 'darwin') {
    const macPaths = [
      '/Applications/VLC.app/Contents/MacOS/VLC',
      path.join(os.homedir(), 'Applications/VLC.app/Contents/MacOS/VLC'),
      '/opt/homebrew/bin/vlc',
      '/usr/local/bin/vlc',
    ];
    for (const p of macPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  // 3. Linux candidates
  if (platform === 'linux') {
    const linuxPaths = [
      '/usr/bin/vlc',
      '/usr/local/bin/vlc',
      '/snap/bin/vlc',
      '/usr/bin/cvlc',
    ];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  // 4. Windows candidates
  if (platform === 'win32') {
    const winPaths = [
      'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
      'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  // 5. Try resolving via system which/where
  try {
    const cmd = platform === 'win32' ? 'where vlc' : 'which vlc || which cvlc';
    const resolved = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n')[0];
    if (resolved && fs.existsSync(resolved)) {
      return resolved;
    }
  } catch {
    // Ignore error if which/where fails
  }

  return null;
}

export class VlcPlayer extends EventEmitter implements IPlayer {
  private vlcBinary: string | null = null;
  private process: ChildProcess | null = null;
  private state: PlayerState = 'stopped';
  private volume: number = 100;
  private responseCallbacks: Array<(line: string) => void> = [];

  constructor(vlcBinaryPath?: string) {
    super();
    this.vlcBinary = vlcBinaryPath || findVlcBinary();
  }

  public async isAvailable(): Promise<boolean> {
    if (!this.vlcBinary) {
      this.vlcBinary = findVlcBinary();
    }
    return this.vlcBinary !== null && fs.existsSync(this.vlcBinary);
  }

  private ensureProcess(): ChildProcess {
    if (this.process && !this.process.killed) {
      return this.process;
    }

    if (!this.vlcBinary || !fs.existsSync(this.vlcBinary)) {
      this.vlcBinary = findVlcBinary();
      if (!this.vlcBinary || !fs.existsSync(this.vlcBinary)) {
        throw new VlcUnavailableError('VLC executable not found on the system. Please install VLC.');
      }
    }

    const args = [
      '-I',
      'rc',
      '--rc-fake-tty',
      '--no-video',
      '--no-media-library',
      '--quiet',
    ];

    try {
      this.process = spawn(this.vlcBinary, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err: any) {
      throw new VlcPlaybackError(`Failed to spawn VLC process: ${err?.message || err}`);
    }

    this.process.stdout?.on('data', this.handleStdout);
    this.process.stderr?.on('data', () => {
      // Ignore VLC debug logs
    });

    this.process.on('error', (err) => {
      this.setState('error');
      this.emit('error', err);
    });

    this.process.on('exit', () => {
      const wasPlaying = this.state === 'playing';
      this.process = null;
      this.setState('stopped');
      if (wasPlaying) {
        this.emit('ended');
      }
    });

    // Make sure VLC terminates if parent process exits
    const cleanExit = () => {
      this.destroy();
    };
    process.once('exit', cleanExit);

    return this.process;
  }

  private handleStdout = (data: Buffer): void => {
    const text = data.toString();
    const lines = text.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Handle query response listeners
      if (this.responseCallbacks.length > 0) {
        const cb = this.responseCallbacks.shift();
        if (cb) cb(line);
      }

      // Check state changes from VLC RC
      if (line.includes('state playing') || line.includes('status: ( play state: 1 )')) {
        this.setState('playing');
      } else if (line.includes('state paused') || line.includes('status: ( play state: 2 )')) {
        this.setState('paused');
      } else if (line.includes('state stopped') || line.includes('status: ( play state: 0 )')) {
        if (this.state === 'playing') {
          this.setState('stopped');
          this.emit('ended');
        } else {
          this.setState('stopped');
        }
      }
    }
  };

  private sendCommand(command: string): void {
    const proc = this.ensureProcess();
    if (proc.stdin && !proc.stdin.destroyed) {
      proc.stdin.write(`${command}\n`);
    }
  }

  private queryCommand(command: string, timeoutMs: number = 1000): Promise<string> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const idx = this.responseCallbacks.indexOf(cb);
        if (idx !== -1) this.responseCallbacks.splice(idx, 1);
        resolve('');
      }, timeoutMs);

      const cb = (response: string) => {
        clearTimeout(timer);
        resolve(response);
      };

      this.responseCallbacks.push(cb);
      this.sendCommand(command);
    });
  }

  private setState(newState: PlayerState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('statusChange', this.state);
    }
  }

  public getState(): PlayerState {
    return this.state;
  }

  public async play(url: string): Promise<void> {
    if (!url) {
      throw new VlcPlaybackError('Cannot play empty audio URL');
    }
    this.ensureProcess();
    // In VLC RC, 'clear' clears previous tracks, then 'add <url>' enqueues and starts playing
    this.sendCommand('clear');
    this.sendCommand(`add ${url}`);
    this.setState('playing');
  }

  public async pause(): Promise<void> {
    if (this.state === 'playing') {
      this.sendCommand('pause');
      this.setState('paused');
    }
  }

  public async resume(): Promise<void> {
    if (this.state === 'paused') {
      this.sendCommand('pause'); // VLC pause toggles pause/resume
      this.setState('playing');
    }
  }

  public async stop(): Promise<void> {
    this.sendCommand('stop');
    this.setState('stopped');
  }

  public async seek(positionInSeconds: number): Promise<void> {
    const target = Math.max(0, Math.floor(positionInSeconds));
    this.sendCommand(`seek ${target}`);
  }

  public async getPosition(): Promise<number> {
    if (this.state !== 'playing' && this.state !== 'paused') {
      return 0;
    }
    const res = await this.queryCommand('get_time');
    const parsed = parseInt(res.replace(/[^0-9]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  public async getDuration(): Promise<number> {
    const res = await this.queryCommand('get_length');
    const parsed = parseInt(res.replace(/[^0-9]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  public async setVolume(volumePercent: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
    this.volume = clamped;
    // VLC RC scale: 0 to 256 is 0% to 100%
    const vlcVol = Math.round((clamped / 100) * 256);
    this.sendCommand(`volume ${vlcVol}`);
  }

  public async getVolume(): Promise<number> {
    return this.volume;
  }

  public async destroy(): Promise<void> {
    if (this.process && !this.process.killed) {
      try {
        this.sendCommand('quit');
      } catch {
        // ignore
      }
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          try {
            this.process.kill('SIGTERM');
          } catch {
            // ignore
          }
        }
        this.process = null;
      }, 200);
    }
    this.setState('stopped');
  }
}
