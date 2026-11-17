import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../src/lib/os/nostr.ts';
import { KIND_NOTE, TOPIC } from '../src/lib/os/guestbook-config.ts';
import { acceptable, mergeEvents, missingEvents, collectRelay, Relay, collect, publish } from './sync-guestbook.mjs';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const now = Math.floor(Date.now() / 1000);
const secret = '1'.padStart(64, '0');
async function fixture(at, slot, content = '') {
  const original = Date.now;
  Date.now = () => at * 1000;
  try {
    return await build(secret, KIND_NOTE, [['d', slot], ['t', TOPIC]], content, content ? 16 : 0);
  } finally { Date.now = original; }
}
const note = await fixture(now - 20, 'note-a', 'A public guestbook note');
const removal = await fixture(now - 10, 'note-a');
const another = await fixture(now - 30, 'note-b', 'Another note');
const tied = await fixture(now - 20, 'note-a');
const emptyBlockList = { ids: [], pubkeys: [] };

test('accepts legacy notes and removals; rejects tampering, other kinds/topics and future dates', async () => {
  assert.equal(acceptable(note), true);
  assert.equal(acceptable(removal), true);
  assert.equal(acceptable({ ...note, content: 'changed' }), false);
  assert.equal(acceptable({ ...note, kind: 21019 }), false);
  assert.equal(acceptable(await build(secret, KIND_NOTE, [['d', 'x'], ['t', 'other']], '')), false);
  assert.equal(acceptable(await fixture(now + 700, 'future')), false);
  assert.equal(acceptable(null), false);
});

test('merges removals over stale copies, preserves signatures, and resolves timestamp ties consistently', () => {
  const original = structuredClone(note);
  assert.deepEqual(mergeEvents([note, another], [removal], [note]), mergeEvents([another, removal]));
  assert.deepEqual(note, original);
  const expected = note.id < tied.id ? note : tied;
  assert.deepEqual(mergeEvents([note], [tied]), [expected]);
  assert.deepEqual(mergeEvents([tied], [note]), [expected]);
});

test('only sends missing events, suppresses moderated notes, and still propagates removals', () => {
  assert.deepEqual(missingEvents([note, another], [note.id], emptyBlockList), [another]);
  assert.deepEqual(missingEvents([note, another], [], { ids: [note.id], pubkeys: [] }), [another]);
  assert.deepEqual(missingEvents([removal, another], [], { ids: [], pubkeys: [note.pubkey] }), [removal]);
});

function reader(records, cap = 100) {
  const requests = [];
  return {
    requests,
    async query(filter) {
      requests.push(filter);
      return records.filter((event) => event.created_at <= filter.until &&
        (filter.since === undefined || event.created_at >= filter.since))
        .sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id)).slice(0, Math.min(cap, filter.limit));
    }
  };
}

test('paginates past short pages and keeps boundary events and empty replacements', async () => {
  const relay = reader([note, removal, another], 1);
  const result = await collectRelay(relay, 2, now);
  assert.deepEqual(new Set(result.map((event) => event.id)), new Set([note.id, removal.id, another.id]));
  assert.ok(relay.requests.length > 3);
});

test('fails instead of silently dropping a saturated timestamp boundary', async () => {
  const extra = await fixture(note.created_at, 'extra');
  await assert.rejects(collectRelay(reader([note, tied, extra]), 2, now), /boundary is saturated/);
});

test('refuses out-of-range responses', async () => {
  await assert.rejects(collectRelay({ query: async () => [{ ...note, created_at: now + 1000 }] }, 100, now), /invalid or out-of-range/);
});

class FakeSocket extends EventTarget {
  readyState = 1;
  sent = [];
  constructor(respond) { super(); this.respond = respond; }
  send(wire) {
    const message = JSON.parse(wire);
    this.sent.push(message);
    queueMicrotask(() => this.respond?.(message, this));
  }
  receive(message) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) })); }
  close() { this.readyState = 3; this.dispatchEvent(new Event('close')); }
}

test('requires EOSE, closes subscriptions, preserves the full published event, and handles ACK refusal', async () => {
  const socket = new FakeSocket((message, ws) => {
    if (message[0] === 'REQ') {
      ws.receive(['EVENT', message[1], note]);
      ws.receive(['EOSE', message[1]]);
    } else if (message[0] === 'EVENT') ws.receive(['OK', message[1].id, false, 'blocked: policy']);
  });
  const relay = new Relay('unused', () => socket, 30);
  assert.deepEqual(await relay.query({ limit: 100 }), [note]);
  assert.ok(socket.sent.some((message) => message[0] === 'CLOSE'));
  assert.deepEqual(await relay.publish(note), { accepted: false, reason: 'blocked: policy' });
  assert.deepEqual(socket.sent.find((message) => message[0] === 'EVENT'), ['EVENT', note]);
  relay.close();
});

