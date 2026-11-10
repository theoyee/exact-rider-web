'use client';
import { createContext, useContext } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleHelp, ShieldCheck } from 'lucide-react';
import { Brand } from './ui';
import { useSessionReady } from './providers';
import { useLiveRide } from '@/hooks/use-live-ride';
const RideMap = dynamic(() => import('./ride-map'), { ssr: false, loading: () => <div className="h-full animate-pulse bg-[#e8edeb]" /> });
const RideContext = createContext<ReturnType<typeof useLiveRide> | null>(null);
export const useRideContext = () => { const context = useContext(RideContext); if (!context) throw new Error('Ride screens require RideShell'); return context; };
export function RideShell({ children }: { children: React.ReactNode }) {
  const ready = useSessionReady();
  const ride = useLiveRide();
  const path = usePathname();
  const stage = path === '/ride' ? 0 : path === '/ride/estimate' ? 1 : path === '/ride/details' ? 2 : 3;
  return <RideContext.Provider value={ride}><div className="min-h-svh bg-white lg:h-svh lg:overflow-hidden">
    <header className="relative z-20 flex h-[76px] items-center justify-between border-b border-zinc-100 bg-white px-5 sm:px-8 lg:px-10"><Brand /><div className="hidden items-center gap-10 text-sm md:flex"><Link href="/ride" className="font-medium">Book a ride</Link><Link href="/ride/help" className="text-zinc-500 hover:text-black">Help & support</Link></div><Link href="/ride/help" className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2.5 text-xs font-medium"><CircleHelp size={16} /><span>Need help?</span></Link></header>
    <div className="flex flex-col lg:h-[calc(100svh-76px)] lg:flex-row">
      <main id="main-content" className="order-2 flex w-full shrink-0 flex-col bg-white lg:order-1 lg:w-[440px] lg:overflow-y-auto xl:w-[480px]">
        <div className="flex gap-1.5 px-6 pt-5 sm:px-8">{['Your trip', 'Estimate', 'Your details', 'On your way'].map((label, index) => <div key={label} className="flex-1"><div className={`mb-2 h-[3px] rounded-full ${index <= stage ? 'bg-zinc-950' : 'bg-zinc-100'}`} /><span className={`text-[10px] ${index === stage ? 'font-medium text-zinc-900' : 'text-zinc-400'}`}>{label}</span></div>)}</div>
        <div className="flex-1 px-6 pt-6 pb-7 sm:px-8">{ready ? children : <div className="grid min-h-60 place-items-center text-sm text-zinc-500" role="status">Restoring your trip…</div>}</div>
        <footer className="mt-auto flex items-center justify-between border-t border-zinc-100 px-6 py-5 text-[11px] text-zinc-400 sm:px-8"><span>© {new Date().getFullYear()} Exact</span><span className="flex items-center gap-1.5"><ShieldCheck size={13} />Made for your everyday</span></footer>
      </main>
      <aside aria-label="Map and route" className="relative order-1 h-[29svh] min-h-[200px] overflow-hidden lg:order-2 lg:h-full lg:min-h-0 lg:flex-1"><RideMap position={ride.position} /></aside>
    </div>
  </div></RideContext.Provider>;
}
