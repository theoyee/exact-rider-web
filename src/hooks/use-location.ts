'use client';
import { useEffect, useRef, useState } from 'react';
import { reverseGeocode } from '@/services/places';
import { useRider } from '@/stores/rider';
export function useLocation() {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(0);
  useEffect(() => () => { active.current++; }, []);
  const locate = () => {
    if (locating) return;
    if (!navigator.geolocation) { setError('Location is unavailable in this browser. Enter your pickup address.'); return; }
    setLocating(true); setError(null);
    const request = ++active.current;
    const before = useRider.getState().pickup;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      if (request !== active.current) return;
      const coordinates = { latitude: coords.latitude, longitude: coords.longitude };
      if (useRider.getState().pickup !== before) { setLocating(false); return; }
      const next = { label: 'Current location', placeId: null, coordinates };
      useRider.getState().setPlace('pickup', next);
      setLocating(false);
      const label = await reverseGeocode(coordinates);
      if (useRider.getState().pickup === next) useRider.getState().setPlace('pickup', { ...next, label });
    }, cause => {
      setLocating(false);
      setError(cause.code === 1 ? 'Location access was denied. Enter your pickup address or allow location in browser settings.' : 'We couldn’t find your location. Try again or enter your pickup address.');
    }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 });
  };
  return { locate, locating, error };
}
