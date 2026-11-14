import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
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
    enforce: 'post',
    generateBundle(_options, bundle) {
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
      // The service worker compares this number to tell a newer build from an older one.
      html = html.replace('</head>', '  <meta name="build" content="' + Date.now() + '" />\n  </head>');
      page.source = html;
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

// base './' keeps every asset path relative so the build works from any
// IPFS gateway path (/ipfs/<cid>/) as well as from hayeon.eth.limo.
export default defineConfig({
  base: './',
  plugins: [svelte(), inlineIntoHtml()],
  define: { __PHOTO_REVS__: JSON.stringify(photoRevs()) },
  build: {
    target: 'es2022',
    // One chunk: a lazily loaded chunk could not be folded into index.html.
    rolldownOptions: { output: { codeSplitting: false } }
  }
});
