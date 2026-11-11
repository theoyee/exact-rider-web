import { fetchWithTimeout } from '@/lib/http';
import { isCoordinate, parseRiderRouteResponse, riderApiOrigin, type RiderRoute, type RouteEndpoints } from './rider-route';

export type RiderQuote = {
  quoteId: string;
  status: 'complete' | 'unresolved_charges';
  knownSubtotalMinor: number;
  estimatedFareMinor: number | null;
  referenceId: string;
  referenceSource: 'development_simulation' | 'driver_presence';
  pickupDistanceMeters: number;
  pickupDurationSeconds: number;
  pricingVersion: number;
  expiresAt: string;
  serverClockOffsetMs: number;
  route: RiderRoute;
};

export function remainingQuoteSeconds(quote: Pick<RiderQuote, 'expiresAt' | 'serverClockOffsetMs'>, now = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(quote.expiresAt) - now - quote.serverClockOffsetMs) / 1000));
}

export function formatQuoteCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export type SimulatedDriver = { id: string; latitude: number; longitude: number };

export async function getSimulatedDrivers(signal: AbortSignal): Promise<SimulatedDriver[]> {
  const response = await fetchWithTimeout(`${riderApiOrigin()}/api/v1/rides/simulated-drivers`, { signal });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('Simulated driver locations are unavailable.');
  const payload: unknown = await response.json();
  if (!record(payload) || payload.source !== 'development_simulation' || !Array.isArray(payload.drivers) || payload.drivers.length > 20 ||
      !payload.drivers.every((driver: unknown) => record(driver) && typeof driver.id === 'string' && !!driver.id && isCoordinate(driver)) ||
      new Set(payload.drivers.map((driver: SimulatedDriver) => driver.id)).size !== payload.drivers.length) {
    throw new Error('Invalid simulated driver locations.');
  }
  return payload.drivers as SimulatedDriver[];
}

export function formatQuoteMinor(value: number): string {
  if (!minor(value)) throw new Error('Invalid quote amount.');
  const whole = Math.trunc(value / 100);
  return `₦${whole.toLocaleString('en-NG')}.${String(value % 100).padStart(2, '0')}`;
}

const minor = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const metric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function parseQuote(value: unknown, endpoints: RouteEndpoints): RiderQuote {
  if (!record(value) || !record(value.pickup) || !record(value.destination) ||
      !isCoordinate(value.pickup) || !isCoordinate(value.destination) ||
      value.pickup.latitude !== endpoints.pickup.latitude || value.pickup.longitude !== endpoints.pickup.longitude ||
      value.destination.latitude !== endpoints.destination.latitude || value.destination.longitude !== endpoints.destination.longitude ||
      typeof value.quoteId !== 'string' || !value.quoteId || value.driverAssignment !== 'none' ||
      (value.status !== 'complete' && value.status !== 'unresolved_charges') ||
      !record(value.pricing) || !record(value.passengerTrip) || !record(value.referenceEstimate)) {
    throw new Error('The quotation service returned an invalid estimate. Please try again.');
  }
  const { pricing, passengerTrip, referenceEstimate } = value;
  if (!minor(pricing.knownSubtotalMinor) ||
      (value.status === 'complete' && (!minor(pricing.estimatedFareMinor) || pricing.estimatedFareMinor !== pricing.knownSubtotalMinor)) ||
      (value.status === 'unresolved_charges' && pricing.estimatedFareMinor !== null) ||
      pricing.completeness !== value.status || pricing.vehicleCategory !== 'standard' || pricing.currency !== 'NGN' ||
      !Number.isSafeInteger(pricing.pricingVersion) || (pricing.pricingVersion as number) < 1 ||
      typeof referenceEstimate.referenceId !== 'string' || !referenceEstimate.referenceId ||
      !['development_simulation', 'driver_presence'].includes(referenceEstimate.source as string) ||
      !metric(referenceEstimate.distanceMeters) || !metric(referenceEstimate.durationSeconds) ||
      typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now() ||
      !metric(passengerTrip.distanceMeters) || !metric(passengerTrip.durationSeconds)) {
    throw new Error('The quotation service returned an invalid estimate. Please try again.');
  }
  if (value.serverNow !== undefined &&
      (typeof value.serverNow !== 'string' || !Number.isFinite(Date.parse(value.serverNow)))) {
    throw new Error('The quotation service returned an invalid estimate. Please try again.');
  }
  const route = parseRiderRouteResponse(endpoints, {
    provider: passengerTrip.provider,
    geometry: passengerTrip.geometry,
    distance: { meters: passengerTrip.distanceMeters },
    duration: { seconds: passengerTrip.durationSeconds },
    traffic: passengerTrip.traffic,
    trafficSegments: passengerTrip.trafficSegments,
    calculatedAt: passengerTrip.calculatedAt,
  });
  return {
    quoteId: value.quoteId,
    status: value.status,
    knownSubtotalMinor: pricing.knownSubtotalMinor,
    estimatedFareMinor: pricing.estimatedFareMinor as number | null,
    referenceId: referenceEstimate.referenceId,
    referenceSource: referenceEstimate.source as RiderQuote['referenceSource'],
    pickupDistanceMeters: referenceEstimate.distanceMeters as number,
    pickupDurationSeconds: referenceEstimate.durationSeconds as number,
    pricingVersion: pricing.pricingVersion as number,
    expiresAt: value.expiresAt,
    serverClockOffsetMs: value.serverNow ? Date.parse(value.serverNow as string) - Date.now() : 0,
    route,
  };
}