test('does not treat timeout or CLOSED as an empty successful query', async () => {
  const silent = new Relay('unused', () => new FakeSocket(), 5);
  await assert.rejects(silent.query({ limit: 100 }), /timed out/);
  silent.close();
  const closed = new Relay('unused', () => new FakeSocket((message, ws) => {
    if (message[0] === 'REQ') ws.receive(['CLOSED', message[1], 'auth-required: private']);
  }), 30);
  await assert.rejects(closed.query({ limit: 100 }), /Subscription refused/);
  closed.close();
});

test('collection makes no writes; backup restores missing copies without resurrecting a removed note', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'guestbook-sync-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const archive = join(directory, 'events.json');
  const plan = join(directory, 'plan.json');
  await writeFile(archive, JSON.stringify({ version: 1, events: [note, another] }));
  const writes = [];
  // Every relay now has the removal, but has lost the other note.
  t.mock.method(globalThis, 'fetch', async () => ({ json: async () => ({ limitation: { max_limit: 100 } }) }));
  t.mock.method(globalThis, 'WebSocket', function () {
    return new FakeSocket((message, ws) => {
      if (message[0] === 'REQ') {
        const filter = message[2];
        if (removal.created_at <= filter.until && (filter.since === undefined || removal.created_at >= filter.since)) {
          ws.receive(['EVENT', message[1], removal]);
        }
        ws.receive(['EOSE', message[1]]);
      } else if (message[0] === 'EVENT') {
        writes.push(message[1]);
        ws.receive(['OK', message[1].id, true, '']);
      }
    });
  });
  await collect(archive, plan);
  assert.equal(writes.length, 0);
  const saved = JSON.parse(await readFile(archive, 'utf8'));
  assert.deepEqual(saved.events, mergeEvents([removal, another]));
  await publish(archive, plan);
  assert.equal(writes.length, 5);
  assert.ok(writes.every((event) => JSON.stringify(event) === JSON.stringify(another)));
});

test('corrupt backups fail before any network call or overwrite', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'guestbook-corrupt-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const archive = join(directory, 'events.json');
  const corrupt = '{not json';
  await writeFile(archive, corrupt);
  await assert.rejects(collect(archive, join(directory, 'plan.json')));
  assert.equal(await readFile(archive, 'utf8'), corrupt);
});

test('all-source failure preserves the backup and produces no replication plan', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'guestbook-unavailable-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const archive = join(directory, 'events.json');
  const plan = join(directory, 'plan.json');
  const saved = JSON.stringify({ version: 1, events: [removal, another] });
  await writeFile(archive, saved);
  t.mock.method(globalThis, 'fetch', async () => ({ json: async () => ({}) }));
  t.mock.method(globalThis, 'WebSocket', function () {
    return new FakeSocket((message, ws) => {
      if (message[0] === 'REQ') ws.receive(['CLOSED', message[1], 'restricted: unavailable']);
    });
  });
  await assert.rejects(collect(archive, plan), /No relay completed/);
  assert.equal(await readFile(archive, 'utf8'), saved);
  await assert.rejects(readFile(plan), { code: 'ENOENT' });
});

test('partial source failure keeps archived removals and excludes unavailable destinations', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'guestbook-partial-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const archive = join(directory, 'events.json');
  const plan = join(directory, 'plan.json');
  await writeFile(archive, JSON.stringify({ version: 1, events: [removal] }));
  const writes = [];
  t.mock.method(globalThis, 'fetch', async () => ({ json: async () => ({}) }));
  t.mock.method(globalThis, 'WebSocket', function (url) {
    return new FakeSocket((message, ws) => {
      if (message[0] === 'REQ') {
        if (url.includes('primal')) {
          ws.receive(['CLOSED', message[1], 'restricted: unavailable']);
          return;
        }
        const filter = message[2];
        if (note.created_at <= filter.until && (filter.since === undefined || note.created_at >= filter.since)) {
          ws.receive(['EVENT', message[1], note]);
        }
        ws.receive(['EOSE', message[1]]);
      } else if (message[0] === 'EVENT') {
        writes.push({ url, event: message[1] });
        ws.receive(['OK', message[1].id, true, '']);
      }
    });
  });
  await collect(archive, plan);
  await publish(archive, plan);
  assert.equal(writes.length, 4);
  assert.ok(writes.every(({ url, event }) => !url.includes('primal') && event.id === removal.id));
  assert.deepEqual(JSON.parse(await readFile(archive, 'utf8')).events, [removal]);
});
