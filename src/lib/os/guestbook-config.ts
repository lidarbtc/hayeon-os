/** Shared by the browser and the scheduled guestbook backup/replication job. */
export const RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.nostr.net',
  'wss://nostr.oxtr.dev',
  'wss://offchain.pub',
  'wss://relay.damus.io'
];

export const KIND_NOTE = 30078;
export const TOPIC = 'hayeon-os-guestbook';
export const POW = 16;
