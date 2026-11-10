'use client';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import { useRider } from '@/stores/rider';
import type { LiveDriverPosition } from '@/services/ride-realtime';
export default function RideMap({ position }: { position: LiveDriverPosition | null }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const leaflet = useRef<typeof Leaflet | null>(null);
  const overlays = useRef<Leaflet.LayerGroup | null>(null);
  const driver = useRef<Leaflet.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const quote = useRider(state => state.quote);
  const pickup = useRider(state => state.pickup.coordinates);
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver;
    let timeout: ReturnType<typeof setTimeout>;
    void import('leaflet').then(L => {
      if (disposed || !container.current) return;
      leaflet.current = L;
      const instance = L.map(container.current, { zoomControl: false, attributionControl: false, preferCanvas: true }).setView([6.59, 3.35], 12);
      map.current = instance;
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(instance);
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      const tiles = L.tileLayer(token ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(token)}` : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        tileSize: token ? 512 : 256, zoomOffset: token ? -1 : 0, maxZoom: 19,
        attribution: token ? '© <a href="https://mapbox.com/about/maps">Mapbox</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>' : '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      timeout = setTimeout(() => { if (!disposed) setError(true); }, 18000);
      tiles.on('tileload', () => { clearTimeout(timeout); if (!disposed) setError(false); });
      tiles.addTo(instance);
      overlays.current = L.layerGroup().addTo(instance);
      observer = new ResizeObserver(() => instance.invalidateSize());
      observer.observe(container.current);
      setReady(true);
    }).catch(() => { if (!disposed) setError(true); });
    return () => { disposed = true; clearTimeout(timeout); observer?.disconnect(); map.current?.remove(); map.current = null; driver.current = null; };
  }, []);
  useEffect(() => {
    const L = leaflet.current, instance = map.current, group = overlays.current;
    if (!ready || !L || !instance || !group) return;
    group.clearLayers();
    const pin = (point: { latitude: number; longitude: number }, label: string, color: string) => {
      const root = document.createElement('div'); root.className = 'map-pin'; root.style.background = color;
      const dot = document.createElement('span'); dot.textContent = '●'; root.append(dot);
      L.marker([point.latitude, point.longitude], { icon: L.divIcon({ html: root, className: '', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(group).bindTooltip(label, { direction: 'top', offset: [0, -17], permanent: true, className: 'route-label' });
    };
    if (quote) {
      const points: Leaflet.LatLngTuple[] = quote.route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      L.polyline(points, { color: '#ffffff', weight: 9, opacity: .9 }).addTo(group);
      L.polyline(points, { color: '#0066cc', weight: 5, lineCap: 'round' }).addTo(group);
      for (const segment of quote.route.trafficSegments.features) L.polyline(segment.geometry.coordinates.map(([lng, lat]) => [lat, lng] as Leaflet.LatLngTuple), { color: segment.properties.congestion === 'moderate' ? '#e7ae38' : '#e0525d', weight: 5 }).addTo(group);
      pin(quote.route.pickup, 'Pick up', '#111'); pin(quote.route.destination, 'Drop off', '#0066cc');
      instance.fitBounds(L.latLngBounds(points), { padding: [65, 75], maxZoom: 15, animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    } else if (pickup) { pin(pickup, 'Your pickup', '#111'); instance.setView([pickup.latitude, pickup.longitude], 15); }
  }, [ready, quote, pickup]);
  useEffect(() => {
    const L = leaflet.current, instance = map.current;
    if (!ready || !L || !instance) return;
    if (!position) { driver.current?.remove(); driver.current = null; return; }
    if (driver.current) driver.current.setLatLng([position.latitude, position.longitude]);
    else {
      const element = document.createElement('div'); element.className = 'driver-marker'; element.textContent = '🚘'; element.setAttribute('aria-label', 'Live driver location');
      driver.current = L.marker([position.latitude, position.longitude], { zIndexOffset: 1000, icon: L.divIcon({ html: element, className: '', iconSize: [40, 40], iconAnchor: [20, 20] }) }).addTo(instance);
    }
  }, [position, ready]);
  return <div className="relative h-full w-full bg-[#e8edeb]">
    <div ref={container} className="absolute inset-0" aria-label="Trip map" role="region" />
    <div className="pointer-events-none absolute top-5 left-5 z-[500] inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-4 py-2.5 text-xs shadow-sm backdrop-blur"><span className="h-2 w-2 rounded-full bg-green-500" />{quote ? 'Your route, on the road' : 'A better way around Lagos'}</div>
    <div className="absolute right-5 bottom-10 z-[500] grid gap-2"><div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"><button onClick={() => map.current?.zoomIn()} className="map-control border-b border-zinc-100" aria-label="Zoom in"><Plus size={18} /></button><button onClick={() => map.current?.zoomOut()} className="map-control" aria-label="Zoom out"><Minus size={18} /></button></div><button onClick={() => {
      const point = position ?? pickup ?? quote?.route.pickup;
      if (point) map.current?.setView([point.latitude, point.longitude], 15);
      else map.current?.setView([6.59, 3.35], 12);
    }} className="map-control rounded-xl border border-zinc-200 bg-white shadow-sm" aria-label="Center map"><LocateFixed size={18} /></button></div>
    {error && <div role="status" className="absolute bottom-5 left-5 z-[500] max-w-[260px] rounded-xl bg-white p-3 text-xs text-zinc-600 shadow">Map tiles couldn’t load. You can continue planning your trip.<button onClick={() => { setError(false); map.current?.eachLayer(layer => { if ('redraw' in layer && typeof layer.redraw === 'function') layer.redraw(); }); }} className="mt-1 block font-medium text-blue-600">Retry map</button></div>}
    {!quote && <div className="pointer-events-none absolute bottom-10 left-6 z-[400] hidden max-w-[250px] rounded-2xl border border-white/80 bg-white/90 p-5 backdrop-blur lg:block"><p className="text-[10px] tracking-[.16em] text-zinc-500 uppercase">Less hassle. More living.</p><p className="mt-2 text-xl font-medium leading-snug tracking-tight">The city is yours.<br />We’ll get you there.</p></div>}
  </div>;
}
