export async function fetchWithTimeout(input: RequestInfo | URL, options: RequestInit = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(abort, 12_000);
  try { return await fetch(input, { ...options, cache: 'no-store', signal: controller.signal }); }
  finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
