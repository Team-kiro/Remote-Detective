import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateTimeRemaining,
  isTimeExpired,
  timeRemainingSeconds,
} from '@/logic/timerEngine';

const NOW = 1_700_000_000_000;

describe('timerEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates remaining milliseconds with a floor of zero', () => {
    expect(calculateTimeRemaining(NOW + 720_000)).toBe(720_000);
    expect(calculateTimeRemaining(NOW)).toBe(0);
    expect(calculateTimeRemaining(NOW - 5_000)).toBe(0);
    expect(calculateTimeRemaining(Number.NaN)).toBe(0);
  });

  it('detects expiration only when no time is left', () => {
    expect(isTimeExpired(NOW + 1)).toBe(false);
    expect(isTimeExpired(NOW)).toBe(true);
    expect(isTimeExpired(NOW - 60_000)).toBe(true);
  });

  it('converts remaining milliseconds to floored seconds', () => {
    expect(timeRemainingSeconds(NOW + 1_999)).toBe(1);
    expect(timeRemainingSeconds(NOW + 999)).toBe(0);
    expect(timeRemainingSeconds(NOW + 720_000)).toBe(720);
    expect(timeRemainingSeconds(NOW - 10_000)).toBe(0);
  });

  it('advances with the clock', () => {
    vi.setSystemTime(NOW + 300_000);
    expect(timeRemainingSeconds(NOW + 720_000)).toBe(420);
  });
});
