# HaYeon OS

A small fan-made operating system that lives at [hayeon.eth](https://hayeon.eth.limo).

It is a single static page that boots into a Windows XP / 7 style desktop, painted in
Medium Turquoise (`#52D9BB`), the colour of tripleS S19 Jeong HaYeon. It is a static site with
no backend, and everything you save stays in your browser.

Unofficial fan work. Not affiliated with MODHAUS or tripleS.

## What's inside

- Boot, welcome and shutdown screens
- Windows you can drag, resize, minimize and maximize, with a taskbar and a start menu
- **My Pictures**: a photo viewer with a slideshow; any photo can become the wallpaper
- **Profile**: HaYeon's profile and timeline
- **Guestbook**: sticky notes that every visitor sees, live
- Desktop gadgets: a photo frame, a birthday countdown and the latest note
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

## Guestbook

Notes are signed in the browser with a throwaway key and stored on public
[Nostr](https://github.com/nostr-protocol/nips) relays (kind 30078, tagged `hayeon-os-guestbook`), so
there is still no backend and leaving a note costs nothing. Each note carries a small proof of
work to slow down spam, and the same relays carry a heartbeat that counts who is online. These
relay connections are the only external requests the page makes.

To take a note down, add its event id (the tooltip on a note's time) or its author's public key
to `src/lib/os/guestbook-blocked.json` and redeploy. Visitors can remove their own notes.

## Deployment

`dist/` is plain static files with relative paths, so it can be served from any host or
subfolder. hayeon.eth is rebuilt and published automatically on every push to `main`
(`npm run build`, output `dist`, Node 20+).

The site is reached through the eth.limo and eth.link gateways, where every request costs
about a second and a file is much slower the first time a gateway is asked for it. Three
things keep that from showing:

- The build is a single `index.html` with the script and styles folded in (see
  `vite.config.ts`), so the desktop needs one request.
- A service worker (`public/sw.js`) keeps a copy of the page and the photos on the visitor's
  device. Return visits open from that copy and fetch the newest build in the background; a
  balloon in the taskbar offers a restart when one has arrived.
- `.github/workflows/warm.yml` requests every file through both gateways after each push and
  every six hours.

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
licence: they are official photos © MODHAUS, credited in [photos/CREDITS.md](photos/CREDITS.md).
