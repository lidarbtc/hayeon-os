// The guestbook. Notes are signed in the browser and kept by public Nostr
// relays, so there is still no server of our own and nothing costs anything.
// Every visitor gets a throwaway key that lives in localStorage.
import { t } from './i18n';
import { REPO_URL, SITE_URL } from './about';
import { KIND_NOTE, POW, RELAYS, TOPIC } from './guestbook-config';

import blockList from './guestbook-blocked.json';
import type { NostrEvent, Pool } from './nostr';

/** Notes the owner has taken down: add an event id or a whole author, then redeploy. */
const blocked: { ids: string[]; pubkeys: string[] } = blockList;

const STORAGE_KEY = 'hayeon-os:guest:v1';

/** An ephemeral kind: relays pass it on but do not keep it. */
const KIND_HERE = 21019;
const HERE = 'hayeon-os-here';
// Keep project links in the signed event, so they survive relay-to-relay forwarding.
const APP_TAGS = [
  ['client', 'HaYeon OS'],
  ['r', SITE_URL],
  ['r', REPO_URL]
];
const HEARTBEAT = 40_000;
const AWAY_AFTER = 95_000;

export const MAX_TEXT = 140;
export const MAX_NAME = 16;
export const colors = ['mint', 'lemon', 'pink', 'sky', 'lilac'] as const;
export type NoteColor = (typeof colors)[number];

export interface Note {
  /** Author and slot: a newer event with the same key replaces the note. */
  key: string;
  id: string;
  pubkey: string;
  slot: string;
  name: string;
  text: string;
  color: NoteColor;
  /** Milliseconds. */
  at: number;
}

function tag(event: NostrEvent, name: string) {
  return event.tags.find((item) => item[0] === name)?.[1] ?? '';
}

function clean(text: string, max: number) {
  return [...text.replace(/[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200f\u2028-\u202f]/g, '').replace(/\n{3,}/g, '\n\n').trim()]
    .slice(0, max)
    .join('');
}

function loadIdentity(): { secret: string | null; name: string } {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      secret: typeof data?.secret === 'string' && /^[0-9a-f]{64}$/.test(data.secret) ? data.secret : null,
      name: typeof data?.name === 'string' ? clean(data.name, MAX_NAME) : ''
    };
  } catch {
    return { secret: null, name: '' };
  }
}

const identity = loadIdentity();

class Guestbook {
  /** Newest first. */
  notes = $state<Note[]>([]);
  /** Relays connected right now. */
  relays = $state(0);
  /** True once connecting has had a fair chance, so "no relays" can be reported as a failure. */
  settled = $state(false);
  /** Visitors seen lately, this one included. */
  online = $state(1);
  name = $state(identity.name);
  busy = $state(false);
  /** Our own public key, once known. */
  me = $state('');

  #started = false;
  #nostr: typeof import('./nostr') | null = null;
  #pool: Pool | null = null;
  #secret = identity.secret;
  /** The latest event per note key, including the empty ones that mark a removal. */
  #latest = new Map<string, NostrEvent>();
  #queue: NostrEvent[] = [];
  #draining = false;
  #seen = new Map<string, number>();
  #lastPost = 0;

