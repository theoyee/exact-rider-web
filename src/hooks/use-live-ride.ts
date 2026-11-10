'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRider } from '@/stores/rider';
import { getGuestRideStatus, acceptDriverCounter, counterDriverOffer, cancelGuestRideRequest } from '@/services/guest-ride';
import { subscribeRideRealtime, type LiveDriverPosition } from '@/services/ride-realtime';
import { errorMessage } from '@/lib/domain';
export function useLiveRide() {
  const requestId = useRider(state => state.activeRide?.requestId);
  const token = useRider(state => state.activeRide?.actionToken);
  const status = useRider(state => state.activeRide?.status);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<{ requestId: string; connected: boolean } | null>(null);
  const connected = !!connection && connection.requestId === requestId && connection.connected;
  const [gps, setGps] = useState<{ requestId: string; position: LiveDriverPosition } | null>(null);
  const position = gps && gps.requestId === requestId ? gps.position : null;
  const mutation = useRef(false);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!requestId || !token) return;
    let alive = true, loading = false, queued = false, shouldPoll = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      if (loading) { queued = true; return; }
      loading = true; clearTimeout(timer);
      try {
        const result = await getGuestRideStatus(requestId);
        if (alive) { useRider.getState().updateStatus(result); setError(null); shouldPoll = !['cancelled', 'expired'].includes(result.status); }
      } catch (cause) { if (alive) setError(errorMessage(cause)); }
      finally {
        loading = false;
        if (alive) {
          if (queued) { queued = false; void load(); }
          else if (shouldPoll) timer = setTimeout(() => void load(), document.visibilityState === 'visible' ? 5000 : 20000);
        }
      }
    };
    refreshRef.current = () => void load();
    void load();
    const off = subscribeRideRealtime(requestId, token, {
      onChange: () => { if (alive) void load(); },
      onConnection: next => { if (alive) setConnection({ requestId, connected: next }); },
      onLocation: next => {
        if (!alive) return;
        setGps(previous => !previous || previous.requestId !== requestId || Date.parse(next.receivedAt) > Date.parse(previous.position.receivedAt) ? { requestId, position: next } : previous);
      },
    });
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; clearTimeout(timer); off(); document.removeEventListener('visibilitychange', onVisible); };
  }, [requestId, token]);
  const act = useCallback(async (kind: 'accept' | 'counter' | 'cancel', fareMinor?: number) => {
    if (!requestId || !token || mutation.current) return false;
    mutation.current = true; setBusy(true); setError(null);
    try {
      const result = kind === 'accept' ? await acceptDriverCounter(requestId, token)
        : kind === 'counter' ? await counterDriverOffer(requestId, token, fareMinor ?? 0)
        : await cancelGuestRideRequest(requestId, token);
      useRider.getState().updateStatus(result);
      return result.status === 'cancelled' || kind !== 'cancel';
    } catch (cause) { setError(errorMessage(cause)); return false; }
    finally { mutation.current = false; setBusy(false); }
  }, [requestId, token]);
  return { status, error, busy, connected, position, act, retry: () => refreshRef.current() };
}
