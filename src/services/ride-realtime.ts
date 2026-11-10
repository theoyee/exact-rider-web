import { io } from 'socket.io-client';
export type LiveDriverPosition = { latitude: number; longitude: number; receivedAt: string };
export function subscribeRideRealtime(requestId: string, token: string, callbacks: { onChange: () => void; onConnection: (connected: boolean) => void; onLocation: (point: LiveDriverPosition) => void }) {
  const origin = process.env.NEXT_PUBLIC_REALTIME_ORIGIN?.trim() || window.location.origin;
  const socket = io(origin, { auth: { role: 'rider', requestId, token }, transports: ['websocket'], reconnection: true });
  socket.on('connect', () => { callbacks.onConnection(true); callbacks.onChange(); });
  socket.on('disconnect', () => callbacks.onConnection(false));
  socket.on('connect_error', () => callbacks.onConnection(false));
  socket.on('ride:changed', (event: unknown) => {
    if (event && typeof event === 'object' && 'requestId' in event && event.requestId === requestId) callbacks.onChange();
  });
  socket.on('ride:driver-location', (event: unknown) => {
    if (!event || typeof event !== 'object') return;
    const value = event as Record<string, unknown>;
    if (value.requestId !== requestId || typeof value.latitude !== 'number' || typeof value.longitude !== 'number' || typeof value.receivedAt !== 'string' || !Number.isFinite(Date.parse(value.receivedAt)) || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) return;
    callbacks.onLocation({ latitude: value.latitude, longitude: value.longitude, receivedAt: value.receivedAt });
  });
  return () => { socket.removeAllListeners(); socket.disconnect(); };
}
