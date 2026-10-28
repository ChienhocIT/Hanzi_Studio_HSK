const CACHE='hanzi-studio-__BUILD__';
const CORE=['./','./index.html','./app.js','./backup.js','./advanced.js','./content.js','./advanced.css','./video.css','./video.js','./curriculum.js','./curriculum.css','./situations.js','./cloud.css','./cloud.bundle.js','./cloud-config.js','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest','./brand.css','./assets/brand/logo-mark.svg','./assets/brand/logo-icon-48.png','./assets/brand/logo-icon-180.png','./assets/mascot/maylong-hello.webp','./assets/mascot/maylong-study.webp','./assets/mascot/maylong-thinking.webp'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('hanzi-studio-')&&key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')||url.search)return;
  // Private API responses and auth callback URLs must never enter the offline cache.
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));return;
  }
  if(!CORE.some(path=>new URL(path,self.location.href).pathname===url.pathname))return;
  event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(event.request)||fetch(event.request)));
});
