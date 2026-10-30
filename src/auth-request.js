// Bound the complete Auth operation, including SDK initialization and reading the response body.
export async function authRequest(work, {signal, timeoutMs = 15000} = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, {once:true});
  const timer = setTimeout(() => {
    const error = new Error('auth_request_timeout');error.code = 'auth_request_timeout';
    controller.abort(error);
  }, timeoutMs);
  let stop;
  const aborted = new Promise((_, reject) => {
    stop = () => reject(controller.signal.reason || new DOMException('Aborted', 'AbortError'));
    if (controller.signal.aborted) stop(); else controller.signal.addEventListener('abort', stop, {once:true});
  });
  try { return await Promise.race([Promise.resolve().then(() => {controller.signal.throwIfAborted();return work(controller.signal);}), aborted]); }
  finally { clearTimeout(timer);signal?.removeEventListener('abort', cancel);controller.signal.removeEventListener('abort', stop); }
}

export function emailLinkFromUrl(href) {
  const url = new URL(href);
  if (!url.searchParams.has('token_hash')) return null;
  const token = url.searchParams.get('token_hash'), type = url.searchParams.get('type');
  const link = ['email','recovery'].includes(type) && /^[a-zA-Z0-9_-]{16,1024}$/.test(token || '') ? {token_hash:token,type} : null;
  url.searchParams.delete('token_hash');url.searchParams.delete('type');url.hash = 'auth';
  return {link, cleanUrl:url.pathname + url.search + url.hash};
}
