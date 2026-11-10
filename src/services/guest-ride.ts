import { fetchWithTimeout } from '@/lib/http';
import { riderApiOrigin } from './rider-route';

export type GuestRideStatus = {
  requestId: string;
  quoteId: string;
  status: 'submitted' | 'countered' | 'accepted' | 'cancelled' | 'expired';
  estimatedFareMinor: number | null;
  knownSubtotalMinor: number;
  counterFareMinor: number | null;
  acceptedFareMinor: number | null;
  acceptedDriverName: string | null;
  offerExpiresAt: string | null;
  pricingStatus: 'complete' | 'unresolved_charges';
  searchMode: 'development_simulation' | 'real_driver' | 'unavailable';
  simulatedReference: { id: string; pickupDurationSeconds: number } | null;
  createdAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function parseStatus(value: unknown): GuestRideStatus {
  if (!isRecord(value) || typeof value.requestId !== 'string' || typeof value.quoteId !== 'string' ||
      !['submitted', 'countered', 'accepted', 'cancelled', 'expired'].includes(value.status as string) ||
      !Number.isSafeInteger(value.knownSubtotalMinor) || (value.knownSubtotalMinor as number) < 0 ||
      (value.pricingStatus !== 'complete' && value.pricingStatus !== 'unresolved_charges') ||
      (value.estimatedFareMinor !== null && (!Number.isSafeInteger(value.estimatedFareMinor) || (value.estimatedFareMinor as number) < 0)) ||
      (value.pricingStatus === 'complete' && value.estimatedFareMinor === null) ||
      (value.counterFareMinor !== null && (!Number.isSafeInteger(value.counterFareMinor) || (value.counterFareMinor as number) <= 0)) ||
      (value.acceptedFareMinor !== null && (!Number.isSafeInteger(value.acceptedFareMinor) || (value.acceptedFareMinor as number) <= 0)) ||
      (value.acceptedDriverName !== null && typeof value.acceptedDriverName !== 'string') ||
      (value.offerExpiresAt !== null && (typeof value.offerExpiresAt !== 'string' || !Number.isFinite(Date.parse(value.offerExpiresAt)))) ||
      (value.status === 'countered' && value.counterFareMinor === null) ||
      !['development_simulation', 'real_driver', 'unavailable'].includes(value.searchMode as string) ||
      typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) ||
      (value.simulatedReference !== null && (!isRecord(value.simulatedReference) ||
        typeof value.simulatedReference.id !== 'string' ||
        typeof value.simulatedReference.pickupDurationSeconds !== 'number' ||
        !Number.isFinite(value.simulatedReference.pickupDurationSeconds)))) {
    throw new Error('The ride request service returned an invalid response.');
  }
  return value as GuestRideStatus;
}

async function readResponse(response: Response): Promise<GuestRideStatus> {
  if (!response.ok) {
    let code = '';
    try { const body: unknown = await response.json(); if (isRecord(body) && isRecord(body.error) && typeof body.error.code === 'string') code = body.error.code; }
    catch { /* Keep the HTTP status as a safe fallback. */ }
    if (code === 'QUOTE_EXPIRED') throw new Error('Your quote expired. Go back for a fresh estimate.');
    if (code === 'QUOTE_INCOMPLETE') throw new Error('This quote has unresolved charges and cannot be requested yet.');
    if (code === 'QUOTE_ALREADY_REQUESTED') throw new Error('This quote was used for another ride request. Get a fresh quote.');
    if (code === 'QUOTE_REQUEST_UNAVAILABLE') throw new Error('That driver is no longer available. Get a fresh quote to search again.');
    if (code === 'RIDE_OFFER_EXPIRED' || response.status === 410) throw new Error('This driver offer expired. Search again for a fresh quote.');
    if (response.status === 401) throw new Error('This test request session expired. Start a new ride request.');
    if (response.status === 409) throw new Error('This driver offer is no longer available.');
    if (response.status === 429) throw new Error('Too many requests. Please wait and try again.');
    throw new Error('Unable to submit your ride request. Please try again.');
  }
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new Error('The ride request service returned an invalid response.'); }
  return parseStatus(body);
}

export async function createGuestRideRequest(input: { quoteId: string; fullName: string; email: string; phone: string }): Promise<GuestRideStatus & { actionToken: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    let response: Response;
    try {
      response = await fetchWithTimeout(`${riderApiOrigin()}/api/v1/rides/requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, fullName: input.fullName.trim(), email: input.email.trim(), phone: input.phone.trim() }),
        signal: controller.signal,
      });
    } catch {
      throw new Error(controller.signal.aborted ? 'Submitting the ride request timed out. Please try again.' :
        'Unable to reach the ride request service. Check your connection.');
    }
    const result = await readResponse(response);
    const actionToken = (result as GuestRideStatus & { actionToken?: unknown }).actionToken;
    if (typeof actionToken !== 'string' || !actionToken) {
      throw new Error('The ride request service returned an invalid session.');
    }
    return { ...result, actionToken };
  } finally { clearTimeout(timeout); }
}

export async function getGuestRideStatus(requestId: string): Promise<GuestRideStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    let response: Response;
    try { response = await fetchWithTimeout(`${riderApiOrigin()}/api/v1/rides/requests/${encodeURIComponent(requestId)}`, { signal: controller.signal }); }
    catch { throw new Error('Unable to load the ride request. Check your connection.'); }
    return await readResponse(response);
  } finally { clearTimeout(timeout); }
}

export async function acceptDriverCounter(requestId: string, actionToken: string): Promise<GuestRideStatus> {
  let response: Response;
  try { response = await fetchWithTimeout(`${riderApiOrigin()}/api/v1/rides/requests/${encodeURIComponent(requestId)}/accept-counter`, {
    method: 'POST', headers: { Authorization: `Bearer ${actionToken}` },
  }); } catch { throw new Error('Unable to reach the ride request service. Check your connection.'); }
  return readResponse(response);
}

export async function counterDriverOffer(requestId: string, actionToken: string, fareMinor: number): Promise<GuestRideStatus> {
  if (!Number.isSafeInteger(fareMinor) || fareMinor <= 0) throw new Error('Enter a valid offer amount.');
  let response: Response;
  try { response = await fetchWithTimeout(`${riderApiOrigin()}/api/v1/rides/requests/${encodeURIComponent(requestId)}/counter`, {
    method: 'POST', headers: { Authorization: `Bearer ${actionToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fareMinor }),
  }); } catch { throw new Error('Unable to reach the ride request service. Check your connection.'); }
  return readResponse(response);
}

export async function cancelGuestRideRequest(requestId: string, actionToken: string): Promise<GuestRideStatus> {
  let response: Response;
  try { response = await fetchWithTimeout(`${riderApiOrigin()}/api/v1/rides/requests/${encodeURIComponent(requestId)}/cancel`, {
    method: 'POST', headers: { Authorization: `Bearer ${actionToken}` },
  }); } catch { throw new Error('Unable to cancel the ride request. Check your connection and retry.'); }
  return readResponse(response);
}
