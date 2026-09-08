import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  jamendoClientId: string;
}

export function loadConfig(): AppConfig {
  const jamendoClientId = process.env.JAMENDO_CLIENT_ID?.trim() || '';
  return {
    jamendoClientId,
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
