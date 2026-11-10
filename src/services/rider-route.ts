import { fetchWithTimeout } from '@/lib/http';
import { getPlaceCoordinates } from './places';
import type { RiderCoordinates } from '@/stores/rider';

export type TripEndpoint = { address: string; placeId: string | null; coordinates?: RiderCoordinates | null };
export type RouteEndpoints = { pickup: RiderCoordinates; destination: RiderCoordinates };
type TrafficLine = { type: 'Feature'; properties: { congestion: string }; geometry: { type: 'LineString'; coordinates: [number, number][] } };
type TrafficLevel = 'low' | 'moderate' | 'heavy' | 'severe';
const trafficLevels: TrafficLevel[] = ['low', 'moderate', 'heavy', 'severe'];
export type RiderRoute = RouteEndpoints & {
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  distance: number;
  duration: number;
  traffic: string;
  departure: number;
  trafficSegments: { type: 'FeatureCollection'; features: TrafficLine[] };
};

export function mapboxToken() { return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || ''; }

function trafficLabel(traffic: { aware: boolean; observedLevels?: TrafficLevel[]; coverage?: string }): RiderRoute['traffic'] {
  if (!traffic.aware) return 'Unavailable';
  if (!traffic.observedLevels || !traffic.coverage) return 'Available'; // Older backend contract.
  const description = traffic.observedLevels.length === 1
    ? traffic.observedLevels[0][0].toUpperCase() + traffic.observedLevels[0].slice(1)
    : 'Mixed';
  return traffic.coverage === 'partial' ? `${description} where reported` : description;
}
export function isCoordinate(value: unknown): value is RiderCoordinates {
  if (!value || typeof value !== 'object') return false;
  const point = value as RiderCoordinates;
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}

async function mapboxJson(path: string, parameters: Record<string, string>, signal: AbortSignal) {
  const token = mapboxToken();
  if (!token) throw new Error('The map is unavailable right now. Please try again later.');
  const query = new URLSearchParams({ ...parameters, access_token: token });
  try {
    const response = await fetchWithTimeout(`https://api.mapbox.com/${path}?${query}`, { signal });
    if (!response.ok) throw new Error('Mapbox request failed.');
    return await response.json();
  } catch {
    // Native networking errors can include full URLs containing the token.
    if (signal.aborted) throw new Error('Route request cancelled.');
    throw new Error('Unable to load your route. Please check your connection and try again.');
  }
}

export async function resolveTripEndpoint(endpoint: TripEndpoint, signal: AbortSignal): Promise<RiderCoordinates> {
  if (isCoordinate(endpoint.coordinates)) return endpoint.coordinates;
  if (endpoint.placeId) {
    const coordinates = await getPlaceCoordinates(endpoint.placeId, signal);
    if (signal.aborted) throw new Error('Route request cancelled.');
    if (isCoordinate(coordinates)) return coordinates;
    // A selected Google place must not silently resolve to a different address.
    throw new Error('Unable to locate the selected place. Please try again or choose another suggestion.');
  }
  const text = endpoint.address.trim();
  const pair = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/.exec(text);
  const coordinates = pair && { latitude: Number(pair[1]), longitude: Number(pair[2]) };
  if (isCoordinate(coordinates)) return coordinates;
  if (!text) throw new Error('Choose your pickup and destination to see a route.');
  const result = await mapboxJson('search/geocode/v6/forward', { q: text, country: 'ng', limit: '1', autocomplete: 'false' }, signal);
  const point = result?.features?.[0]?.geometry?.coordinates;
  const resolved = Array.isArray(point) && { latitude: point[1], longitude: point[0] };
  if (!isCoordinate(resolved)) throw new Error('Unable to locate this address. Please choose another suggestion.');
  return resolved;
}

function validGeometry(value: unknown): value is RiderRoute['geometry'] {
  if (!value || typeof value !== 'object') return false;
  const geometry = value as RiderRoute['geometry'];
  return geometry.type === 'LineString' && Array.isArray(geometry.coordinates)
    && geometry.coordinates.length >= 2 && geometry.coordinates.length <= 25000
    && geometry.coordinates.every(point => Array.isArray(point) && point.length === 2
      && isCoordinate({ longitude: point[0], latitude: point[1] }));
}

