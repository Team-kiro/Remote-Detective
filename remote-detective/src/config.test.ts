import { describe, expect, it } from 'vitest';
import { createAppConfig } from '@/config';

describe('createAppConfig', () => {
  it('uses safe local defaults when environment variables are absent', () => {
    expect(createAppConfig({})).toEqual({
      apiUrl: null,
      interrogationMode: 'local',
      timerDurationMs: 720_000,
      requestTimeoutMs: 12_000,
    });
  });

  it('keeps local mode when Bedrock is requested without an endpoint', () => {
    expect(
      createAppConfig({ VITE_INTERROGATION_MODE: 'bedrock' }).interrogationMode,
    ).toBe('local');
  });

  it('enables Bedrock only when both mode and endpoint are configured', () => {
    expect(
      createAppConfig({
        VITE_API_URL: ' https://example.test/interrogate ',
        VITE_INTERROGATION_MODE: 'bedrock',
      }),
    ).toMatchObject({
      apiUrl: 'https://example.test/interrogate',
      interrogationMode: 'bedrock',
    });
  });

  it('falls back to local mode for unsupported mode values', () => {
    expect(
      createAppConfig({
        VITE_API_URL: 'https://example.test/interrogate',
        VITE_INTERROGATION_MODE: 'unsupported',
      }).interrogationMode,
    ).toBe('local');
  });
});
