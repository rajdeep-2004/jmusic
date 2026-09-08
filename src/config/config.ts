import dotenv from 'dotenv';

dotenv.config();

export const DEFAULT_SEEK_SECONDS = 5;
export const DEFAULT_VOLUME_STEP = 5;

export interface AppConfig {
  jamendoClientId: string;
  seekSeconds: number;
  volumeStep: number;
}

export function loadConfig(): AppConfig {
  const jamendoClientId = process.env.JAMENDO_CLIENT_ID?.trim() || '';
  const parsedSeek = parseInt(process.env.SEEK_SECONDS || '', 10);
  const seekSeconds = !isNaN(parsedSeek) && parsedSeek > 0 ? parsedSeek : DEFAULT_SEEK_SECONDS;
  const parsedVolStep = parseInt(process.env.VOLUME_STEP || '', 10);
  const volumeStep = !isNaN(parsedVolStep) && parsedVolStep > 0 ? parsedVolStep : DEFAULT_VOLUME_STEP;

  return {
    jamendoClientId,
    seekSeconds,
    volumeStep,
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
