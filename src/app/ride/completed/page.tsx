'use client';
import { EmptyState } from '@/components/ui';
import { useRider } from '@/stores/rider';
export default function CompletedPage() {
  const ride = useRider(state => state.activeRide);
  return <EmptyState title="Your journey, in real time." text="The ride service has not confirmed trip completion. Follow your current ride for the latest update." href={ride?.status.status === 'accepted' ? '/ride/track' : ride ? '/ride/search' : '/ride'} action={ride ? 'View my ride' : 'Plan a trip'} />;
}
