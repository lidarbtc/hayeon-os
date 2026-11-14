// Turns the pictures in photos/inbox into web-sized files and lists them in
// src/lib/os/photos.json. Run with "pnpm photos". Needs ImageMagick 7 (magick).
//
// A picture that is already listed is left alone, so titles and captions
// edited by hand in photos.json survive the next run.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const inbox = join(root, 'photos/inbox');
const out = join(root, 'public/photos');
const thumbs = join(out, 'thumb');
const listPath = join(root, 'src/lib/os/photos.json');

const FULL = 1600;
const THUMB = 360;

function magick(...args) {
  return execFileSync('magick', args, { encoding: 'utf8' });
}

function slug(name) {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

mkdirSync(inbox, { recursive: true });
mkdirSync(thumbs, { recursive: true });

const list = existsSync(listPath) ? JSON.parse(readFileSync(listPath, 'utf8')) : [];
const known = new Set(list.map((photo) => photo.id));
const files = readdirSync(inbox)
  .filter((file) => /\.(jpe?g|png|webp|avif|heic)$/i.test(file))
  .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));

let added = 0;
for (const file of files) {
  const name = basename(file, extname(file));
  const id = slug(name);
  if (!id || known.has(id)) continue;
  // "[0]" takes the first frame, in case the picture is animated.
  const source = join(inbox, file) + '[0]';
  const full = join(out, id + '.webp');
  magick(source, '-auto-orient', '-strip', '-resize', FULL + 'x' + FULL + '>', '-quality', '80', full);
  magick(source, '-auto-orient', '-strip', '-resize', THUMB + 'x' + THUMB + '^', '-quality', '72', join(thumbs, id + '.webp'));
  const [w, h] = magick('identify', '-format', '%w %h', full).split(' ').map(Number);
  list.push({ id, title: name, album: '', date: '', caption: '', credit: '', source: '', w, h });
  known.add(id);
  added++;
  console.log('+ ' + id + ' (' + w + '×' + h + ')');
}

writeFileSync(listPath, JSON.stringify(list, null, 2) + '\n');
console.log(added ? added + ' added. Fill in titles and credits in src/lib/os/photos.json.' : 'Nothing new in photos/inbox.');
