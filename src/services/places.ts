import { fetchWithTimeout } from '@/lib/http';
import type { Coordinates } from '@/lib/domain';
export type PlaceSuggestion = { placeId: string; label: string };
export async function searchPlaces(query: string, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  const response = await fetchWithTimeout(`/api/places?q=${encodeURIComponent(query)}`, { signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to search addresses.');
  return result.suggestions;
}
export async function getPlaceCoordinates(id: string, signal?: AbortSignal): Promise<Coordinates | null> {
  if (id.startsWith('mapbox:')) {
    const [longitude, latitude] = id.slice(7).split(',').map(Number);
    return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
  }
  const response = await fetchWithTimeout(`/api/places?id=${encodeURIComponent(id)}`, { signal });
  if (!response.ok) return null;
  const result = await response.json();
  return result.coordinates ?? null;
}
export async function reverseGeocode(point: Coordinates): Promise<string> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
  const query = new URLSearchParams({ latitude: String(point.latitude), longitude: String(point.longitude), access_token: token });
  try {
    const response = await fetchWithTimeout(`https://api.mapbox.com/search/geocode/v6/reverse?${query}`);
    const result = await response.json();
    return result.features?.[0]?.properties?.full_address || 'Current location';
  } catch { return 'Current location'; }
}
