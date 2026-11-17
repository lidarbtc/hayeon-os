// Node 24: native WebSocket and TypeScript stripping; no signing key is needed.
import { readFile, writeFile, rename, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout as pause } from 'node:timers/promises';
import { valid } from '../src/lib/os/nostr.ts';
import { KIND_NOTE, POW, RELAYS, TOPIC } from '../src/lib/os/guestbook-config.ts';
import extraRelays from './guestbook-relays.json' with { type: 'json' };

// Browsers use a small connection pool. The scheduled job can cover more relays.
export const SYNC_RELAYS = [...new Set([...RELAYS, ...extraRelays])];

const TIMEOUT = 12_000;
const MAX_EVENTS = 20_000;
const MAX_PUBLISH_PER_RELAY = 500;
const FILTER = { kinds: [KIND_NOTE], '#t': [TOPIC] };
const tag = (event, name) => event.tags.find((item) => item[0] === name)?.[1];
const key = (event) => `${event.pubkey}:${event.kind}:${tag(event, 'd')}`;

class ConnectionError extends Error {}

async function mapConcurrent(items, concurrency, operation) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await operation(items[index]);
    }
  }));
  return results;
}

// Reconnect only for transport failures. Policy refusals and invalid data are
// final for this run; retrying them cannot make the original signature valid.
export async function withRelay(url, operation, { sleep = pause, createRelay = (address) => new Relay(address) } = {}) {
  for (let attempt = 1; ; attempt++) {
    let relay;
    try {
      relay = createRelay(url);
      await relay.connect();
      return await operation(relay, attempt);
    } catch (error) {
      if (!(error instanceof ConnectionError) || attempt >= 3) throw error;
    } finally { relay?.close(); }
    await sleep(attempt * 2000);
  }
}

export function acceptable(event, now = Math.floor(Date.now() / 1000)) {
  return !!event && event.kind === KIND_NOTE && valid(event, event.content ? POW : 0) &&
    tag(event, 't') === TOPIC && !!tag(event, 'd') && event.created_at >= 0 &&
    event.created_at <= now + 600 && Buffer.byteLength(JSON.stringify(event)) <= 65_536;
}

// Keep empty replacements too. NIP-01 resolves equal timestamps by the lowest ID.
export function mergeEvents(...groups) {
  const latest = new Map();
  for (const event of groups.flat()) {
    const previous = latest.get(key(event));
    if (!previous || event.created_at > previous.created_at ||
        (event.created_at === previous.created_at && event.id < previous.id)) latest.set(key(event), event);
  }
  return [...latest.values()].sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
}

export function missingEvents(events, known, blocked) {
  const ids = new Set(known);
  return events.filter((event) => !ids.has(event.id) &&
    (!event.content || (!blocked.ids.includes(event.id) && !blocked.pubkeys.includes(event.pubkey))));
}

export class Relay {
  constructor(url, socketFactory = (address) => new WebSocket(address), timeout = TIMEOUT) {
    this.socket = socketFactory(url);
    this.timeout = timeout;
    this.sequence = 0;
  }

  async connect() {
    if (this.socket.readyState === 1) return;
    await this.exchange(null, () => undefined, 'open');
  }

  exchange(outbound, receive, readyEvent) {
    return new Promise((resolve, reject) => {
      const socket = this.socket;
      const finish = (error, value) => {
        clearTimeout(timer);
        socket.removeEventListener('message', message);
        socket.removeEventListener('close', closed);
        socket.removeEventListener('error', closed);
        socket.removeEventListener('open', opened);
        error ? reject(error) : resolve(value);
      };
      const closed = () => finish(new ConnectionError('Connection closed or failed'));
      const opened = () => finish(null);
      const message = ({ data }) => {
        try {
          if (typeof data !== 'string' || Buffer.byteLength(data) > 262_144) throw new Error('Invalid relay frame');
          const parsed = JSON.parse(data);
          if (!Array.isArray(parsed)) throw new Error('Invalid relay message');
          const result = receive(parsed);
          if (result !== undefined) finish(null, result);
        } catch (error) { finish(error); }
      };
      const timer = setTimeout(() => finish(new ConnectionError('Relay timed out')), this.timeout);
      socket.addEventListener('message', message);
      socket.addEventListener('close', closed);
      socket.addEventListener('error', closed);
      if (readyEvent) socket.addEventListener('open', opened);
      try {
        if (outbound) {
          if (socket.readyState !== 1) throw new ConnectionError('Relay is not open');
          socket.send(JSON.stringify(outbound));
        } else if (socket.readyState > 1) closed();
      } catch (error) { finish(error); }
    });
  }

