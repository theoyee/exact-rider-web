const id = '[0-9a-fA-F-]{36}';
export function allowedBackendPath(path: string, method: string) {
  if (method === 'POST' && path === 'api/v1/rides/quotes') return true;
  if (method === 'POST' && path === 'api/v1/routing/estimate') return true;
  if (method === 'POST' && path === 'api/v1/rides/requests') return true;
  if (method === 'GET' && new RegExp(`^api/v1/rides/quotes/${id}/validity$`).test(path)) return true;
  if (method === 'GET' && new RegExp(`^api/v1/rides/requests/${id}$`).test(path)) return true;
  return method === 'POST' && new RegExp(`^api/v1/rides/requests/${id}/(accept-counter|counter|cancel)$`).test(path);
}
