/* TrailAtlas MIT licensed service worker. No bulk tile caching. */
const CACHE='trailatlas-offline-v3';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png',
'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css',
'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js',
'https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js'];
self.addEventListener('install', e=>e.waitUntil((async()=>{
const cache=await caches.open(CACHE);
await Promise.allSettled(SHELL.map(url=>cache.add(new Request(url,{mode:url.startsWith('http')?'no-cors':'same-origin'}))));
await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('trailatlas-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET')return;
const leaflet=u.hostname==='unpkg.com' && (u.pathname.includes('/leaflet@1.9.4/dist/')||u.pathname.includes('/maplibre-gl@5.24.0/dist/')||u.pathname.includes('/maplibre-gl-leaflet@0.1.4/'));
if(u.origin!==self.location.origin&&!leaflet)return;
if(leaflet){e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));return}
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});return resp}).catch(()=>caches.match('./index.html')));return}
e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));
});
