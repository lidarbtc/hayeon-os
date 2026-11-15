import { t } from './i18n';
import { ARCHIVE_URL, REPO_URL, TRIPLES_URL, outbound } from './about';
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
  /** Set on shortcuts to other websites, which get the little arrow. */
  link?: string;
  open(): void;
}

function website(id: string, label: string, icon: IconName, url: string): Shortcut {
  const link = outbound(url);
  return { id, label, icon, link, open: () => void window.open(link, '_blank', 'noopener') };
}

export const shortcuts = {
  computer: { id: 'computer', label: t('내 컴퓨터', 'My Computer'), icon: 'computer', open: () => openFolder('') },
  documents: { id: 'documents', label: t('내 문서', 'My Documents'), icon: 'folder', open: () => openFolder(DOCUMENTS) },
  photos: {
    id: 'photos',
    label: t('내 사진', 'My Pictures'),
    icon: 'pictures',
    open: () => {
      wm.open('photos');
    }
  },
  profile: {
    id: 'profile',
    label: t('프로필', 'Profile'),
    icon: 'profile',
    open: () => {
      wm.open('profile');
    }
  },
  guestbook: {
    id: 'guestbook',
    label: t('방명록', 'Guestbook'),
    icon: 'guestbook',
    open: () => {
      wm.open('guestbook');
    }
  },
  bin: {
    id: 'bin',
    label: t('휴지통', 'Recycle Bin'),
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
    label: t('메모장', 'Notepad'),
    icon: 'notepad',
    open: () => {
      wm.open('notepad', { key: newNoteKey() });
    }
  },
  readme: {
    id: 'readme',
    label: t('읽어보기.txt', 'Readme.txt'),
    icon: 'text',
    open: () => openTextFile({ kind: 'static', path: README })
  },
  system: {
    id: 'system',
    label: t('시스템 속성', 'System Properties'),
    icon: 'system',
    open: () => {
      wm.open('system');
    }
  },
  hedgehog: {
    id: 'hedgehog',
    label: t('고슴도치 찾기', 'Hedgehog Finder'),
    icon: 'hedgehog',
    open: () => {
      wm.open('hedgehog');
    }
  },
  player: {
    id: 'player',
    label: t('미디어 플레이어', 'Media Player'),
    icon: 'player',
    open: () => {
      wm.open('player');
    }
  },
  terminal: {
    id: 'terminal',
    label: t('터미널', 'Terminal'),
    icon: 'terminal',
    open: () => {
      wm.open('terminal');
    }
  },
  control: {
    id: 'control',
    label: t('제어판', 'Control Panel'),
    icon: 'control',
    open: () => {
      wm.open('control');
    }
  },
  archive: website('archive', t('하연 아카이브', 'Hayeon Archive'), 'archive', ARCHIVE_URL),
  triples: website('triples', 'triples.love', 'triples', TRIPLES_URL),
  github: website('github', 'GitHub', 'github-tile', REPO_URL)
} satisfies Record<string, Shortcut>;
