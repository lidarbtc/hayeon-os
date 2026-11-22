# Development notes

Run `pnpm check` to check Svelte components with TypeScript 6 and 7. The Svelte checker loads TypeScript 6 itself and uses the `@typescript/native` alias for its TypeScript 7 pass. Run `pnpm build` to build the static site into `dist/`.

## Photos

Use ImageMagick 7.1.2-36 with `magick` on `PATH`.

1. Put images in `photos/inbox/` (git-ignored).
2. Run `pnpm photos`. It writes resized images and thumbnails to `public/photos/` and adds entries to `src/lib/os/photos.json`.
3. Fill in each photo's title, album, date, caption, credit and source. Add English text in its `en` entry.

Optional fields: `focus` sets the CSS `object-position` for cropped photos; `avatar: true` selects the welcome-screen photo.

## Music

Install uv and put FFmpeg 9.1 on `PATH`. The locked CPU environment in `scripts/music-env` uses CPython 3.11.18 on Linux x86_64. The first run downloads the Python packages and the Demucs weights.

Use the folder layout `<year> [<unit> - ]<album>/<nn> - <title>.mp3`.

```sh
uv run --project scripts/music-env --locked python scripts/music.py ~/Music/songs
```

The script separates each recording with Demucs and transcribes it with Basic Pitch's ONNX model.
It writes `public/music/<id>.mid` and updates `src/lib/os/music.json`. The transcription is automatic and imperfect.

## Guestbook moderation

To hide a note, add its event ID (shown in the tooltip on its timestamp) or the author's public key to `src/lib/os/guestbook-blocked.json` and redeploy.

New guestbook notes and their empty replacement events (removals) include a `client` tag naming HaYeon OS and `r` tags linking to the site and source repository. These tags are included before proof of work and signing, so project information stays with the event when it is forwarded. They identify the project for readers and relay operators; they do not guarantee retention or prove the event came from the official client. Existing events remain valid without these tags and must be forwarded unchanged. The client tag names the app only; it does not reference a separately published NIP-89 handler.

[`guestbook-event.example.json`](guestbook-event.example.json) shows a complete WebSocket `EVENT` message generated with the app's signing code and a disposable key. Its signature and 16-bit proof of work are valid. It is an offline example and has not been published to any relay. The `nonce` is the proof-of-work counter; `id` is the SHA-256 event hash, and `sig` is the author's Schnorr signature. Deleting a note sends the same kind and `d` tag with a newer timestamp and empty content, keeping the project tags and omitting the proof-of-work nonce.

## Guestbook backup and replication

`.github/workflows/guestbook-sync.yml` runs at minute 37 of every hour, when its scripts/configuration change on `main`, or manually through **Actions → Back up and replicate the guestbook → Run workflow**. The schedule starts once the workflow is on the default branch; GitHub may delay scheduled runs and disables schedules in public repositories after 60 days without repository activity.

The job reads its Node.js version from `.node-version` and its pnpm version from `package.json`. It uses the app's cryptography dependencies. It needs no visitor private keys or external secrets. Its built-in `GITHUB_TOKEN` has `contents: write` to maintain a separate `guestbook-backup` branch. Branch rules must permit that write. The backup branch has no workflow or application source, so backup commits do not deploy the site.

1. Query the browser's five relays from `src/lib/os/guestbook-config.ts` plus the additional candidates in `scripts/guestbook-relays.json`, with up to eight simultaneous connections. The separate list expands scheduled replication without opening dozens of connections on visitors' devices. Candidates come from public relay directories and advertised NIP-65 relay lists; their presence in the list is not evidence of availability or storage. Before connecting, skip relays that advertise authentication, payment, or restricted writes in NIP-11. Page backward through `kind:30078` events tagged `hayeon-os-guestbook`, waiting for `EOSE` on each query. The reader uses a maximum page size of 100, reduced by advertised NIP-11 limits, and fetches each boundary second separately. Saturated boundaries fail visibly rather than silently skipping records. Undisclosed relay caps or omitted query results can still make a relay's history incomplete.
2. Validate signatures, the topic and the app's 16-bit proof of work (empty removals need no PoW). Merge valid completed snapshots with `guestbook-backup/events.json`, keeping the latest event per `(pubkey, kind, d)`, including empty removal events. Equal timestamps use the lowest event ID, matching NIP-01 and the browser. A missing or failed relay response never deletes an archived record. A malformed backup or failure of every source aborts collection.
3. Commit and push the backup **before** sending any events. A failed push prevents replication. Only changed data creates a commit. The public backup contains public signed events, never visitor private keys. It is not subject to Actions artifact expiration. Replacing a note with an empty event removes its body from the current snapshot, but earlier Git history may still contain it.
4. Send the unchanged latest events only to relays that completed collection and lack those IDs, with up to six relays in parallel. Skip notes blocked by the site's moderation list, propagate removals first, and wait for each relay's `OK`. Send at most 500 events per relay per run, with a one-second pause between sends. Connection failures/timeouts get up to three attempts with a fresh connection and 2/4-second backoff. Acknowledged events are not resent on reconnect. Explicit refusals are recorded without an immediate retry; rate-limit, authentication, authorization, and full-disk responses pause that relay's backlog. After sending, query the relay again to measure how many desired records can actually be read back.

The Actions summary lists candidate/readable/complete relay counts, the expected archive size, and per-relay ACK, readback, refusal, and connection results. A complete relay has every unblocked current record, including removals, in its completed collection or post-write readback. Unavailable, rejecting, or incomplete destinations produce an Actions warning and are retried next run, even when no new writes were accepted. A failed backup read/write, malformed or stale plan, or failure of every collection source still fails the job. Observed deletion events are retained permanently in the current snapshot so stale copies cannot replace them. A deletion that exists only on an unreachable relay cannot be discovered until that relay returns. Neither an ACK nor a readback guarantees permanent storage. The backup is for recovery/replication; the website still reads from its configured relays.

Read-only collection (writes local files, sends no events):

```sh
node scripts/sync-guestbook.mjs collect --archive /tmp/guestbook-events.json --plan /tmp/guestbook-plan.json
```

After durably saving that archive, publish its missing events using the fresh plan (valid for 30 minutes):

```sh
node scripts/sync-guestbook.mjs publish --archive /tmp/guestbook-events.json --plan /tmp/guestbook-plan.json
```

Run `node --test scripts/sync-guestbook.test.mjs` for offline tests of signatures, deletion handling, pagination, relay failures, and backup-to-relay recovery.

## Releases and gateways

4EVERLAND builds and publishes every push to `main` under an IPNS name, and the site is reached through eth.limo and eth.link.

The Vite preset uses Node.js 24.x, runs `npm run build`, and publishes `dist/`. Its install command uses the pnpm version pinned in `package.json`.

```sh
npm exec --yes --package="$(node -p 'require("./package.json").packageManager')" -- pnpm install --frozen-lockfile
```

4EVERLAND stores each new IPNS record on only some of the DHT peers nearest to the name. The others keep older records until they expire a day later, and the gateways sometimes serve the old release from them. `tools/ipns-refresh` crawls the DHT, takes the newest signed record from the nearest peers and stores it on the ones that lack it. `.github/workflows/warm.yml` runs it after each release and every six hours, then requests every file through both gateways.

To run it by hand (needs Go):

```sh
cd tools/ipns-refresh
go run . -name k51qzi5uqu5djosu5m6aionypxo0mv5mmytg12o3u08swhkd8qrxmtooz73ngi -dry-run
```

Drop `-dry-run` to store the record.
