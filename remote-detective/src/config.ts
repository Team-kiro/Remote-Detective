export type InterrogationMode = 'bedrock' | 'local';

export interface AppConfig {
  apiUrl: string | null;
  interrogationMode: InterrogationMode;
  timerDurationMs: number;
  requestTimeoutMs: number;
}

export interface AppEnvironment {
  VITE_API_URL?: string;
  VITE_INTERROGATION_MODE?: string;
}

const TIMER_DURATION_MS = 720_000;
const REQUEST_TIMEOUT_MS = 12_000;

export function createAppConfig(environment: AppEnvironment): AppConfig {
  const configuredUrl = environment.VITE_API_URL?.trim();
  const apiUrl = configuredUrl ? configuredUrl : null;
  const bedrockRequested = environment.VITE_INTERROGATION_MODE === 'bedrock';

  return {
    apiUrl,
    interrogationMode: bedrockRequested && apiUrl !== null ? 'bedrock' : 'local',
    timerDurationMs: TIMER_DURATION_MS,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
  };
}

export const config: AppConfig = createAppConfig(import.meta.env);
