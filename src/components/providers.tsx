'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRider } from '@/stores/rider';
const SessionReady = createContext(false);
export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { void Promise.resolve(useRider.persist.rehydrate()).finally(() => setReady(true)); }, []);
  return <SessionReady.Provider value={ready}>{children}</SessionReady.Provider>;
}
export const useSessionReady = () => useContext(SessionReady);
