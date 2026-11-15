/// <reference types="svelte" />
/// <reference types="vite/client" />

/** Photo id → short content hash, filled in by vite.config.ts. */
declare const __PHOTO_REVS__: Record<string, string>;

/** Content hash of pack.bin, or empty when there is none (the dev server). */
declare const __PACK_REV__: string;
