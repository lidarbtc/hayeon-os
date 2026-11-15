import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import music from './src/lib/os/music.json' with { type: 'json' };
import photos from './src/lib/os/photos.json' with { type: 'json' };

/**
 * Folds the script and the stylesheet into index.html, so the desktop needs one
 * request instead of three. Through an ENS gateway every request costs about a
 * second, and several more the first time the gateway sees a file.
 */
function inlineIntoHtml(): Plugin {
  return {
    name: 'hayeon-os:inline',
    apply: 'build',
    // order 'post' runs this after Vite's own generateBundle hooks, which still
    // have placeholders to fill in the script.
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const page = bundle['index.html'];
        if (page?.type !== 'asset') return;

        const take = (file: string) => {
          const item = bundle[file];
          if (!item) return null;
          delete bundle[file];
          return item.type === 'chunk' ? item.code : String(item.source);
        };

        let html = String(page.source);
        html = html.replace(/<script type="module"[^>]*\ssrc="\.\/([^"]+)"[^>]*><\/script>/g, (tag, file: string) => {
          const code = take(file);
          if (code === null) return tag;
          // "\x3C" reads as "<" in strings, templates and regular expressions alike,
          // and keeps the HTML parser from ending the script early.
          return '<script type="module">' + code.replace(/<(?=\/script|!--)/gi, '\\x3C') + '</script>';
        });
        html = html.replace(/<link rel="stylesheet"[^>]*\shref="\.\/([^"]+)"[^>]*>/g, (tag, file: string) => {
          const css = take(file);
          return css === null ? tag : '<style>' + css.replace(/<(?=\/style)/gi, '\\3C ') + '</style>';
        });
        if (html.includes('__VITE_')) this.error('index.html was inlined before Vite finished with the script.');
        // The service worker compares this number to tell a newer build from an older one.
        html = html.replace('</head>', '  <meta name="build" content="' + Date.now() + '" />\n  </head>');
        page.source = html;
      }
    }
  };
}

/** A short content hash per photo, so a replaced picture gets a new address. */
function photoRevs() {
  const revs: Record<string, string> = {};
  for (const { id } of photos) {
    const hash = createHash('sha1');
    for (const dir of ['public/photos/', 'public/photos/thumb/']) hash.update(readFileSync(dir + id + '.webp'));
    revs[id] = hash.digest('hex').slice(0, 8);
  }
  return revs;
}

/**
 * Every photo and song in one file, read by src/lib/os/pack.svelte.ts (the layout
 * is described there). One request instead of fifty: the gateways take between half
 * a second and ten seconds over each. Thumbnails come first because the boot screen
 * waits for them, then the songs, then the full pictures.
 */
function buildPack() {
  const files: { path: string; bytes: Buffer; gzipped: boolean }[] = [];
  const add = (path: string, gzipped = false) => {
    const bytes = readFileSync('public/' + path);
    files.push({ path, bytes: gzipped ? gzipSync(bytes, { level: 9 }) : bytes, gzipped });
  };
  for (const { id } of photos) add('photos/thumb/' + id + '.webp');
  const gate = files.length;
  for (const { id } of music) add('music/' + id + '.mid', true);
  for (const { id } of photos) add('photos/' + id + '.webp');

  const index = Buffer.from(JSON.stringify({ gate, files: files.map((file) => [file.path, file.bytes.length, file.gzipped ? 1 : 0]) }));
  const head = Buffer.alloc(8);
  head.write('HYPK');
  head.writeUInt32LE(index.length, 4);
  const bytes = Buffer.concat([head, index, ...files.map((file) => file.bytes)]);
  return { bytes, rev: createHash('sha1').update(bytes).digest('hex').slice(0, 8) };
}

function emitPack(bytes: Buffer): Plugin {
  return {
    name: 'hayeon-os:pack',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'pack.bin', source: bytes });
    }
  };
}

// base './' keeps every asset path relative so the build works from any
// IPFS gateway path (/ipfs/<cid>/) as well as from hayeon.eth.limo.
export default defineConfig(({ command }) => {
  // The dev server has no pack; there the site asks for each file on its own.
  const pack = command === 'build' ? buildPack() : null;
  return {
    base: './',
    plugins: [svelte(), inlineIntoHtml(), ...(pack ? [emitPack(pack.bytes)] : [])],
    define: { __PHOTO_REVS__: JSON.stringify(photoRevs()), __PACK_REV__: JSON.stringify(pack?.rev ?? '') },
    build: {
      target: 'es2022',
      // One chunk: a lazily loaded chunk could not be folded into index.html.
      rolldownOptions: { output: { codeSplitting: false } }
    }
  };
});
