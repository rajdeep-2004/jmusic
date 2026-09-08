export class JamendoApiError extends Error {
  public readonly code?: number | string;

  constructor(message: string, code?: number | string) {
    super(message);
    this.name = 'JamendoApiError';
    this.code = code;
    Object.setPrototypeOf(this, JamendoApiError.prototype);
  }
}
