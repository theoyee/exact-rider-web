'use client';
import { Clock3, MapPin, Route } from 'lucide-react';
import { useRider } from '@/stores/rider';
export function TripSummary({ compact = false }: { compact?: boolean }) {
  const pickup = useRider(state => state.pickup.label);
  const destination = useRider(state => state.destination.label);
  const route = useRider(state => state.quote?.route);
  return <div className={`rounded-2xl border border-zinc-100 bg-zinc-50 ${compact ? 'p-4' : 'p-5'}`}>
    <div className="relative grid gap-6"><div className="absolute top-4 bottom-4 left-[9px] border-l border-dashed border-zinc-300" /><Location label="Pick up" address={pickup} /><Location label="Drop off" address={destination} blue /></div>
    {route && <div className="mt-5 flex items-center gap-2 border-t border-zinc-200/70 pt-4 text-xs text-zinc-500"><Route size={13} /><span>{(route.distance / 1000).toFixed(1)} km</span><span className="mx-1">·</span><Clock3 size={13} /><span>{Math.ceil(route.duration / 60)} min</span><span className="ml-auto text-[10px]">Traffic: {route.traffic}</span></div>}
  </div>;
}
function Location({ label, address, blue }: { label: string; address: string; blue?: boolean }) { return <div className="relative flex items-center gap-3"><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${blue ? 'bg-blue-600' : 'bg-black'} text-white`}><MapPin size={11} /></span><div className="min-w-0"><p className="text-[10px] text-zinc-400">{label}</p><p className="mt-1 text-[13px] leading-5">{address || 'Not selected'}</p></div></div>; }