  #save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ secret: this.#secret, name: this.name }));
    } catch {
      // Without storage the key lasts until the tab closes.
    }
  }

  /** Connect to the relays. Safe to call more than once. */
  async start() {
    if (this.#started) return;
    this.#started = true;
    try {
      this.#nostr = await import('./nostr');
    } catch {
      this.#started = false;
      this.settled = true;
      return;
    }
    const nostr = this.#nostr;
    if (!this.#secret) {
      this.#secret = nostr.newSecret();
      this.#save();
    }
    this.me = nostr.publicKey(this.#secret);

    this.#pool = new nostr.Pool(RELAYS, {
      status: (open) => {
        const first = this.relays === 0 && open > 0;
        this.relays = open;
        if (first) this.#heartbeat();
      },
      event: (subscription, event) => {
        if (subscription === 'here') this.#sawVisitor(event);
        else this.#enqueue(event);
      }
    });
    this.#pool.subscribe('notes', { kinds: [KIND_NOTE], '#t': [TOPIC], limit: 300 });
    this.#pool.subscribe('here', { kinds: [KIND_HERE], '#t': [HERE], since: Math.floor(Date.now() / 1000) - 60 });

    setTimeout(() => (this.settled = true), 8000);
    setInterval(() => this.#heartbeat(), HEARTBEAT);
    setInterval(() => this.#count(), 15_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.#heartbeat();
    });
  }

  /** Tell the others we are here. Hidden tabs stay quiet and fade from the count. */
  async #heartbeat() {
    if (!this.#nostr || !this.#pool || !this.#secret || document.visibilityState !== 'visible') return;
    this.#seen.set(this.me, Date.now());
    this.#pool.send(await this.#nostr.build(this.#secret, KIND_HERE, [['t', HERE]], ''));
    this.#count();
  }

  #sawVisitor(event: NostrEvent) {
    if (event.kind !== KIND_HERE || !/^[0-9a-f]{64}$/.test(event.pubkey)) return;
    const at = event.created_at * 1000;
    if (Math.abs(Date.now() - at) > AWAY_AFTER) return;
    if (this.#seen.size > 500 && !this.#seen.has(event.pubkey)) return;
    this.#seen.set(event.pubkey, Date.now());
    this.#count();
  }

  #count() {
    const now = Date.now();
    for (const [pubkey, at] of this.#seen) if (now - at > AWAY_AFTER) this.#seen.delete(pubkey);
    this.online = Math.max(1, this.#seen.size);
  }

  // Checking signatures takes a few milliseconds each, so a full page of notes is
  // worked through in small batches.
  #enqueue(event: NostrEvent) {
    this.#queue.push(event);
    if (this.#draining) return;
    this.#draining = true;
    const drain = () => {
      for (const next of this.#queue.splice(0, 6)) this.#accept(next);
      if (this.#queue.length) setTimeout(drain);
      else this.#draining = false;
    };
    setTimeout(drain);
  }

  #accept(event: NostrEvent) {
    if (event.kind !== KIND_NOTE || tag(event, 't') !== TOPIC) return;
    const slot = tag(event, 'd');
    if (!slot || event.created_at * 1000 > Date.now() + 600_000) return;
    const key = event.pubkey + ':' + slot;
    const known = this.#latest.get(key);
    if (known && (known.created_at > event.created_at ||
        (known.created_at === event.created_at && known.id <= event.id))) return;
    // A removal is an empty note and needs no work behind it.
    if (!this.#nostr?.valid(event, event.content ? POW : 0)) return;
    this.#latest.set(key, event);
    this.#publishList();
  }

  #publishList() {
    const notes: Note[] = [];
    for (const [key, event] of this.#latest) {
      const text = clean(event.content, MAX_TEXT);
      if (!text || blocked.ids.includes(event.id) || blocked.pubkeys.includes(event.pubkey)) continue;
      const color = tag(event, 'color') as NoteColor;
      notes.push({
        key,
        id: event.id,
        pubkey: event.pubkey,
        slot: tag(event, 'd'),
        name: clean(tag(event, 'name'), MAX_NAME) || t('익명', 'Anonymous'),
        text,
        color: colors.includes(color) ? color : 'mint',
        at: event.created_at * 1000
      });
    }
    this.notes = notes.sort((a, b) => b.at - a.at);
  }

  /** Returns nothing when the note is up, or a sentence saying why it is not. */
  async post(text: string, color: NoteColor): Promise<string | void> {
    const body = clean(text, MAX_TEXT);
    if (!body) return t('쪽지에 쓸 말을 적어 주세요.', 'Write something on your note first.');
    if (!this.#nostr || !this.#pool || !this.#secret || !this.relays) return t('아직 연결되지 않았습니다. 잠시 뒤에 다시 눌러 주세요.', 'Not connected yet. Try again in a moment.');
    if (Date.now() - this.#lastPost < 20_000) return t('방금 붙였습니다. 조금 있다가 또 남겨 주세요.', 'You just posted a note. Leave another one in a little while.');
    this.busy = true;
    try {
      this.name = clean(this.name, MAX_NAME);
      this.#save();
      const tags = [
        ['d', TOPIC + ':' + this.#nostr.randomId()],
        ['t', TOPIC],
        ['name', this.name],
        ['color', color],
        ...APP_TAGS
      ];
      const event = await this.#nostr.build(this.#secret, KIND_NOTE, tags, body, POW);
      if (!(await this.#pool.publish(event))) return t('릴레이가 쪽지를 받지 않았습니다. 다시 눌러 주세요.', 'Your note didn’t go through. Please try again.');
      this.#lastPost = Date.now();
      this.#accept(event);
    } finally {
      this.busy = false;
    }
  }

  /** Take down one of our own notes by replacing it with an empty one. */
  async remove(note: Note) {
    if (note.pubkey !== this.me || !this.#nostr || !this.#pool || !this.#secret) return;
    const event = await this.#nostr.build(this.#secret, KIND_NOTE, [['d', note.slot], ['t', TOPIC], ...APP_TAGS], '');
    // created_at has one-second steps; a removal in the same second as the note would lose the tie.
    if (event.created_at * 1000 <= note.at) return;
    if (await this.#pool.publish(event)) this.#accept(event);
  }
}

export const guestbook = new Guestbook();
