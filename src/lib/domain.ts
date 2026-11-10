export type Coordinates = { latitude: number; longitude: number };
export type Place = { label: string; placeId: string | null; coordinates: Coordinates | null };
export const emptyPlace = (): Place => ({ label: '', placeId: null, coordinates: null });
export const money = (minor: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);
export function validRider(name: string, email: string, phone: string) {
  return name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && /^(?:0\d{10}|\+?234\d{10})$/.test(phone.replace(/[\s()-]/g, ''));
}
export function distanceMeters(a: Coordinates, b: Coordinates) {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const d = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(d), Math.sqrt(Math.max(0, 1 - d)));
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase(); }