  async query(filter) {
    const id = `backup-${++this.sequence}`;
    const events = [];
    try {
      return await this.exchange(['REQ', id, filter], (message) => {
        if (message[1] !== id) return;
        if (message[0] === 'CLOSED') throw new Error(`Subscription refused: ${String(message[2]).slice(0, 160)}`);
        if (message[0] === 'EOSE') return events;
        if (message[0] === 'EVENT') {
          if (events.length >= filter.limit) throw new Error('Relay exceeded query limit');
          events.push(message[2]);
        }
      });
    } finally {
      if (this.socket.readyState === 1) this.socket.send(JSON.stringify(['CLOSE', id]));
    }
  }

  publish(event) {
    return this.exchange(['EVENT', event], (message) => {
      if (message[0] === 'OK' && message[1] === event.id) {
        return { accepted: message[2] === true, reason: String(message[3] ?? '').slice(0, 160) };
      }
    });
  }

  close() { this.socket.close(); }
}

// Do not stop on a short page: some relays apply a lower cap. Fetch the boundary
// second separately before moving back, so timestamp ties are not silently lost.
export async function collectRelay(relay, limit = 100, now = Math.floor(Date.now() / 1000)) {
  const events = new Map();
  let until = now + 600;
  const read = async (filter) => {
    const page = await relay.query({ ...FILTER, ...filter, limit });
    for (const event of page) {
      if (!acceptable(event, now) || event.created_at > filter.until ||
          (filter.since !== undefined && event.created_at < filter.since)) {
        throw new Error('Relay returned an invalid or out-of-range guestbook event');
      }
      events.set(event.id, event);
      if (events.size > MAX_EVENTS) throw new Error('Guestbook exceeds backup event limit');
    }
    return page;
  };
  for (let pageNumber = 0; pageNumber <= MAX_EVENTS && until >= 0; pageNumber++) {
    const page = await read({ until });
    if (!page.length) return [...events.values()];
    const oldest = Math.min(...page.map((event) => event.created_at));
    const boundary = await read({ since: oldest, until: oldest });
    if (boundary.length >= limit) throw new Error('Timestamp boundary is saturated; refusing incomplete backup');
    until = oldest - 1;
  }
  if (until < 0) return [...events.values()];
  throw new Error('Guestbook pagination limit reached');
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw error;
  }
}

async function saveJson(path, value) {
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2) + '\n');
  await rename(`${path}.tmp`, path);
}

