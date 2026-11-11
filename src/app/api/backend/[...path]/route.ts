import { allowedBackendPath } from '@/lib/proxy-policy';
export const dynamic = 'force-dynamic';
async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const resource = path.join('/');
  if (!allowedBackendPath(resource, request.method)) return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  const origin = process.env.API_ORIGIN?.replace(/\/+$/, '');
  if (!origin || !/^https?:\/\//.test(origin)) return Response.json({ error: { code: 'BACKEND_NOT_CONFIGURED' } }, { status: 503 });
  const requestUrl = new URL(request.url);
  // Next.js may use its bind address internally; Host is the browser-facing authority.
  const publicOrigin = new URL(`${requestUrl.protocol}//${request.headers.get('host') || requestUrl.host}`).origin;
  if (request.method !== 'GET' && request.headers.get('origin') && request.headers.get('origin') !== publicOrigin) return Response.json({ error: { code: 'INVALID_ORIGIN' } }, { status: 403 });
  try {
    const body = request.method === 'GET' ? undefined : await request.text();
    if (body && new TextEncoder().encode(body).length > 16384) return Response.json({ error: { code: 'BODY_TOO_LARGE' } }, { status: 413 });
    const headers = new Headers({ Accept: 'application/json' });
    if (body) headers.set('Content-Type', 'application/json');
    const authorization = request.headers.get('authorization');
    if (authorization) headers.set('Authorization', authorization);
    const response = await fetch(`${origin}/${resource}`, { method: request.method, body, headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000) });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: { code: 'BACKEND_UNAVAILABLE' } }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
export const GET = proxy;
export const POST = proxy;
