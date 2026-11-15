// One file, pack.bin, carries every photo and every song. It is fetched once
// while the boot screen shows, so nothing has to be asked for again later:
// through an ENS gateway each request costs anywhere from half a second to
// more than ten. vite.config.ts writes the file; this module reads it.
//
// Layout: "HYPK", the index length (uint32, little endian), the index as JSON
// ({ gate, files: [path, size, gzipped][] }) and then the files back to back.
// Files become available one by one while the download is still running.

/** early: the files the first screens need have arrived, or the download gave up. */
export const pack = $state({ early: false, done: false });

const CACHE = 'hayeon-os-v1';
const blobs = new Map<string, string>();
const zipped = new Map<string, Uint8Array<ArrayBuffer>>();
const canUnzip = typeof DecompressionStream !== 'undefined';

/** An address for a packed picture, e.g. photos/thumb/x.webp, once it has arrived. */
export function packedUrl(path: string) {
  return blobs.get(path);
}

/** The bytes of a packed song, e.g. music/x.mid, once it has arrived. */
export function packedBytes(path: string) {
  const bytes = zipped.get(path);
  if (!bytes) return undefined;
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

function keep(path: string, bytes: Uint8Array<ArrayBuffer>, gzipped: boolean) {
  if (path.endsWith('.webp')) blobs.set(path, URL.createObjectURL(new Blob([bytes], { type: 'image/webp' })));
  // A copy, so the songs do not keep the whole download in memory.
  else if (gzipped && canUnzip) zipped.set(path, bytes.slice());
}

/** Reads the pack as it streams in and returns all of it. */
async function read(response: Response) {
  const reader = response.body!.getReader();
  let head = new Uint8Array(0);
  let data: Uint8Array<ArrayBuffer> | null = null;
  let filled = 0;
  let files: [string, number, number][] = [];
  let gate = 0;
  let next = 0;
  let offset = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (data) {
      if (filled + value.length > data.length) throw new Error('pack is longer than its index says');
      data.set(value, filled);
      filled += value.length;
    } else {
      const joined = new Uint8Array(head.length + value.length);
      joined.set(head);
      joined.set(value, head.length);
      head = joined;
      if (head.length < 8) continue;
      if (String.fromCharCode(...head.subarray(0, 4)) !== 'HYPK') throw new Error('not a pack');
      const indexLength = new DataView(head.buffer).getUint32(4, true);
      if (head.length < 8 + indexLength) continue;
      const index = JSON.parse(new TextDecoder().decode(head.subarray(8, 8 + indexLength)));
      files = index.files;
      gate = index.gate;
      offset = 8 + indexLength;
      data = new Uint8Array(files.reduce((sum, file) => sum + file[1], offset));
      if (head.length > data.length) throw new Error('pack is longer than its index says');
      data.set(head);
      filled = head.length;
    }
    while (next < files.length && filled >= offset + files[next][1]) {
      const [path, size, gzipped] = files[next++];
      keep(path, data.subarray(offset, offset + size), gzipped === 1);
      offset += size;
      if (next >= gate) pack.early = true;
    }
  }
  if (!data || next < files.length) throw new Error('pack ended early');
  return data;
}

async function load(url: string) {
  // The cache can be out of reach, in a private window for instance.
  const cache = typeof caches === 'undefined' ? null : await caches.open(CACHE).catch(() => null);
  const saved = await cache?.match(url).catch(() => undefined);
  if (saved) {
    try {
      await read(saved);
      return;
    } catch {
      await cache?.delete(url).catch(() => {});
    }
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const data = await read(response);
  if (!cache) return;
  await cache.put(url, new Response(data, { headers: { 'content-type': 'application/octet-stream' } }));
  // Earlier packs, and files that were saved one by one before there was a pack.
  const scope = new URL(import.meta.env.BASE_URL, document.baseURI).href;
  for (const request of await cache.keys()) {
    const path = request.url.startsWith(scope) ? request.url.slice(scope.length) : '';
    if (request.url !== url && /^(pack\.bin|photos\/|music\/)/.test(path)) await cache.delete(request);
  }
}

/** Starts the download. Until a file arrives, and if it never does, the site asks for files one by one. */
export function startPack() {
  const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (!__PACK_REV__ || saver) {
    pack.early = true;
    return;
  }
  const url = new URL(import.meta.env.BASE_URL + 'pack.bin?v=' + __PACK_REV__, document.baseURI).href;
  load(url)
    .then(() => (pack.done = true))
    .catch(() => {})
    .finally(() => (pack.early = true));
}
