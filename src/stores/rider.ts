'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { RiderQuote } from '@/services/rider-quote';
import type { GuestRideStatus } from '@/services/guest-ride';
import { emptyPlace, type Place } from '@/lib/domain';
export type RiderCoordinates = { latitude: number; longitude: number };
export type ActiveRide = { requestId: string; actionToken: string; status: GuestRideStatus };
type RiderState = {
  pickup: Place; destination: Place; quote: RiderQuote | null; activeRide: ActiveRide | null;
  setPlace: (kind: 'pickup' | 'destination', place: Place) => void;
  setQuote: (quote: RiderQuote | null) => void;
  setActiveRide: (ride: ActiveRide | null) => void;
  updateStatus: (status: GuestRideStatus) => void;
  reset: () => void;
};
export const useRider = create<RiderState>()(persist((set) => ({
  pickup: emptyPlace(), destination: emptyPlace(), quote: null, activeRide: null,
  setPlace: (kind, place) => set({ [kind]: place, quote: null }),
  setQuote: quote => set({ quote }),
  setActiveRide: activeRide => set({ activeRide }),
  updateStatus: status => set(state => state.activeRide?.requestId === status.requestId
    ? { activeRide: { ...state.activeRide, status } } : state),
  reset: () => set({ destination: emptyPlace(), quote: null, activeRide: null }),
}), {
  name: 'exact-rider-session-v1', version: 1,
  storage: createJSONStorage(() => sessionStorage), skipHydration: true,
  partialize: state => ({ pickup: state.pickup, destination: state.destination, quote: state.quote, activeRide: state.activeRide }),
}));
