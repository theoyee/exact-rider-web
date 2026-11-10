import { afterEach, describe, expect, it, vi } from 'vitest';
import { allowedBackendPath } from '@/lib/proxy-policy';
import { GET, POST } from '@/app/api/backend/[...path]/route';
const id = '12345678-1234-1234-1234-123456789abc';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('restricted backend proxy', () => {
  it('only exposes the rider endpoints and their allowed methods', () => {
    expect(allowedBackendPath('api/v1/rides/quotes', 'POST')).toBe(true);
    expect(allowedBackendPath(`api/v1/rides/requests/${id}/cancel`, 'POST')).toBe(true);
    expect(allowedBackendPath('api/v1/drivers/me', 'GET')).toBe(false);
    expect(allowedBackendPath('https://evil.test', 'GET')).toBe(false);
    expect(allowedBackendPath('api/v1/rides/requests/../../admin', 'GET')).toBe(false);
    expect(allowedBackendPath('api/v1/rides/quotes', 'DELETE')).toBe(false);
  });
  it('reports missing backend configuration without exposing internals', async () => {
    vi.stubEnv('API_ORIGIN', '');
    const response = await GET(new Request('http://localhost/api/backend/api/v1/rides/quotes'), { params: Promise.resolve({ path: ['api', 'v1', 'rides', 'quotes', id, 'validity'] }) });
    expect(response.status).toBe(503);
  });
  it('forwards rider auth and errors with caching disabled', async () => {
    vi.stubEnv('API_ORIGIN', 'https://backend.example.test/');
    const fetch = vi.fn().mockResolvedValue(Response.json({ error: { code: 'RIDE_OFFER_EXPIRED' } }, { status: 410 }));
    vi.stubGlobal('fetch', fetch);
    const response = await POST(new Request(`http://localhost/api/backend/api/v1/rides/requests/${id}/counter`, { method: 'POST', headers: { Authorization: 'Bearer action-token', Origin: 'http://localhost' }, body: JSON.stringify({ fareMinor: 350000 }) }), { params: Promise.resolve({ path: ['api', 'v1', 'rides', 'requests', id, 'counter'] }) });
    expect(response.status).toBe(410);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`https://backend.example.test/api/v1/rides/requests/${id}/counter`);
    expect(options.headers.get('Authorization')).toBe('Bearer action-token');
    expect(options.body).toBe('{"fareMinor":350000}');
  });
  it('rejects cross-origin mutation attempts and oversized bodies', async () => {
    vi.stubEnv('API_ORIGIN', 'https://backend.example.test');
    const context = { params: Promise.resolve({ path: ['api', 'v1', 'rides', 'requests'] }) };
    const cross = await POST(new Request('http://localhost/api/backend', { method: 'POST', headers: { Origin: 'https://other.example' } }), context);
    expect(cross.status).toBe(403);
    const large = await POST(new Request('http://localhost/api/backend', { method: 'POST', body: 'x'.repeat(17000) }), context);
    expect(large.status).toBe(413);
  });
});
