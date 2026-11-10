'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpLeft, Clock3, LoaderCircle, MapPin, X } from 'lucide-react';
import { useRider } from '@/stores/rider';
import { searchPlaces, type PlaceSuggestion } from '@/services/places';
export function PlaceInput({ kind }: { kind: 'pickup' | 'destination' }) {
  const place = useRider(state => state[kind]);
  const setPlace = useRider(state => state.setPlace);
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null);
  const loading = focused && loadingQuery === place.label && !place.placeId && !place.coordinates;
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(-1);
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focused || place.placeId || place.coordinates || !place.label.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoadingQuery(place.label); setError(null);
      void searchPlaces(place.label, controller.signal).then(results => { if (!controller.signal.aborted) setResults(results); }).catch(() => {
        if (!controller.signal.aborted) { setResults([]); setError('Address search is unavailable. You can still enter a full address.'); }
      }).finally(() => { if (!controller.signal.aborted) setLoadingQuery(null); });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [focused, place]);
  const choose = (result: PlaceSuggestion) => { setPlace(kind, { label: result.label, placeId: result.placeId, coordinates: null }); setFocused(false); setResults([]); setSelected(-1); };
  const open = focused && !!place.label.trim() && !place.placeId && !place.coordinates;
  return <div ref={container} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <label htmlFor={id} className="mb-2 block text-xs font-medium text-zinc-500">{kind === 'pickup' ? 'Pick up' : 'Destination'}</label>
    <div className={`flex h-[60px] items-center gap-3 rounded-xl border px-4 transition ${focused ? 'border-blue-600 bg-white ring-3 ring-blue-50' : 'border-zinc-200 bg-zinc-50'}`}>
      <span className={`grid h-5 w-5 shrink-0 place-items-center ${kind === 'pickup' ? 'rounded-full bg-black' : 'rounded-[5px] bg-blue-600'} text-white`}><MapPin size={12} /></span>
      <input id={id} role="combobox" aria-expanded={open} aria-controls={`${id}-results`} aria-autocomplete="list" aria-activedescendant={selected >= 0 ? `${id}-${selected}` : undefined} autoComplete="off" value={place.label} onFocus={() => setFocused(true)} onChange={event => { setPlace(kind, { label: event.target.value, placeId: null, coordinates: null }); setResults([]); setSelected(-1); }} placeholder={kind === 'pickup' ? 'Enter pickup address' : 'Where are you headed?'} className="min-w-0 flex-1 bg-transparent text-sm outline-none" onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(value => Math.min(results.length - 1, value + 1)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(value => Math.max(0, value - 1)); }
        if (event.key === 'Escape') setFocused(false);
        if (event.key === 'Enter' && selected >= 0 && results[selected]) { event.preventDefault(); choose(results[selected]); }
      }} />
      {loading && <LoaderCircle size={16} className="animate-spin text-zinc-400" />}
      {place.label && !loading && <button type="button" aria-label={`Clear ${kind}`} className="-mr-2 p-2 text-zinc-400" onClick={() => { setPlace(kind, { label: '', placeId: null, coordinates: null }); setResults([]); }}><X size={15} /></button>}
    </div>
    {open && <div id={`${id}-results`} role="listbox" aria-label={`${kind} suggestions`} className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-950/10">
      {results.map((result, index) => <button key={result.placeId} id={`${id}-${index}`} type="button" role="option" aria-selected={selected === index} onClick={() => choose(result)} className={`flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left text-sm hover:bg-blue-50 ${selected === index ? 'bg-blue-50' : ''}`}><Clock3 size={15} className="shrink-0 text-zinc-400" /><span className="flex-1">{result.label}</span><ArrowUpLeft size={14} className="text-zinc-400" /></button>)}
      {!loading && !results.length && <p className="px-4 py-3 text-xs leading-5 text-zinc-500">{error || 'Enter a full address or select a search result. You can also use latitude, longitude.'}</p>}
    </div>}
  </div>;
}
