# Development notes

Run `pnpm check` for type checks and `pnpm build` to build the static site into `dist/`.

## Photos

Requires ImageMagick 7.

1. Put images in `photos/inbox/` (git-ignored).
2. Run `pnpm photos`. It writes resized images and thumbnails to `public/photos/` and adds entries to `src/lib/os/photos.json`.
3. Fill in each photo's title, album, date, caption, credit and source. Add English text in its `en` entry.

Optional fields: `focus` sets the CSS `object-position` for cropped photos; `avatar: true` selects the welcome-screen photo.

## Music

Requires ffmpeg and a Python environment with `torch`, `demucs`, `basic-pitch` (ONNX), `librosa`, `mido` and `soundfile`.

Use the folder layout `<year> [<unit> - ]<album>/<nn> - <title>.mp3`.

```sh
python scripts/music.py ~/Music/songs
```

The script uses Demucs and Basic Pitch to transcribe recordings into MIDI.
It writes `public/music/<id>.mid` and updates `src/lib/os/music.json`. The transcription is automatic and imperfect.

## Guestbook moderation

To hide a note, add its event ID (shown in the tooltip on its timestamp) or the author's public key to `src/lib/os/guestbook-blocked.json` and redeploy.

New guestbook notes and their empty replacement events (removals) include a `client` tag naming HaYeon OS and `r` tags linking to the site and source repository. These tags are included before proof of work and signing, so project information stays with the event when it is forwarded. They identify the project for readers and relay operators; they do not guarantee retention or prove the event came from the official client. Existing events remain valid without these tags and must be forwarded unchanged. The client tag names the app only; it does not reference a separately published NIP-89 handler.

[`guestbook-event.example.json`](guestbook-event.example.json) shows a complete WebSocket `EVENT` message generated with the app's signing code and a disposable key. Its signature and 16-bit proof of work are valid. It is an offline example and has not been published to any relay. The `nonce` is the proof-of-work counter; `id` is the SHA-256 event hash, and `sig` is the author's Schnorr signature. Deleting a note sends the same kind and `d` tag with a newer timestamp and empty content, keeping the project tags and omitting the proof-of-work nonce.

## Releases and gateways

4EVERLAND builds and publishes every push to `main` under an IPNS name, and the site is reached through eth.limo and eth.link.

4EVERLAND stores each new IPNS record on only some of the DHT peers nearest to the name. The others keep older records until they expire a day later, and the gateways sometimes serve the old release from them. `tools/ipns-refresh` crawls the DHT, takes the newest signed record from the nearest peers and stores it on the ones that lack it. `.github/workflows/warm.yml` runs it after each release and every six hours, then requests every file through both gateways.

To run it by hand (needs Go):

```sh
cd tools/ipns-refresh
go run . -name k51qzi5uqu5djosu5m6aionypxo0mv5mmytg12o3u08swhkd8qrxmtooz73ngi -dry-run
```

Drop `-dry-run` to store the record.
