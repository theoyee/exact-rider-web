'use client';
import Link from 'next/link';
import { Banknote, CreditCard, ShieldCheck } from 'lucide-react';
import { EmptyState, PageHeading } from '@/components/ui';
import { useRider } from '@/stores/rider';
import { money } from '@/lib/domain';
export default function PaymentPage() {
  const ride = useRider(state => state.activeRide);
  if (!ride || ride.status.status !== 'accepted') return <EmptyState title="Your fare comes with your ride." text="Request a ride and wait for driver acceptance to see payment information." />;
  const amount = ride.status.acceptedFareMinor ?? ride.status.estimatedFareMinor ?? ride.status.knownSubtotalMinor;
  return <div className="animate-enter"><PageHeading title="Your ride, your fare." back="/ride/track" description="Keep your agreed fare in view." /><div className="rounded-2xl bg-blue-50 p-6 text-center"><p className="text-xs text-blue-700">Agreed fare</p><p className="mt-3 text-4xl font-medium tracking-tight text-blue-600">{money(amount)}</p><p className="mt-3 text-xs text-zinc-500">Payment not confirmed</p></div><div className="mt-6 space-y-3">{[{ Icon: Banknote, label: 'Bank transfer' }, { Icon: CreditCard, label: 'Card payment' }].map(({ Icon, label }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-zinc-100 p-4 text-zinc-400"><Icon size={20} /><p className="flex-1 text-sm">{label}</p><span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px]">Coming soon</span></div>)}</div><div role="status" className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800"><ShieldCheck size={18} className="mt-1 shrink-0" />Online payments are not yet enabled by the ride service. No payment has been collected or confirmed through this page.</div><Link href="/ride/track" className="button mt-6 w-full bg-black text-white">Back to my ride</Link></div>;
}
