// Free fallback providers for the AI tutor, used in order when Gemini is out of quota or overloaded.
// Each one is enabled only when its key is set. All three speak the OpenAI chat-completions dialect.
const TIMEOUT = 25000;
const list = (value, fallback) => { const items = String(value || '').split(',').map(s => s.trim()).filter(Boolean); return items.length ? items : fallback; };
export function chatProviders(env) {
  const out = [];
  if (env.GROQ_API_KEY) out.push({ name: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: env.GROQ_API_KEY, models: list(env.GROQ_MODELS, ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b']) });
  if (env.OPENROUTER_API_KEY) out.push({ name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: env.OPENROUTER_API_KEY, models: list(env.OPENROUTER_MODELS, ['openrouter/free']), headers: { 'x-title': 'Hanzi Studio' } });
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) out.push({ name: 'Cloudflare', url: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/ai/v1/chat/completions`, key: env.CLOUDFLARE_API_TOKEN, models: list(env.CLOUDFLARE_MODELS, ['@cf/meta/llama-3.3-70b-instruct-fp8-fast']) });
  return out;
}
export const RETRYABLE = [404, 408, 409, 429, 500, 502, 503, 504];
// POST with a timeout on the response headers only; null on timeout or network error.
export async function post(fetcher, url, init, timeout = TIMEOUT) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetcher(url, { method: 'POST', ...init, signal: controller.signal }); } catch { return null; } finally { clearTimeout(timer); }
}
// Try every provider and model in order; return the first usable response with its provider name.
export async function chatCompletion(providers, body, fetcher) {
  for (const provider of providers) for (const model of provider.models) {
    const response = await post(fetcher, provider.url, { headers: { authorization: `Bearer ${provider.key}`, 'content-type': 'application/json', ...provider.headers }, body: JSON.stringify({ ...body, model }) });
    if (response?.ok) return { response, provider: provider.name, model };
    if (response && !RETRYABLE.includes(response.status)) await response.body?.cancel();
  }
  return null;
}
// Reasoning models (Qwen3, DeepSeek) may wrap their thinking in <think>…</think>; learners only see the answer.
export function stripThinking(text) { return String(text).replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trimStart(); }
// OpenAI-style SSE ("data: {...}", "data: [DONE]", ": comments") to plain answer text. The whole reply is kept and
// re-cleaned after every chunk; only the newly visible tail is sent, so <think> blocks never reach the learner.
const visible = raw => stripThinking(raw.replace(/<(t(h(i(n(k)?)?)?)?)?$/, ''));
export function openaiSseToText(body) {
  const decoder = new TextDecoder(), encoder = new TextEncoder();
  let buffer = '', raw = '', shown = 0;
  return body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split(/\r?\n/); buffer = lines.pop();
      for (const line of lines) {
        const data = line.startsWith('data:') ? line.slice(5).trim() : '';
        if (!data || data === '[DONE]') continue;
        try { const text = JSON.parse(data).choices?.[0]?.delta?.content; if (typeof text === 'string') raw += text; } catch {}
      }
      const now = visible(raw);
      if (now.length > shown) { controller.enqueue(encoder.encode(now.slice(shown))); shown = now.length; }
    },
    flush(controller) {
      const now = stripThinking(raw);
      if (now.length > shown) controller.enqueue(encoder.encode(now.slice(shown)));
      else if (!shown) controller.enqueue(encoder.encode('Mây Long chưa trả lời được câu này. Hãy hỏi lại theo cách khác nhé.'));
    }
  }));
}
// Speech to text: Groq Whisper, then Cloudflare Whisper. Returns {text, provider} or null.
export async function whisper(env, audio, mime, fetcher) {
  if (env.GROQ_API_KEY) {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mime }), 'speech.' + (mime.split('/')[1]?.split(';')[0] || 'webm'));
    form.append('model', env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo'); form.append('language', 'zh'); form.append('response_format', 'json');
    const response = await post(fetcher, 'https://api.groq.com/openai/v1/audio/transcriptions', { headers: { authorization: `Bearer ${env.GROQ_API_KEY}` }, body: form });
    if (response?.ok) { const data = await response.json().catch(() => null); if (typeof data?.text === 'string') return { text: data.text.trim(), provider: 'Groq Whisper' }; }
  }
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) {
    const response = await post(fetcher, `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/ai/run/@cf/openai/whisper-large-v3-turbo`, { headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ audio: Buffer.from(audio).toString('base64'), language: 'zh' }) });
    if (response?.ok) { const data = await response.json().catch(() => null); if (typeof data?.result?.text === 'string') return { text: data.result.text.trim(), provider: 'Cloudflare Whisper' }; }
  }
  return null;
}
// Mandarin speech from Cloudflare MeloTTS; returns MP3 bytes or null.
export async function melotts(env, text, fetcher) {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) return null;
  const response = await post(fetcher, `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/ai/run/@cf/myshell-ai/melotts`, { headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ prompt: text, lang: 'zh' }) });
  if (!response?.ok) return null;
  if ((response.headers.get('content-type') || '').includes('audio/')) return new Uint8Array(await response.arrayBuffer());
  const data = await response.json().catch(() => null), audio = data?.result?.audio ?? data?.audio;
  return typeof audio === 'string' ? Uint8Array.from(Buffer.from(audio, 'base64')) : null;
}
