// Keeps a copy of HaYeon OS on the device. A return visit opens from that copy
// at once, and the newest build is fetched in the background for next time.

const CACHE = 'hayeon-os-v1';
const scope = self.registration.scope;
const scopePath = new URL(scope).pathname;

function buildOf(html) {
  return Number(/<meta name="build" content="(\d+)"/.exec(html)?.[1] ?? 0);
}

// A navigation may not be answered with a response that followed a redirect.
function settled(response) {
  if (!response.redirected) return response;
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

async function announce() {
  for (const client of await self.clients.matchAll({ type: 'window' })) {
    client.postMessage({ type: 'hayeon-os:update' });
  }
}

/** Fetches the page and saves it when it is newer than the saved copy. */
async function refreshPage() {
  const response = settled(await fetch(scope, { cache: 'no-cache' }));
  if (!response.ok) return null;
  const html = await response.clone().text();
  // A gateway in trouble answers with its own error page.
  if (!html.includes('<div id="app">')) return null;

  const cache = await caches.open(CACHE);
  const saved = await cache.match(scope);
  if (saved) {
    const old = await saved.text();
    if (old === html) return response;
    // Right after a release some gateway nodes still hand out the previous build.
    if (buildOf(html) < buildOf(old)) return null;
  }
  await cache.put(scope, response.clone());
  if (saved) await announce();
  return response;
}

async function page(event) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(scope);
  const fresh = refreshPage().catch(() => null);
  if (saved) {
    event.waitUntil(fresh);
    return saved;
  }
  return (await fresh) ?? fetch(event.request);
}

// The page fetches photos and music in one file, pack.bin, and saves that in this
// cache itself. These single files are only asked for while the pack is on its way.
// Their addresses carry a content hash, so a saved copy never goes stale.
async function kept(event) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(event.request.url);
  if (saved) return saved;
  const response = await fetch(event.request);
  if (response.ok) event.waitUntil(cache.put(event.request.url, response.clone()).catch(() => {}));
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    refreshPage()
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith('hayeon-os-') && name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  const path = new URL(request.url).pathname.slice(scopePath.length);
  if (path === '' || path === 'index.html') event.respondWith(page(event));
  else if (path.startsWith('photos/') || path.startsWith('music/') || path === 'favicon.svg') event.respondWith(kept(event));
});

self.addEventListener('message', (event) => {
  // A page tells which build it is running and hears back if a newer one is saved.
  // The announcement after a refresh can reach a page before it is listening.
  if (event.data?.type === 'hayeon-os:build') {
    event.waitUntil(
      (async () => {
        const saved = await (await caches.open(CACHE)).match(scope);
        if (saved && buildOf(await saved.text()) > Number(event.data.build)) {
          event.source?.postMessage({ type: 'hayeon-os:update' });
        }
      })()
    );
  }
});
