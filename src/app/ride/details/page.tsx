'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, Phone, UserRound } from 'lucide-react';
import { Button, EmptyState, ErrorNotice, PageHeading, TrustNote } from '@/components/ui';
import { useRider } from '@/stores/rider';
import { validRider, money, errorMessage } from '@/lib/domain';
import { createGuestRideRequest } from '@/services/guest-ride';
import { remainingQuoteSeconds, validateRiderQuote } from '@/services/rider-quote';
import { useClock } from '@/hooks/use-clock';
export default function DetailsPage() {
  const quote = useRider(state => state.quote);
  const activeRide = useRider(state => state.activeRide);
  const router = useRouter();
  const now = useClock();
  const [details, setDetails] = useState({ fullName: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  if (activeRide && !['cancelled', 'expired'].includes(activeRide.status.status)) return <EmptyState title="Your ride is already in motion." text="Continue your active request instead of submitting a second one." href={activeRide.status.status === 'accepted' ? '/ride/track' : '/ride/search'} action="Continue my ride" />;
  if (!quote) return <EmptyState title="Start with your trip." text="Choose where you’re going and get an estimate before entering your details." />;
  const expired = remainingQuoteSeconds(quote, now) === 0;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || expired || !validRider(details.fullName, details.email, details.phone) || quote.status !== 'complete') return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      if (await validateRiderQuote(quote.quoteId) === 'expired') { setError('Your estimate expired. Go back and refresh it.'); return; }
      const result = await createGuestRideRequest({ quoteId: quote.quoteId, ...details });
      useRider.getState().setActiveRide({ requestId: result.requestId, actionToken: result.actionToken, status: result });
      if (mounted.current) router.replace(result.status === 'accepted' ? '/ride/track' : '/ride/search');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <div className="animate-enter"><PageHeading title="Let’s make it your ride." back="/ride/estimate" description="A few details so your driver knows who to look out for." />
    <div className="mb-7 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3.5 text-sm"><span className="text-zinc-600">Your estimate</span><strong className="font-medium text-blue-600">{money(quote.estimatedFareMinor ?? quote.knownSubtotalMinor)}</strong></div>
    <form onSubmit={submit} className="space-y-5"><fieldset disabled={busy} className="space-y-5">{([{ key: 'fullName', label: 'Full name', placeholder: 'Your first and last name', type: 'text', autoComplete: 'name', Icon: UserRound }, { key: 'email', label: 'Email address', placeholder: 'you@example.com', type: 'email', autoComplete: 'email', Icon: Mail }, { key: 'phone', label: 'Phone number', placeholder: '0801 234 5678', type: 'tel', autoComplete: 'tel', Icon: Phone }] as const).map(({ key, label, placeholder, type, autoComplete, Icon }) => <label key={key} className="block"><span className="mb-2 block text-xs font-medium text-zinc-500">{label}</span><div className="relative"><Icon size={17} className="absolute top-[18px] left-4 text-zinc-400" /><input required maxLength={key === 'fullName' ? 100 : 160} type={type} autoComplete={autoComplete} value={details[key]} placeholder={placeholder} onChange={event => setDetails(current => ({ ...current, [key]: event.target.value }))} className="field pl-11" /></div></label>)}</fieldset>
      <p className="text-xs leading-5 text-zinc-400">Your details are shared with the ride service to arrange your trip. Phone numbers must be Nigerian numbers.</p>
      {expired && <ErrorNotice message="Your estimate has expired. Refresh it before requesting a driver." />}
      <ErrorNotice message={error} />
      <Button type="submit" busy={busy} disabled={expired || quote.status !== 'complete' || !validRider(details.fullName, details.email, details.phone)} className="w-full">{busy ? 'Sending your request…' : 'Find my driver'}{!busy && <ArrowRight size={18} />}</Button>
      {expired && <Link href="/ride/estimate" className="block text-center text-sm text-blue-600">Refresh estimate</Link>}
      <TrustNote />
    </form>
  </div>;
}
