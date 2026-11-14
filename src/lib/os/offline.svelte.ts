import { photos, photoUrl, thumbUrl } from './photos.svelte';
import { session } from './session.svelte';

/** Set once a newer build has been saved for the next start. */
export const update = $state({ ready: false });

const RELOADED = 'hayeon-os:reloaded';

function onUpdate() {
  // Still on the boot screen: start over in the new build, at most once per tab.
  try {
    if (session.phase === 'boot' && !sessionStorage.getItem(RELOADED)) {
      sessionStorage.setItem(RELOADED, '1');
      location.reload();
      return;
    }
  } catch {
    // Storage can be switched off; fall through to the notice.
  }
  update.ready = true;
}

/** Registers the service worker (public/sw.js) that keeps a copy of the site on the device. */
export function startOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'hayeon-os:update') onUpdate();
  });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
}

/** Asks the service worker to save every photo, thumbnails first. */
export function keepPhotos() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (saver) return;
  const urls = [...photos.map(thumbUrl), ...photos.map(photoUrl)].map((url) => new URL(url, document.baseURI).href);
  navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage({ type: 'hayeon-os:photos', urls }))
    .catch(() => {});
}
