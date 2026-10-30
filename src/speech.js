// Mandarin voice for devices without a Chinese speech-synthesis voice. app.js speak() raises a cancelable
// hanzi:speak-fallback event; signed-in learners get Cloudflare MeloTTS audio from /api/tutor (mode "speak"),
// cached per text for the session. Guests, or a failed request, keep the device voice.
export function mountSpeechFallback() {
  let client = null, profile = null;
  let generation = 0, request = 0, controller, audio;
  const cache = new Map();
  function device(text) { try { const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; speechSynthesis.speak(u); } catch {} }
  async function play(text) {
    const owner = generation, current = ++request, activeClient = client;
    controller?.abort();audio?.pause();
    const pending = new AbortController();controller = pending;
    const active = () => owner === generation && current === request;
    try {
      let url = cache.get(text);
      if (!url) {
        const { data } = await activeClient.auth.getSession();
        if (!active()) return;
        const token = data.session?.access_token; if (!token) throw Error('not_authenticated');
        const response = await fetch('./api/tutor', { method: 'POST', signal:pending.signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ mode: 'speak', text }) });
        if (!response.ok) throw Error('tts_unavailable');
        const blob = await response.blob();if (!active()) return;
        url = URL.createObjectURL(blob); cache.set(text, url);
      }
      if (!active()) return;
      audio = new Audio(url);await audio.play();
    } catch { if (active()) device(text); }
  }
  window.addEventListener('hanzi:speak-fallback', event => {
    const text = String(event.detail?.text || '').trim().slice(0, 40);
    if (!client || !profile || !text) return;
    event.preventDefault(); play(text);
  });
  return { setSession(nextClient, nextProfile) { if(client===nextClient&&profile?.id===nextProfile?.id)return;generation++;controller?.abort();controller=null;audio?.pause();audio=null;for(const url of cache.values())URL.revokeObjectURL(url);cache.clear();client = nextClient; profile = nextProfile; } };
}
