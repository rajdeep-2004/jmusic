export class JamendoApiError extends Error {
  public readonly code?: number | string;

  constructor(message: string, code?: number | string) {
    super(message);
    this.name = 'JamendoApiError';
    this.code = code;
    Object.setPrototypeOf(this, JamendoApiError.prototype);
  }
}

export class VlcUnavailableError extends Error {
  constructor(message: string = 'VLC media player is not installed or could not be found.') {
    super(message);
    this.name = 'VlcUnavailableError';
    Object.setPrototypeOf(this, VlcUnavailableError.prototype);
  }
}

export class VlcPlaybackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VlcPlaybackError';
    Object.setPrototypeOf(this, VlcPlaybackError.prototype);
  }
}
