'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CarFront, Clock3, ShieldCheck } from 'lucide-react';
import { useRider } from '@/stores/rider';
import { Button, EmptyState, ErrorNotice, PageHeading } from '@/components/ui';
import { TripSummary } from '@/components/trip-summary';
import { useClock } from '@/hooks/use-clock';
import { getRiderQuote, remainingQuoteSeconds, formatQuoteCountdown, validateRiderQuote } from '@/services/rider-quote';
import { errorMessage, money } from '@/lib/domain';
export default function EstimatePage() {
  const router = useRouter();
  const quote = useRider(state => state.quote);
  const now = useClock();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  if (!quote) return <EmptyState title="Let’s plan your trip first." text="Choose your pickup and destination to get an estimate for your journey." />;
  const remaining = remainingQuoteSeconds(quote, now);
  const complete = quote.status === 'complete';
  const proceed = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      if (!remaining || await validateRiderQuote(quote.quoteId) === 'expired') { setError('Your estimate expired. Refresh it before continuing.'); return; }
      router.push('/ride/details');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const refresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try { useRider.getState().setQuote(await getRiderQuote(quote.route, AbortSignal.timeout(15000))); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <div className="animate-enter"><PageHeading title="A fair fare. Upfront." description="Here’s your estimate. A little more clarity before you go." />
    <div className="mb-5 flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-5"><span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-blue-600"><CarFront size={26} /></span><div className="flex-1"><p className="text-sm font-medium">Exact Standard</p><p className="mt-1 text-xs text-zinc-500">An everyday ride, done right.</p></div></div>
    <div className="mb-6 flex items-end justify-between"><div><p className="text-xs text-zinc-400">{complete ? 'Price estimate' : 'Known cost subtotal'}</p><p className="mt-2 text-[38px] font-medium leading-none tracking-[-1.5px] text-blue-600">{money(quote.estimatedFareMinor ?? quote.knownSubtotalMinor)}</p></div><span className="mb-1 text-xs text-zinc-400">NGN</span></div>
    <TripSummary />
    <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck size={15} className="text-green-600" />Your driver and fare are confirmed after acceptance.</div>
    {!complete && <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">This is a subtotal; some charges are still being calculated. Continue to enter your details and request a driver. The ride service will confirm whether this estimate can be requested.</p>}
    <div aria-live="polite" className={`my-6 flex items-center justify-center gap-2 rounded-lg py-3 text-xs ${remaining ? 'bg-zinc-50 text-zinc-500' : 'bg-amber-50 text-amber-800'}`}><Clock3 size={14} />{remaining ? <>This estimate expires in <strong className="text-zinc-800">{formatQuoteCountdown(remaining)}</strong></> : 'This estimate has expired.'}</div>
    <ErrorNotice message={error} />
    {remaining ? <Button busy={busy} onClick={() => void proceed()} className="w-full">Continue<ArrowRight size={18} /></Button> : <Button busy={busy} onClick={() => void refresh()} className="w-full">Refresh estimate</Button>}
    <Link href="/ride" className="mt-4 block py-2 text-center text-xs text-zinc-500 underline underline-offset-4">Edit trip locations</Link>
  </div>;
}
