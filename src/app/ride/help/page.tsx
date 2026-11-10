'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Copy, LifeBuoy, Mail } from 'lucide-react';
import { PageHeading } from '@/components/ui';
import { useRider } from '@/stores/rider';
const topics = [
  { title: 'How do I book a ride?', text: 'Enter your pickup and destination, review the live fare estimate, then add your contact details. We’ll send your request to nearby available drivers. Your ride is confirmed after a driver accepts.' },
  { title: 'Can I suggest a different fare?', text: 'Yes. While your request is open, use the offer controls to send a different amount. If a driver counters, you can accept their offer or propose another fare.' },
  { title: 'Why did my estimate expire?', text: 'Estimates are valid for a limited time because availability and traffic change. Return to your estimate and refresh it to get the current fare.' },
  { title: 'I can’t find my driver.', text: 'Check the live location on the tracking map. Location updates may be delayed if your driver loses connection. Phone and messaging will be available when the ride service provides driver contact details.' },
  { title: 'How do I cancel my request?', text: 'Open your pending request, select Cancel request, and confirm. Cancellation is only complete after the ride service confirms it. For an already accepted trip, contact support; accepted-trip cancellation is not yet exposed by the service.' },
  { title: 'When will I be charged?', text: 'Submitting a request does not charge your account. Payment confirmation is not yet connected to the web flow. Never consider a transfer paid until it has been confirmed by the payment provider.' },
];
export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const ride = useRider(state => state.activeRide);
  return <div className="animate-enter"><PageHeading title="A little help, right here." back={ride ? ride.status.status === 'accepted' ? '/ride/track' : '/ride/search' : '/ride'} description="From your first booking to getting there. We’ve got the basics covered." />
    <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[#fff6e4] p-4"><LifeBuoy size={26} className="shrink-0 text-amber-700" /><p className="text-xs leading-5 text-zinc-600">If you feel unsafe, move to a safe place and contact local emergency services.</p></div>
    <h2 className="mb-3 text-xs font-medium tracking-[.1em] text-zinc-400 uppercase">Your questions, answered</h2><div className="divide-y divide-zinc-100">{topics.map((topic, index) => <div key={topic.title}><button onClick={() => setOpen(current => current === index ? null : index)} aria-expanded={open === index} aria-controls={`topic-${index}`} className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium">{topic.title}<ChevronDown size={16} className={`shrink-0 text-zinc-400 transition-transform ${open === index ? 'rotate-180' : ''}`} /></button><div id={`topic-${index}`} hidden={open !== index} className="pb-5 pr-5 text-xs leading-6 text-zinc-500">{topic.text}</div></div>)}</div>
    <div className="mt-7 rounded-2xl bg-zinc-50 p-5"><Mail size={21} className="mb-3" /><h2 className="text-base font-medium">Need a human?</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Email the Exact support team and include your request reference.</p><a href={`mailto:support@exact.com${ride ? `?subject=${encodeURIComponent('Ride support: ' + ride.requestId)}` : ''}`} className="mt-4 flex items-center justify-between text-sm text-blue-600">support@exact.com<ArrowRight size={16} /></a>{ride && <button onClick={() => void navigator.clipboard.writeText(ride.requestId).then(() => setCopied(true)).catch(() => setCopied(false))} className="mt-4 flex items-center gap-2 text-xs text-zinc-500">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Reference copied' : 'Copy request reference'}</button>}</div>
    <Link href={ride ? ride.status.status === 'accepted' ? '/ride/track' : '/ride/search' : '/ride'} className="button mt-6 w-full bg-black text-white">{ride ? 'Back to my ride' : 'Let’s get you moving'}<ArrowRight size={17} /></Link>
  </div>;
}
