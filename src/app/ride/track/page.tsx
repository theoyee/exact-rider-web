'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CarFront, Check, CircleHelp, Copy, MessageCircle, Phone, Share2 } from 'lucide-react';
import { useRideContext } from '@/components/ride-shell';
import { Button, EmptyState, ErrorNotice, PageHeading } from '@/components/ui';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TripSummary } from '@/components/trip-summary';
import { useRider } from '@/stores/rider';
import { distanceMeters, errorMessage, initials, money } from '@/lib/domain';
import { useClock } from '@/hooks/use-clock';
export default function TrackPage() {
  const ride = useRideContext();
  const quote = useRider(state => state.quote);
  const [contact, setContact] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const arrivalSoundPlayed = useRef(false);
  const now = useClock();
  const positionFresh = ride.position && now - Date.parse(ride.position.receivedAt) < 60000;
  const arrived = !!positionFresh && !!quote && !!ride.position && distanceMeters(ride.position, quote.route.pickup) <= 60;
  useEffect(() => {
    if (!arrived || arrivalSoundPlayed.current) return;
    arrivalSoundPlayed.current = true;
    const audio = new Audio('/sounds/rider-arrival.wav');
    void audio.play().catch(() => { /* Browser autoplay restrictions do not interrupt tracking. */ });
    return () => audio.pause();
  }, [arrived]);
  if (!ride.status) return <EmptyState title="Your ride starts here." text="Request a ride before opening live tracking." />;
  if (ride.status.status !== 'accepted') return <EmptyState title="Let’s check your request." text="Live tracking becomes available after a driver accepts your ride." href="/ride/search" action="View my request" />;
  const name = ride.status.acceptedDriverName || 'Your driver';
  const firstName = name.split(' ')[0];
  const fare = ride.status.acceptedFareMinor ?? ride.status.estimatedFareMinor ?? ride.status.knownSubtotalMinor;
  const share = async () => {
    if (!quote) return;
    const { pickup, destination } = quote.route;
    const url = `https://www.openstreetmap.org/directions?route=${pickup.latitude},${pickup.longitude};${destination.latitude},${destination.longitude}`;
    try {
      if (navigator.share) await navigator.share({ title: 'My Exact trip', text: `My Exact trip with ${name}.`, url });
      else { await navigator.clipboard.writeText(url); setNotice('Your route link was copied.'); }
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setNotice(errorMessage(cause)); }
  };
  return <div className="animate-enter"><PageHeading title={arrived ? `${firstName} is here!` : `${firstName} is on the way.`} back="/" eyebrow="RIDE CONFIRMED" description={arrived ? 'Your driver’s location is near your pickup. Look out for them.' : 'A little closer to where you need to be.'} />
    <div className="mb-6 flex items-center justify-between rounded-2xl bg-[#eff8f3] px-4 py-3.5"><span className="flex items-center gap-2 text-xs text-green-800"><Check size={15} />Your ride has been accepted</span><span className="h-2 w-2 rounded-full bg-green-500" /></div>
    <div className="mb-6 flex items-center gap-3"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e3ebf7] text-lg font-medium text-blue-700">{initials(name)}</span><div className="flex-1"><h2 className="text-lg font-medium">{name}</h2><p className="mt-1 text-xs text-zinc-400">Your Exact driver</p></div><button aria-label="Call driver" onClick={() => setContact('Call your driver')} className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700"><Phone size={17} /></button><button aria-label="Message driver" onClick={() => setContact('Message your driver')} className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700"><MessageCircle size={18} /></button></div>
    <div className="mb-5 flex items-center justify-between border-y border-zinc-100 py-5"><div><p className="text-xs text-zinc-400">Agreed fare</p><p className="mt-1 text-3xl font-medium tracking-tight text-blue-600">{money(fare)}</p></div><span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] text-zinc-500">Payment not confirmed</span></div>
    <TripSummary compact />
    <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50/70 p-3.5 text-xs leading-5 text-blue-800"><CarFront size={17} className="mt-0.5 shrink-0" /><p>{ride.position ? positionFresh ? 'The map shows your driver’s latest GPS location.' : 'Your driver’s last location is over a minute old. Waiting for an update.' : 'Waiting for your driver’s first GPS update. The route stays visible while you wait.'}</p></div>
    <ErrorNotice message={ride.error} onRetry={ride.retry} />
    {notice && <p role="status" className="mt-4 text-center text-xs text-blue-700">{notice}</p>}
    <div className="mt-5 grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => void share()}><Share2 size={16} />Share route</Button><Link href="/ride/help" className="button border border-zinc-200"><CircleHelp size={16} />Get help</Link></div>
    <Link href="/ride/payment" className="mt-4 block rounded-xl bg-zinc-50 p-4 text-center text-sm text-zinc-600">View payment information</Link>
    <p className="mt-5 text-center text-[11px] leading-5 text-zinc-400">Trip start and completion will appear when supported by the ride service.</p>
    <ConfirmDialog open={!!contact} title={contact || ''} onClose={() => setContact(null)}>Your driver’s phone and chat details are not yet provided by the ride service. This feature will be available when contact integration is enabled.<div className="mt-3 flex items-center gap-2 text-xs"><Copy size={13} />Keep your request reference for support.</div></ConfirmDialog>
  </div>;
}
