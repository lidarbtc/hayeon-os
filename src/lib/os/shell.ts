import { DOCUMENTS, README } from './disk';
import { fs } from './fs.svelte';
import type { FileRef, IconName } from './types';
import { wm } from './wm.svelte';

export function refKey(ref: FileRef) {
  return ref.kind === 'user' ? 'user:' + ref.id : 'static:' + ref.path;
}

let notes = 0;

/** Every blank document gets its own key, so 메모장 can be opened as many times as you like. */
export function newNoteKey() {
  return 'new:' + ++notes;
}

/**
 * Open a text file in 메모장, or focus the window that already has it open.
 * A file in the recycle bin opens as a detached copy under a key of its own.
 */
export function openTextFile(ref: FileRef) {
  const trashed = ref.kind === 'user' && fs.get(ref.id)?.deletedAt !== null;
  wm.open('notepad', { key: (trashed ? 'trash:' : '') + refKey(ref), props: { source: ref } });
}

export function openFolder(path: string) {
  wm.open('explorer', { key: path, props: { path } });
}

export interface Shortcut {
  id: string;
  label: string;
  readonly icon: IconName;
  open(): void;
}

export const shortcuts = {
  computer: { id: 'computer', label: '내 컴퓨터', icon: 'computer', open: () => openFolder('') },
  documents: { id: 'documents', label: '내 문서', icon: 'folder', open: () => openFolder(DOCUMENTS) },
  bin: {
    id: 'bin',
    label: '휴지통',
    // Read inside templates, so the desktop icon follows the bin as it fills and empties.
    get icon(): IconName {
      return fs.trash.length ? 'bin-full' : 'bin';
    },
    open: () => {
      wm.open('bin');
    }
  },
  notepad: {
    id: 'notepad',
    label: '메모장',
    icon: 'notepad',
    open: () => {
      wm.open('notepad', { key: newNoteKey() });
    }
  },
  readme: {
    id: 'readme',
    label: '읽어보기.txt',
    icon: 'text',
    open: () => openTextFile({ kind: 'static', path: README })
  },
  system: {
    id: 'system',
    label: '시스템 속성',
    icon: 'system',
    open: () => {
      wm.open('system');
    }
  }
} satisfies Record<string, Shortcut>;
