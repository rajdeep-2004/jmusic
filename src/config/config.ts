import dotenv from 'dotenv';

dotenv.config();

export const DEFAULT_SEEK_SECONDS = 5;

export interface AppConfig {
  jamendoClientId: string;
  seekSeconds: number;
}

export function loadConfig(): AppConfig {
  const jamendoClientId = process.env.JAMENDO_CLIENT_ID?.trim() || '';
  const parsedSeek = parseInt(process.env.SEEK_SECONDS || '', 10);
  const seekSeconds = !isNaN(parsedSeek) && parsedSeek > 0 ? parsedSeek : DEFAULT_SEEK_SECONDS;

  return {
    jamendoClientId,
    seekSeconds,
  };
}

export function validateConfig(config: AppConfig): { valid: boolean; error?: string } {
  if (!config.jamendoClientId) {
    return {
      valid: false,
      error: 'JAMENDO_CLIENT_ID environment variable is missing or empty. Please set it in your .env file or environment.',
    };
  }
  return { valid: true };
}

export const config = loadConfig();