export async function validateRiderQuote(quoteId: string): Promise<'valid' | 'expired'> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quoteId)) {
    throw new Error('The quote reference is invalid. Request a fresh quote.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetchWithTimeout(`${riderApiOrigin()}/api/v1/rides/quotes/${quoteId}/validity`, { signal: controller.signal });
  } catch {
    throw new Error('Unable to check this quote. Check your connection and try again.');
  } finally { clearTimeout(timer); }
  if (response.status === 410 || response.status === 404) return 'expired';
  if (!response.ok) throw new Error('Unable to check this quote. Please try again.');
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new Error('The quote check returned an invalid response. Please try again.'); }
  if (!record(payload) || payload.quoteId !== quoteId || payload.valid !== true ||
      typeof payload.expiresAt !== 'string' || !Number.isFinite(Date.parse(payload.expiresAt))) {
    throw new Error('The quote check returned an invalid response. Please try again.');
  }
  return 'valid';
}

const errorMessages: Record<string, string> = {
  INVALID_ORIGIN: 'The ride service rejected this site address. Reload the page and try again.',
  BACKEND_NOT_CONFIGURED: 'The ride service connection is not configured on this website.',
  BACKEND_UNAVAILABLE: 'This website could not reach the ride service. Please try again shortly.',
  PICKUP_OUTSIDE_OPERATING_ZONES: 'Pickup is outside the current service area.',
  NO_REFERENCE_LOCATION: 'No simulated driver is near this pickup. Try a location near Ikeja City Mall, Allen Avenue or Maryland.',
  NO_REACHABLE_REFERENCE: 'The nearby simulated drivers have no available road route to this pickup.',
  REFERENCE_SIMULATION_DISABLED: 'Simulated drivers are not enabled on the backend.',
  NO_AVAILABLE_DRIVER: 'No available driver is near this pickup. Try another location or wait a moment.',
  PRICING_NOT_CONFIGURED: 'Pricing is not active for this vehicle category.',
  OPERATING_ZONES_UNAVAILABLE: 'Operating zones are not available yet.',
  QUOTE_EXPIRY_NOT_CONFIGURED: 'Quote expiry is not configured on the backend.',
};

export async function getRiderQuote(endpoints: RouteEndpoints, signal: AbortSignal): Promise<RiderQuote> {
  if (!isCoordinate(endpoints.pickup) || !isCoordinate(endpoints.destination)) throw new Error('Choose valid trip locations.');
  const origin = riderApiOrigin();
  let response: Response;
  try {
    response = await fetchWithTimeout(`${origin}/api/v1/rides/quotes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ ...endpoints, vehicleCategory: 'standard', airConditioning: false }),
    });
  } catch {
    if (signal.aborted) throw new Error('Quote request cancelled.');
    throw new Error('Unable to reach the quotation service. Check your connection and try again.');
  }
  if (signal.aborted) throw new Error('Quote request cancelled.');
  if (!response.ok) {
    let code: string | undefined;
    try {
      const payload: unknown = await response.json();
      if (record(payload) && record(payload.error) && typeof payload.error.code === 'string') code = payload.error.code;
    } catch { /* The status is still enough to give a safe error. */ }
    if (code && errorMessages[code]) throw new Error(errorMessages[code]);
    if (response.status === 429) throw new Error('Too many quote requests. Please wait a moment and try again.');
    if (response.status === 400) throw new Error('Choose valid pickup and destination locations.');
    if (response.status === 422) throw new Error('A quote is not available for this trip. Try another pickup or destination.');
    if (response.status === 504) throw new Error('Finding your quote timed out. Please try again.');
    throw new Error('The quotation service is temporarily unavailable. Please try again.');
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new Error('The quotation service returned an invalid estimate. Please try again.'); }
  if (signal.aborted) throw new Error('Quote request cancelled.');
  return parseQuote(payload, endpoints);
}