export function riderApiOrigin(): string { return '/api/backend'; }

export async function getRiderRoute(endpoints: RouteEndpoints, signal: AbortSignal): Promise<RiderRoute> {
  if (!isCoordinate(endpoints.pickup) || !isCoordinate(endpoints.destination)) throw new Error('Choose valid trip locations.');
  const origin = riderApiOrigin();
  let response: Response;
  try {
    response = await fetchWithTimeout(origin + '/api/v1/routing/estimate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...endpoints, departureTime: 'now' }), signal,
    });
  } catch {
    if (signal.aborted) throw new Error('Route request cancelled.');
    throw new Error('Unable to load your route. Please check your connection and try again.');
  }
  if (signal.aborted) throw new Error('Route request cancelled.');
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'Choose valid pickup and destination locations.',
      422: 'No driving route was found. Try a different pickup or destination.',
      429: 'Too many route requests. Please wait a moment and try again.',
      504: 'Finding your route timed out. Please try again.',
    };
    throw new Error(messages[response.status] || 'The routing service is temporarily unavailable. Please try again.');
  }
  let result;
  try { result = await response.json(); }
  catch {
    if (signal.aborted) throw new Error('Route request cancelled.');
    throw new Error('The routing service returned an invalid route. Please try again.');
  }
  if (signal.aborted) throw new Error('Route request cancelled.');
  return parseRiderRouteResponse(endpoints, result);
}

export function parseRiderRouteResponse(endpoints: RouteEndpoints, result: Awaited<ReturnType<Response['json']>>): RiderRoute {
  const features = result?.trafficSegments?.features;
  if (result?.provider !== 'mapbox' || !validGeometry(result?.geometry)
    || typeof result?.distance?.meters !== 'number' || !Number.isFinite(result.distance.meters) || result.distance.meters < 0
    || typeof result?.duration?.seconds !== 'number' || !Number.isFinite(result.duration.seconds) || result.duration.seconds < 0
    || typeof result?.calculatedAt !== 'string' || !Number.isFinite(Date.parse(result.calculatedAt))
    || typeof result?.traffic?.aware !== 'boolean' || result.traffic.condition !== 'unknown'
    || !['provider_annotations', 'unavailable'].includes(result.traffic.source)
    || result.traffic.aware !== (result.traffic.source === 'provider_annotations')
    || (result.traffic.observedLevels !== undefined && (!Array.isArray(result.traffic.observedLevels)
      || result.traffic.observedLevels.some((level: string) => !trafficLevels.includes(level as TrafficLevel))))
    || (result.traffic.coverage !== undefined && !['complete', 'partial', 'unavailable'].includes(result.traffic.coverage))
    || ((result.traffic.observedLevels === undefined) !== (result.traffic.coverage === undefined))
    || (result.traffic.coverage !== undefined && (result.traffic.aware !== (result.traffic.observedLevels.length > 0)
      || (result.traffic.coverage === 'unavailable') !== (result.traffic.observedLevels.length === 0)))
    || result?.trafficSegments?.type !== 'FeatureCollection' || !Array.isArray(features) || features.length > 25000
    || features.some((feature: TrafficLine) => feature?.type !== 'Feature' || !validGeometry(feature.geometry)
      || !['moderate','heavy','severe'].includes(feature.properties?.congestion))
    || (!result.traffic.aware && features.length !== 0)) {
    throw new Error('The routing service returned an invalid route. Please try again.');
  }
  return { ...endpoints, geometry: result.geometry, distance: result.distance.meters,
    duration: result.duration.seconds, departure: Date.parse(result.calculatedAt),
    traffic: trafficLabel(result.traffic), trafficSegments: result.trafficSegments };
}

export function routeBounds(points: [number, number][]) {
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const [longitude, latitude] of points) {
    west = Math.min(west, longitude); east = Math.max(east, longitude);
    south = Math.min(south, latitude); north = Math.max(north, latitude);
  }
  return { ne: [east + (east === west ? 0.000001 : 0), north + (north === south ? 0.000001 : 0)], sw: [west - (east === west ? 0.000001 : 0), south - (north === south ? 0.000001 : 0)] };
}
