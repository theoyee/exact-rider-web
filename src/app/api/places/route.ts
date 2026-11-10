export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get('q')?.trim().slice(0, 200);
  const id = params.get('id')?.trim().slice(0, 300);
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!query && !id) return Response.json({ suggestions: [] });
  try {
    if (key) {
      const response = await fetch(id ? `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}` : 'https://places.googleapis.com/v1/places:autocomplete', {
        method: id ? 'GET' : 'POST', cache: 'no-store', signal: AbortSignal.timeout(8000),
        headers: { 'X-Goog-Api-Key': key, ...(id ? { 'X-Goog-FieldMask': 'formattedAddress,location' } : { 'Content-Type': 'application/json' }) },
        ...(id ? {} : { body: JSON.stringify({ input: query, includedRegionCodes: ['ng'] }) }),
      });
      if (response.ok) {
        const result = await response.json();
        if (id) return Response.json({ label: result.formattedAddress ?? '', coordinates: result.location ?? null });
        return Response.json({ suggestions: (result.suggestions ?? []).flatMap((item: { placePrediction?: { placeId?: string; text?: { text?: string } } }) => {
          const place = item.placePrediction;
          return place?.placeId && place.text?.text ? [{ placeId: place.placeId, label: place.text.text }] : [];
        }) });
      }
      if (id) return Response.json({ error: 'Unable to resolve this place.' }, { status: 502 });
    }
    if (query && token) {
      const search = new URLSearchParams({ q: query, country: 'ng', limit: '5', autocomplete: 'true', access_token: token });
      const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${search}`, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      if (!response.ok) throw new Error('Places unavailable');
      const result = await response.json();
      return Response.json({ suggestions: (result.features ?? []).map((item: { geometry: { coordinates: number[] }; properties: { full_address?: string; name?: string; place_formatted?: string } }) => ({
        placeId: `mapbox:${item.geometry.coordinates[0]},${item.geometry.coordinates[1]}`,
        label: item.properties.full_address || [item.properties.name, item.properties.place_formatted].filter(Boolean).join(', '),
      })) });
    }
    return Response.json({ suggestions: [], error: 'Address search is not configured. Enter an address or coordinates manually.' }, { status: 503 });
  } catch { return Response.json({ error: 'Address search is temporarily unavailable. Please try again.' }, { status: 502 }); }
}
