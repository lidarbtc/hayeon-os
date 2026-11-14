// A very small Nostr client: just enough to sign notes, give them a little
// proof of work and talk to a handful of public relays. Loaded on demand, so the
// cryptography stays out of the first download.

import { schnorr } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export type Filter = Record<string, unknown>;

const HEX64 = /^[0-9a-f]{64}$/;

export function newSecret() {
  return bytesToHex(randomBytes(32));
}

export function publicKey(secret: string) {
  return bytesToHex(schnorr.getPublicKey(hexToBytes(secret)));
}

export function randomId() {
  return bytesToHex(randomBytes(6));
}

function hash(text: string) {
  return bytesToHex(sha256(utf8ToBytes(text)));
}

function eventId(event: Omit<NostrEvent, 'id' | 'sig'>) {
  return hash(JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content]));
}

/** How many zero bits the id starts with: the note's proof of work (NIP-13). */
export function leadingZeroBits(hex: string) {
  let bits = 0;
  for (const char of hex) {
    const value = parseInt(char, 16);
    if (value === 0) {
      bits += 4;
      continue;
    }
    bits += Math.clz32(value) - 28;
    break;
  }
  return bits;
}

/**
 * Build and sign an event. With pow set, a nonce is searched for until the id
 * starts with that many zero bits. The search runs in slices so the page stays alive.
 */
export async function build(secret: string, kind: number, tags: string[][], content: string, pow = 0): Promise<NostrEvent> {
  const pubkey = publicKey(secret);
  const created_at = Math.floor(Date.now() / 1000);
  let all = tags;
  if (pow > 0) {
    // Only the nonce changes between tries, so the text around it is prepared once.
    const list = JSON.stringify(tags);
    const head =
      JSON.stringify([0, pubkey, created_at, kind]).slice(0, -1) + ',' + list.slice(0, -1) + (tags.length ? ',' : '') + '["nonce","';
    const tail = '","' + pow + '"]],' + JSON.stringify(content) + ']';
    for (let nonce = 0; ; nonce++) {
      if (leadingZeroBits(hash(head + nonce + tail)) >= pow) {
        all = [...tags, ['nonce', String(nonce), String(pow)]];
        break;
      }
      if (nonce % 4000 === 3999) await new Promise((resolve) => setTimeout(resolve));
    }
  }
  const draft = { pubkey, created_at, kind, tags: all, content };
  const id = eventId(draft);
  return { ...draft, id, sig: bytesToHex(schnorr.sign(hexToBytes(id), hexToBytes(secret))) };
}

function wellFormed(event: NostrEvent) {
  return (
    typeof event === 'object' &&
    event !== null &&
    HEX64.test(event.id) &&
    HEX64.test(event.pubkey) &&
    typeof event.sig === 'string' &&
    /^[0-9a-f]{128}$/.test(event.sig) &&
    Number.isInteger(event.created_at) &&
    Number.isInteger(event.kind) &&
    typeof event.content === 'string' &&
    Array.isArray(event.tags) &&
    event.tags.every((tag) => Array.isArray(tag) && tag.every((item) => typeof item === 'string'))
  );
}

/** True when the id, the proof of work and the signature all hold. Relays are not trusted for any of them. */
export function valid(event: NostrEvent, pow = 0) {
  try {
    if (!wellFormed(event) || eventId(event) !== event.id) return false;
    if (pow > 0 && leadingZeroBits(event.id) < pow) return false;
    return schnorr.verify(hexToBytes(event.sig), hexToBytes(event.id), hexToBytes(event.pubkey));
  } catch {
    return false;
  }
}

interface Handlers {
  event(subscription: string, event: NostrEvent): void;
  /** Called with the number of relays that are connected right now. */
  status(open: number): void;
}

/** Keeps a socket open to every relay, reconnecting with a growing pause. */
export class Pool {
  #sockets = new Map<string, WebSocket>();
  #subscriptions = new Map<string, Filter>();
  #seen = new Set<string>();
  #acks = new Map<string, (accepted: boolean) => void>();
  #handlers: Handlers;

  constructor(urls: string[], handlers: Handlers) {
    this.#handlers = handlers;
    for (const url of urls) this.#connect(url, 0);
  }

  get open() {
    return [...this.#sockets.values()].filter((socket) => socket.readyState === WebSocket.OPEN);
  }

  #connect(url: string, attempt: number) {
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      return;
    }
    this.#sockets.set(url, socket);
    socket.onopen = () => {
      attempt = 0;
      for (const [id, filter] of this.#subscriptions) socket.send(JSON.stringify(['REQ', id, filter]));
      this.#handlers.status(this.open.length);
    };
    socket.onmessage = (message) => {
      let data: unknown;
      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }
      if (!Array.isArray(data)) return;
      if (data[0] === 'EVENT' && typeof data[1] === 'string' && data[2]?.id) {
        const key = data[1] + data[2].id;
        if (this.#seen.has(key)) return;
        if (this.#seen.size > 5000) this.#seen.clear();
        this.#seen.add(key);
        this.#handlers.event(data[1], data[2]);
      } else if (data[0] === 'OK' && typeof data[1] === 'string') {
        this.#acks.get(data[1])?.(data[2] === true);
      }
    };
    socket.onclose = () => {
      this.#handlers.status(this.open.length);
      setTimeout(() => this.#connect(url, attempt + 1), Math.min(60_000, 4000 * 2 ** attempt));
    };
  }

  subscribe(id: string, filter: Filter) {
    this.#subscriptions.set(id, filter);
    for (const socket of this.open) socket.send(JSON.stringify(['REQ', id, filter]));
  }

  /** Send to every connected relay without waiting for an answer. */
  send(event: NostrEvent) {
    for (const socket of this.open) socket.send(JSON.stringify(['EVENT', event]));
  }

  /** Resolves true as soon as one relay accepts the event, false when none does. */
  publish(event: NostrEvent) {
    const sockets = this.open;
    if (!sockets.length) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      let waiting = sockets.length;
      const finish = (accepted: boolean) => {
        clearTimeout(timer);
        this.#acks.delete(event.id);
        resolve(accepted);
      };
      const timer = setTimeout(() => finish(false), 7000);
      this.#acks.set(event.id, (accepted) => {
        if (accepted) finish(true);
        else if (--waiting === 0) finish(false);
      });
      this.send(event);
    });
  }
}
