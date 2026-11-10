import { afterEach, expect, it, vi } from 'vitest';
import { cancelGuestRideRequest, createGuestRideRequest, counterDriverOffer } from '@/services/guest-ride';
afterEach(() => vi.unstubAllGlobals());
const status = { requestId: 'id', quoteId: 'quote', status: 'submitted', estimatedFareMinor: 320000, knownSubtotalMinor: 320000, counterFareMinor: null, acceptedFareMinor: null, acceptedDriverName: null, offerExpiresAt: null, pricingStatus: 'complete', searchMode: 'real_driver', simulatedReference: null, createdAt: new Date().toISOString() };
it('requires an action token before accepting a newly created session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(status)));
  await expect(createGuestRideRequest({ quoteId: 'quote', fullName: 'Ada Rider', email: 'ada@example.com', phone: '08012345678' })).rejects.toThrow('invalid session');
});
it('sends rider identity and quote ID without inventing a fare', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ ...status, actionToken: 'token' }));
  vi.stubGlobal('fetch', fetch);
  await createGuestRideRequest({ quoteId: 'quote', fullName: ' Ada Rider ', email: 'ada@example.com', phone: '08012345678' });
  const input = JSON.parse(fetch.mock.calls[0][1].body);
  expect(input.fullName).toBe('Ada Rider');
  expect(input.quoteId).toBe('quote');
  expect(input).not.toHaveProperty('fare');
});
it('preserves server errors and does not mark a failed cancel successful', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { code: 'RIDE_OFFER_EXPIRED' } }, { status: 410 })));
  await expect(cancelGuestRideRequest('id', 'token')).rejects.toThrow('expired');
});
it('rejects invalid counter amounts before making a request', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(counterDriverOffer('id', 'token', NaN)).rejects.toThrow('valid offer');
  expect(fetch).not.toHaveBeenCalled();
});
