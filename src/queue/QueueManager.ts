import { Track } from '../api/types.js';

export class QueueManager {
  private queue: Track[] = [];
  private currentIndex: number = -1;
  private repeat: boolean = false;

  constructor(initialTracks: Track[] = []) {
    if (initialTracks.length > 0) {
      this.queue = [...initialTracks];
      this.currentIndex = 0;
    }
  }

  public addTrack(track: Track): void {
    if (!track) return;
    this.queue.push(track);
    if (this.currentIndex === -1) {
      this.currentIndex = 0;
    }
  }

  public addTracks(tracks: Track[]): void {
    for (const track of tracks) {
      this.addTrack(track);
    }
  }

  public removeTrack(index: number): boolean {
    if (index < 0 || index >= this.queue.length) {
      return false;
    }
    this.queue.splice(index, 1);
    if (this.queue.length === 0) {
      this.currentIndex = -1;
    } else if (this.currentIndex >= this.queue.length) {
      this.currentIndex = this.queue.length - 1;
    }
    return true;
  }

  public clear(): void {
    this.queue = [];
    this.currentIndex = -1;
  }

  public getTracks(): Track[] {
    return [...this.queue];
  }

  public getCurrentTrack(): Track | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public setCurrentIndex(index: number): boolean {
    if (index >= 0 && index < this.queue.length) {
      this.currentIndex = index;
      return true;
    }
    return false;
  }

  public getNextTrack(): Track | null {
    if (this.queue.length === 0) {
      return null;
    }

    const nextIndex = this.currentIndex + 1;
    if (nextIndex < this.queue.length) {
      this.currentIndex = nextIndex;
      return this.queue[this.currentIndex];
    }

    if (this.repeat && this.queue.length > 0) {
      this.currentIndex = 0;
      return this.queue[0];
    }

    return null;
  }

  public getPreviousTrack(): Track | null {
    if (this.queue.length === 0) {
      return null;
    }

    const prevIndex = this.currentIndex - 1;
    if (prevIndex >= 0) {
      this.currentIndex = prevIndex;
      return this.queue[this.currentIndex];
    }

    if (this.repeat && this.queue.length > 0) {
      this.currentIndex = this.queue.length - 1;
      return this.queue[this.currentIndex];
    }

    // Default: remain at first track
    this.currentIndex = 0;
    return this.queue[0];
  }

  public shuffle(): void {
    if (this.queue.length <= 1) return;

    const current = this.getCurrentTrack();

    // Fisher-Yates shuffle algorithm
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }

    // Keep current track at currentIndex if possible
    if (current) {
      const newIdx = this.queue.findIndex((t) => t.id === current.id);
      if (newIdx !== -1) {
        this.currentIndex = newIdx;
      }
    }
  }

  public setRepeat(repeat: boolean): void {
    this.repeat = repeat;
  }

  public isRepeat(): boolean {
    return this.repeat;
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public size(): number {
    return this.queue.length;
  }
}
