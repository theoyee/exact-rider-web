'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CarFront, Clock3, Minus, Plus, Radio, Send } from 'lucide-react';
import { useRideContext } from '@/components/ride-shell';
import { Button, EmptyState, ErrorNotice, PageHeading } from '@/components/ui';
import { TripSummary } from '@/components/trip-summary';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useRider } from '@/stores/rider';
import { useClock } from '@/hooks/use-clock';
import { money } from '@/lib/domain';
export default function SearchPage() {
  const ride = useRideContext();
  const active = useRider(state => state.activeRide);
  const quote = useRider(state => state.quote);
  const router = useRouter();
  const now = useClock();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [offer, setOffer] = useState(() => Math.round((active?.status.counterFareMinor ?? active?.status.estimatedFareMinor ?? active?.status.knownSubtotalMinor ?? 0) / 100));
  useEffect(() => { if (ride.status?.status === 'accepted') router.replace('/ride/track'); }, [ride.status?.status, router]);
  if (!active || !ride.status) return <EmptyState title="No ride request yet." text="Plan your trip and send a request to find an available driver." />;
  const status = ride.status;
  const ended = status.status === 'cancelled' || status.status === 'expired';
  const seconds = status.offerExpiresAt ? Math.max(0, Math.ceil((Date.parse(status.offerExpiresAt) - now - (quote?.serverClockOffsetMs ?? 0)) / 1000)) : null;
  const baseFare = status.acceptedFareMinor ?? status.estimatedFareMinor ?? status.knownSubtotalMinor;
  return <div className="animate-enter"><PageHeading title={ended ? status.status === 'cancelled' ? 'Your request is cancelled.' : 'This request has expired.' : status.status === 'countered' ? 'A new offer for your ride.' : 'Good things are on the way.'} description={ended ? 'You can plan another trip whenever you’re ready.' : 'We’re connecting you with an available driver nearby.'} />
    {!ended && status.status !== 'countered' && <div className="relative mx-auto my-9 grid h-40 w-40 place-items-center"><span className="radar-ring inset-0" /><span className="radar-ring inset-0" /><span className="radar-ring inset-0" /><div className="relative grid h-20 w-20 place-items-center rounded-full border-[6px] border-white bg-blue-50 text-blue-600 shadow-md shadow-blue-100"><CarFront size={34} /></div></div>}
    {!ended && <div className="mb-5 flex items-center justify-center gap-2 text-xs text-zinc-500"><Radio size={14} className="text-blue-600" />{ride.connected ? 'Live updates are connected' : 'Checking for driver updates…'}</div>}
    {status.searchMode === 'development_simulation' && <div role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">The connected backend is in development simulation mode. This is not a real driver booking.</div>}
    {status.searchMode === 'unavailable' && <ErrorNotice message="Driver search is currently unavailable. You can cancel this request and try again later." />}
    {status.status === 'countered' && <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-5"><p className="text-xs text-blue-700">Driver’s counter offer</p><p className="mt-2 text-4xl font-medium tracking-tight text-blue-600">{money(status.counterFareMinor ?? baseFare)}</p><p className="mt-2 text-xs leading-5 text-zinc-500">Accept this offer or suggest a different fare.</p><Button busy={ride.busy} disabled={seconds === 0} onClick={() => void ride.act('accept')} className="mt-4 w-full">Accept {money(status.counterFareMinor ?? baseFare)}<ArrowRight size={17} /></Button></div>}
    <TripSummary compact />
    <div className="mt-5 flex items-center justify-between text-sm"><span className="text-zinc-500">Your requested fare</span><strong className="font-medium">{money(baseFare)}</strong></div>
    {!ended && seconds !== null && <p aria-live="polite" className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400"><Clock3 size={13} />{seconds ? `Offer expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'Offer expired. Waiting for the latest request status.'}</p>}
    {!ended && status.status !== 'accepted' && <div className="mt-6 rounded-xl border border-zinc-200 p-4"><label htmlFor="counter-fare" className="mb-3 block text-xs text-zinc-500">Want to suggest a different fare?</label><div className="flex items-center gap-2"><button aria-label="Decrease offer" disabled={ride.busy || offer <= 100} onClick={() => setOffer(value => Math.max(100, value - 100))} className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600"><Minus size={16} /></button><span className="text-zinc-400">₦</span><input id="counter-fare" type="number" min={1} max={1000000} step={1} inputMode="numeric" value={offer || ''} onChange={event => setOffer(Number(event.target.value))} className="h-10 min-w-0 flex-1 border-b border-zinc-200 bg-transparent text-center text-lg font-medium outline-none" /><button aria-label="Increase offer" disabled={ride.busy} onClick={() => setOffer(value => value + 100)} className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600"><Plus size={16} /></button><button aria-label="Send counter offer" disabled={ride.busy || !Number.isSafeInteger(offer) || offer <= 0 || offer > 1000000 || seconds === 0} onClick={() => void ride.act('counter', offer * 100)} className="grid h-10 w-10 place-items-center rounded-full bg-black text-white"><Send size={16} /></button></div></div>}
    <ErrorNotice message={ride.error} onRetry={ride.retry} />
    {ended ? <Button onClick={() => { useRider.getState().reset(); router.replace('/ride'); }} className="mt-6 w-full">Plan another trip<ArrowRight size={17} /></Button> : <button onClick={() => setCancelOpen(true)} disabled={ride.busy || status.status === 'accepted'} className="mt-6 block w-full py-3 text-center text-sm text-red-600">Cancel request</button>}
    <Link href="/ride/help" className="mt-2 block py-3 text-center text-xs text-zinc-400">Need a hand?</Link>
    <ConfirmDialog open={cancelOpen} title="Cancel your request?" confirmLabel="Cancel request" busy={ride.busy} onClose={() => setCancelOpen(false)} onConfirm={() => void ride.act('cancel').then(cancelled => { if (cancelled) setCancelOpen(false); })}>Your request will be cancelled with the ride service. You can always plan another trip.</ConfirmDialog>
  </div>;
}