async function relayInformation(url) {
  // NIP-11 can advertise a lower cap. Failure to obtain it does not imply that
  // WebSocket reads are unavailable; use a modest default in that case.
  try {
    const response = await fetch(url.replace('wss:', 'https:'), {
      headers: { Accept: 'application/nostr+json' }, signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return { limit: 100 };
    const info = await response.json();
    const maximum = info.limitation?.max_limit;
    const limit = Number.isInteger(maximum) && maximum > 0 ? Math.min(100, maximum) : 100;
    const policy = ['auth_required', 'payment_required', 'restricted_writes'].find((name) => info.limitation?.[name] === true);
    return { limit, ...(policy ? { policy: `NIP-11 ${policy}` } : {}) };
  } catch { /* Use the default below. */ }
  return { limit: 100 };
}

async function report(title, rows) {
  console.log(title);
  for (const row of rows) console.log(JSON.stringify(row));
  if (process.env.GITHUB_STEP_SUMMARY) {
    // Store data as escaped HTML rather than trusting relay-supplied Markdown.
    const escaped = JSON.stringify(rows, null, 2).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `### ${title}\n\n<pre>${escaped}</pre>\n\n`);
  }
}

export async function collect(archivePath, planPath, { relays = SYNC_RELAYS, sleep = pause } = {}) {
  const archive = await readJson(archivePath, { version: 1, events: [] });
  if (archive.version !== 1 || !Array.isArray(archive.events) || archive.events.length > MAX_EVENTS ||
      !archive.events.every((event) => acceptable(event))) throw new Error('Invalid backup; refusing to overwrite it');
  const snapshots = await mapConcurrent(relays, 8, async (url) => {
    try {
      const { limit, policy } = await relayInformation(url);
      if (policy) return { url, error: policy };
      return await withRelay(url, async (relay, attempts) => ({ url, limit, attempts, events: await collectRelay(relay, limit) }), { sleep });
    } catch (error) { return { url, error: error.message }; }
  });
  const successful = snapshots.filter((snapshot) => !snapshot.error);
  if (!successful.length) {
    await report('Guestbook collection failed', snapshots);
    throw new Error('No relay completed a read; backup left unchanged');
  }
  const events = mergeEvents(archive.events, ...successful.map((snapshot) => snapshot.events));
  if (events.length > MAX_EVENTS) throw new Error('Merged backup exceeds event limit');
  // Persist the archive in Git before the separate publish command is run.
  await saveJson(archivePath, { version: 1, events });
  const destinations = snapshots.map(({ url, events, error, limit, attempts }) => ({ url, limit, attempts, ids: events?.map((event) => event.id) ?? [], ...(error ? { error } : {}) }));
  await saveJson(planPath, { version: 1, created_at: Math.floor(Date.now() / 1000), relays: destinations });
  await report('Guestbook collected', destinations.map(({ url, ids, error, attempts }) => ({ url, events: ids.length, attempts, ...(error ? { error } : {}) })));
  console.log(`Archived ${events.length} current records, including ${events.filter((event) => !event.content).length} removals.`);
}

export async function publish(archivePath, planPath, { relays = SYNC_RELAYS, sleep = pause } = {}) {
  const archive = await readJson(archivePath);
  const plan = await readJson(planPath);
  const blocked = await readJson(new URL('../src/lib/os/guestbook-blocked.json', import.meta.url));
  if (archive.version !== 1 || !Array.isArray(archive.events) || !archive.events.every((event) => acceptable(event)) ||
      plan.version !== 1 || !Array.isArray(plan.relays) || !Number.isInteger(plan.created_at) ||
      Math.abs(Date.now() / 1000 - plan.created_at) > 1800) throw new Error('Invalid or stale replication plan');
  if (archive.events.length > MAX_EVENTS || plan.relays.length > relays.length ||
      new Set(plan.relays.map((snapshot) => snapshot.url)).size !== plan.relays.length ||
      plan.relays.some((snapshot) => !relays.includes(snapshot.url) || !Array.isArray(snapshot.ids) ||
        snapshot.ids.some((id) => typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) ||
        (snapshot.limit !== undefined && (!Number.isInteger(snapshot.limit) || snapshot.limit < 1 || snapshot.limit > 100)))) {
    throw new Error('Invalid replication destinations');
  }
  const desired = missingEvents(archive.events, [], blocked);
  const rows = await mapConcurrent(plan.relays, 6, async (snapshot) => {
    if (snapshot.error) {
      return { url: snapshot.url, skipped: snapshot.error, retry: 'Next scheduled run' };
    }
    const events = missingEvents(desired, snapshot.ids, blocked);
    const result = { url: snapshot.url, expected: desired.length, verified: desired.length - events.length, missing: events.length, accepted: 0, rejected: 0 };
    if (events.length) {
      // Keep acknowledged progress on reconnect; only the unacknowledged event
      // may be sent again, still with its original ID and signature.
      let cursor = 0;
      events.sort((a, b) => Number(!!a.content) - Number(!!b.content));
      const batch = events.slice(0, MAX_PUBLISH_PER_RELAY);
      result.deferred = events.length - batch.length;
      try {
        await withRelay(snapshot.url, async (relay, attempts) => {
          result.attempts = attempts;
          while (cursor < batch.length) {
            const ack = await relay.publish(batch[cursor]);
            if (ack.accepted) result.accepted++;
            else { result.rejected++; result.lastRejection = ack.reason; }
            cursor++;
            await sleep(250);
          }
          // An OK is not evidence that a query can retrieve the event. Count
          // coverage using readback, not connections or ACKs alone.
          const stored = new Set((await collectRelay(relay, snapshot.limit ?? 100)).map((event) => event.id));
          result.verified = desired.filter((event) => stored.has(event.id)).length;
        }, { sleep });
      } catch (error) { result.error = error.message; }
    }
    result.remaining = result.expected - result.verified;
    result.complete = result.remaining === 0;
    return result;
  });
  await report('Guestbook replication', rows);
  const coverage = { candidates: rows.length, readable: rows.filter((row) => !row.skipped).length, complete: rows.filter((row) => row.complete).length, expected: desired.length };
  await report('Guestbook relay coverage', [coverage]);
  const incomplete = rows.filter((row) => !row.complete).length;
  if (incomplete) {
    const warning = `${incomplete}/${rows.length} relays incomplete or unavailable; backup saved, retry next scheduled run`;
    console.warn(process.env.GITHUB_ACTIONS ? `::warning::${warning}` : warning);
  }
  return { rows, coverage };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({ options: { archive: { type: 'string' }, plan: { type: 'string' } }, allowPositionals: true });
  if (!values.archive || !values.plan || positionals.length !== 1 || !['collect', 'publish'].includes(positionals[0])) {
    console.error('Usage: node scripts/sync-guestbook.mjs collect|publish --archive PATH --plan PATH');
    process.exitCode = 1;
  } else {
    try { await (positionals[0] === 'collect' ? collect : publish)(values.archive, values.plan); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
