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
