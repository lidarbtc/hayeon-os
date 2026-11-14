# HaYeon OS

A small fan-made operating system that lives at [hayeon.eth](https://hayeon.eth.limo).

It is a single static page that boots into a Windows XP / 7 style desktop, painted in
Medium Turquoise (`#52D9BB`), the colour of tripleS S19 Jeong HaYeon. There is no server:
one build, pinned to IPFS, and everything you save stays in your browser.

Unofficial fan work. Not affiliated with MODHAUS or tripleS.

## What's inside

- Boot, welcome and shutdown screens
- Windows you can drag, resize, minimize and maximize, with a taskbar and a start menu
- **My Pictures**: a photo viewer with a slideshow; any photo can become the wallpaper
- **Profile**: HaYeon's profile and timeline
- Desktop gadgets: a photo frame and a birthday countdown
- Notepad, My Computer and a Recycle Bin, backed by `localStorage`
- Hedgehog Finder, a minesweeper with hedgehogs
- Media Player, with three tunes synthesised live by Web Audio
- A terminal (try `help`)
- Control Panel: two themes, four wallpapers and a gravity switch

The interface is in Korean. All icons and wallpapers are hand-drawn SVG.

## Development

Requires Node 20.19 or newer.

~~~bash
pnpm install
pnpm dev      # dev server
pnpm check    # type check
pnpm build    # static files in dist/
~~~

## Adding photos

1. Drop images into `photos/inbox/` (git-ignored).
2. Run `pnpm photos` (needs ImageMagick 7). It writes web-sized copies to `public/photos/`
   and adds an entry for each new image to `src/lib/os/photos.json`.
3. Fill in the title, album, date, caption and credit in `photos.json`.

Two optional fields: `focus` is a CSS `object-position` that keeps the subject in view when a
photo is cropped, and `avatar: true` marks the photo used on the welcome screen.

## Deployment

`dist/` is plain static files with relative paths, so it works from any host and under
an IPFS gateway path such as `/ipfs/<cid>/`.

hayeon.eth is deployed by 4EVERLAND on every push to `main` (Vite preset,
`npm run build`, output `dist`, Node 20+). The ENS content hash points at the
project's IPNS name, so the name follows each new build.

## Layout

| Path | Contents |
| --- | --- |
| `src/lib/os` | Session, window manager, file store, settings, photo list, game rules, synth |
| `src/lib/shell` | Desktop, windows, taskbar, start menu, gadgets |
| `src/lib/screens` | Boot, welcome and shutdown screens |
| `src/lib/apps` | The programs. Register new ones in `src/lib/os/apps.ts` |
| `src/lib/ui` | Icons, wallpapers and shared widgets |
| `scripts/photos.mjs` | The photo importer |

## License

Code is under [Apache-2.0](LICENSE). The photos in `public/photos` are not part of that
licence; each belongs to its author under the terms listed in [photos/CREDITS.md](photos/CREDITS.md).
