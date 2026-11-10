import { describe, expect, it } from 'vitest';
import { distanceMeters, initials, money, validRider } from '@/lib/domain';
import { remainingQuoteSeconds } from '@/services/rider-quote';
describe('rider inputs and fare presentation', () => {
  it('accepts local and international Nigerian numbers, and rejects incomplete details', () => {
    expect(validRider('Ada Driver', 'ada@example.com', '0801 234 5678')).toBe(true);
    expect(validRider('Ada Driver', 'ada@example.com', '+2348012345678')).toBe(true);
    expect(validRider('A', 'ada@example.com', '08012345678')).toBe(false);
    expect(validRider('Ada Driver', 'ada', '08012345678')).toBe(false);
    expect(validRider('Ada Driver', 'ada@example.com', '0801234')).toBe(false);
  });
  it('formats backend minor units without treating kobo as naira', () => {
    expect(money(320000)).toContain('3,200');
    expect(money(320050)).toContain('3,200.50');
    expect(initials('Ada Okafor')).toBe('AO');
  });
  it('uses the server clock offset and never shows negative quote time', () => {
    const quote = { expiresAt: new Date(50000).toISOString(), serverClockOffsetMs: 10000 };
    expect(remainingQuoteSeconds(quote, 20000)).toBe(20);
    expect(remainingQuoteSeconds(quote, 60000)).toBe(0);
  });
  it('computes actual pickup proximity instead of simulated arrival', () => {
    expect(distanceMeters({ latitude: 6.5, longitude: 3.3 }, { latitude: 6.5, longitude: 3.3 })).toBe(0);
    expect(distanceMeters({ latitude: 6.5, longitude: 3.3 }, { latitude: 6.51, longitude: 3.3 })).toBeGreaterThan(1000);
  });
});
