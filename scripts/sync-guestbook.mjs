// Node 24: native WebSocket and TypeScript stripping; no signing key is needed.
import { readFile, writeFile, rename, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout as pause } from 'node:timers/promises';
import { valid } from '../src/lib/os/nostr.ts';
import { KIND_NOTE, POW, RELAYS, TOPIC } from '../src/lib/os/guestbook-config.ts';

const TIMEOUT = 12_000;
const MAX_EVENTS = 20_000;
const MAX_PUBLISH_PER_RELAY = 500;
const FILTER = { kinds: [KIND_NOTE], '#t': [TOPIC] };
const tag = (event, name) => event.tags.find((item) => item[0] === name)?.[1];
const key = (event) => `${event.pubkey}:${event.kind}:${tag(event, 'd')}`;

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
      const closed = () => finish(new Error('Connection closed or failed'));
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
      const timer = setTimeout(() => finish(new Error('Relay timed out')), this.timeout);
      socket.addEventListener('message', message);
      socket.addEventListener('close', closed);
      socket.addEventListener('error', closed);
      if (readyEvent) socket.addEventListener('open', opened);
      try {
        if (outbound) {
          if (socket.readyState !== 1) throw new Error('Relay is not open');
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
  for (let pageNumber = 0; pageNumber < 1000 && until >= 0; pageNumber++) {
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

async function pageLimit(url) {
  // NIP-11 can advertise a lower cap. Failure to obtain it does not imply that
  // WebSocket reads are unavailable; use a modest default in that case.
  try {
    const response = await fetch(url.replace('wss:', 'https:'), {
      headers: { Accept: 'application/nostr+json' }, signal: AbortSignal.timeout(5000)
    });
    const maximum = (await response.json()).limitation?.max_limit;
    if (Number.isInteger(maximum) && maximum > 0) return Math.min(100, maximum);
  } catch { /* Use the default below. */ }
  return 100;
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

export async function collect(archivePath, planPath) {
  const archive = await readJson(archivePath, { version: 1, events: [] });
  if (archive.version !== 1 || !Array.isArray(archive.events) || archive.events.length > MAX_EVENTS ||
      !archive.events.every((event) => acceptable(event))) throw new Error('Invalid backup; refusing to overwrite it');
  const snapshots = await Promise.all(RELAYS.map(async (url) => {
    let relay;
    try {
      const limit = await pageLimit(url);
      relay = new Relay(url);
      await relay.connect();
      return { url, events: await collectRelay(relay, limit) };
    } catch (error) { return { url, error: error.message }; }
    finally { relay?.close(); }
  }));
  const successful = snapshots.filter((snapshot) => !snapshot.error);
  if (!successful.length) {
    await report('Guestbook collection failed', snapshots);
    throw new Error('No relay completed a read; backup left unchanged');
  }
  const events = mergeEvents(archive.events, ...successful.map((snapshot) => snapshot.events));
  if (events.length > MAX_EVENTS) throw new Error('Merged backup exceeds event limit');
  // Persist the archive in Git before the separate publish command is run.
  await saveJson(archivePath, { version: 1, events });
  const relays = snapshots.map(({ url, events, error }) => ({ url, ids: events?.map((event) => event.id) ?? [], ...(error ? { error } : {}) }));
  await saveJson(planPath, { version: 1, created_at: Math.floor(Date.now() / 1000), relays });
  await report('Guestbook collected', relays.map(({ url, ids, error }) => ({ url, events: ids.length, ...(error ? { error } : {}) })));
  console.log(`Archived ${events.length} current records, including ${events.filter((event) => !event.content).length} removals.`);
}

export async function publish(archivePath, planPath) {
  const archive = await readJson(archivePath);
  const plan = await readJson(planPath);
  const blocked = await readJson(new URL('../src/lib/os/guestbook-blocked.json', import.meta.url));
  if (archive.version !== 1 || !Array.isArray(archive.events) || !archive.events.every((event) => acceptable(event)) ||
      plan.version !== 1 || !Array.isArray(plan.relays) || !Number.isInteger(plan.created_at) ||
      Math.abs(Date.now() / 1000 - plan.created_at) > 1800) throw new Error('Invalid or stale replication plan');
  const rows = [];
  for (const snapshot of plan.relays) {
    if (!RELAYS.includes(snapshot.url) || snapshot.error) {
      rows.push({ url: snapshot.url, skipped: 'Collection unavailable; retry next run' });
      continue;
    }
    const events = missingEvents(archive.events, snapshot.ids, blocked);
    const result = { url: snapshot.url, missing: events.length, accepted: 0, rejected: 0 };
    if (events.length) {
      const relay = new Relay(snapshot.url);
      try {
        await relay.connect();
        // Send removals first, with a bounded rate and no retries in a tight loop.
        events.sort((a, b) => Number(!!a.content) - Number(!!b.content));
        result.deferred = Math.max(0, events.length - MAX_PUBLISH_PER_RELAY);
        for (const event of events.slice(0, MAX_PUBLISH_PER_RELAY)) {
          const ack = await relay.publish(event);
          if (ack.accepted) result.accepted++;
          else { result.rejected++; result.lastRejection = ack.reason; }
          await pause(250);
        }
      } catch (error) { result.error = error.message; }
      finally { relay.close(); }
    }
    rows.push(result);
  }
  await report('Guestbook replication', rows);
  if (rows.some((row) => row.missing > 0) && !rows.some((row) => row.accepted > 0)) {
    throw new Error('No missing event was accepted; backup is safe, inspect relay errors');
  }
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
