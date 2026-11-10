'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LocateFixed, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { PlaceInput } from '@/components/place-input';
import { Button, ErrorNotice, TrustNote } from '@/components/ui';
import { ResumeRide } from '@/components/resume-ride';
import { useRider } from '@/stores/rider';
import { useLocation } from '@/hooks/use-location';
import { resolveTripEndpoint } from '@/services/rider-route';
import { getRiderQuote } from '@/services/rider-quote';
import { errorMessage } from '@/lib/domain';
export default function PlanPage() {
  const router = useRouter();
  const pickup = useRider(state => state.pickup);
  const destination = useRider(state => state.destination);
  const activeRide = useRider(state => state.activeRide);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flight = useRef(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const location = useLocation();
  const hasActive = activeRide && !['cancelled', 'expired'].includes(activeRide.status.status);
  const quote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (flight.current || hasActive) return;
    flight.current = true; setBusy(true); setError(null);
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const [from, to] = await Promise.all([
        resolveTripEndpoint({ address: pickup.label, placeId: pickup.placeId, coordinates: pickup.coordinates }, controller.signal),
        resolveTripEndpoint({ address: destination.label, placeId: destination.placeId, coordinates: destination.coordinates }, controller.signal),
      ]);
      const result = await getRiderQuote({ pickup: from, destination: to }, controller.signal);
      if (controller.signal.aborted || useRider.getState().pickup !== pickup || useRider.getState().destination !== destination) return;
      useRider.getState().setQuote(result);
      router.push('/ride/estimate');
    } catch (cause) { if (!controller.signal.aborted) setError(errorMessage(cause)); }
    finally { clearTimeout(timeout); flight.current = false; setBusy(false); }
  };
  return <div className="animate-enter"><div className="mb-7"><p className="mb-2 text-[10px] tracking-[.15em] text-zinc-400 uppercase">Good to see you.</p><h1 className="text-[32px] font-medium leading-tight tracking-[-1.3px]">Where are we<br className="hidden lg:block" /> taking you?</h1><p className="mt-3 text-sm leading-6 text-zinc-500">A better everyday starts with a little less hassle.</p></div>
    <ResumeRide />
    <form onSubmit={quote} className="space-y-5">
      <fieldset disabled={busy || !!hasActive} className="space-y-5 disabled:opacity-60"><PlaceInput kind="pickup" /><div className="flex justify-end"><button type="button" onClick={location.locate} disabled={location.locating} className="-mt-1 inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-blue-600"><LocateFixed size={14} />{location.locating ? 'Finding your location…' : 'Use my current location'}</button></div><PlaceInput kind="destination" /></fieldset>
      <ErrorNotice message={error || location.error} />
      <Button type="submit" busy={busy} disabled={!pickup.label.trim() || !destination.label.trim() || !!hasActive} className="w-full">{busy ? 'Finding your estimate…' : 'See my estimate'}{!busy && <ArrowRight size={18} />}</Button>
      <TrustNote />
    </form>
    <div className="mt-9 border-t border-zinc-100 pt-6"><p className="mb-4 text-[11px] font-medium tracking-[.08em] text-zinc-400 uppercase">The Exact way</p><div className="grid gap-4"><Benefit icon={<Sparkles size={17} />} title="Your fare, upfront" text="Get an estimate before you request." /><Benefit icon={<ShieldCheck size={17} />} title="A little more peace of mind" text="Follow your driver with live location updates." /><Benefit icon={<MapPin size={17} />} title="Made for your everyday" text="On your way to work, home, or a good time." /></div></div>
    <p className="mt-7 text-center text-xs text-zinc-400">New here? <Link href="/ride/help" className="text-zinc-700 underline underline-offset-4">See how it works</Link></p>
  </div>;
}
function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f6f6f6] text-zinc-600">{icon}</div><div><p className="text-[13px] font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{text}</p></div></div>; }
