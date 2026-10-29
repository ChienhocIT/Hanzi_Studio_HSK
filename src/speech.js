// Mandarin voice for devices without a Chinese speech-synthesis voice. app.js speak() raises a cancelable
// hanzi:speak-fallback event; signed-in learners get Cloudflare MeloTTS audio from /api/tutor (mode "speak"),
// cached per text for the session. Guests, or a failed request, keep the device voice.
export function mountSpeechFallback() {
  let client = null, profile = null;
  const cache = new Map();
  function device(text) { try { const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; speechSynthesis.speak(u); } catch {} }
  async function play(text) {
    try {
      let url = cache.get(text);
      if (!url) {
        const { data } = await client.auth.getSession();
        const token = data.session?.access_token; if (!token) throw Error('not_authenticated');
        const response = await fetch('./api/tutor', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ mode: 'speak', text }) });
        if (!response.ok) throw Error('tts_unavailable');
        url = URL.createObjectURL(await response.blob()); cache.set(text, url);
      }
      await new Audio(url).play();
    } catch { device(text); }
  }
  window.addEventListener('hanzi:speak-fallback', event => {
    const text = String(event.detail?.text || '').trim().slice(0, 40);
    if (!client || !profile || !text) return;
    event.preventDefault(); play(text);
  });
  return { setSession(nextClient, nextProfile) { client = nextClient; profile = nextProfile; } };
}
