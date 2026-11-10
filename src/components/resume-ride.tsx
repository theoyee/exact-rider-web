'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useRider } from '@/stores/rider';
import { useSessionReady } from './providers';
export function ResumeRide() {
  const ride = useRider(state => state.activeRide);
  const ready = useSessionReady();
  if (!ready || !ride || ride.status.status === 'cancelled' || ride.status.status === 'expired') return null;
  return <Link href={ride.status.status === 'accepted' ? '/ride/track' : '/ride/search'} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">You have an active ride. Continue <ArrowUpRight size={16} /></Link>;
}
