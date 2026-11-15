// Files the visitor writes live in one folder (C:\내 문서) and are kept in
// localStorage. Deleting moves a file to the recycle bin; emptying the bin is final.
import { locale, t } from './i18n';

const STORAGE_KEY = 'hayeon-os:files:v1';
const DAY = 86_400_000;

export interface UserFile {
  id: string;
  name: string;
  content: string;
  modified: number;
  /** null while the file is in 내 문서, a timestamp once it is in the recycle bin. */
  deletedAt: number | null;
}

/** A fresh install ships with a few abandoned resolutions already in the bin. */
function seed(): UserFile[] {
  const now = Date.now();
  const dropped: [string, string, number][] = [
    [t('내일부터 일찍 자기.txt', 'Early to bed from tomorrow.txt'), t('오늘까지만 늦게 자고.', 'Just one more late night.'), 2],
    [
      t('아침 운동 계획.txt', 'Morning workout plan.txt'),
      t(
        '월: 쉬는 날\n화: 비 옴\n수: 쉬는 날\n목: 약속 있음\n금: 금요일인데?\n토, 일: 주말',
        'Mon: rest day\nTue: raining\nWed: rest day\nThu: plans\nFri: it’s Friday though?\nSat, Sun: weekend'
      ),
      5
    ],
    [t('이번 달은 아껴 쓰기.txt', 'Spend less this month.txt'), t('택배 3개 배송 중.', '3 parcels on the way.'), 9],
    [t('하루에 물 2리터.txt', '2 liters of water a day.txt'), t('커피도 물이다.', 'Coffee counts as water.'), 19]
  ];
  return dropped.map(([name, content, days], index) => ({
    id: 'seed-' + index,
    name,
    content,
    modified: now - (days + 1) * DAY,
    deletedAt: now - days * DAY
  }));
}

function isFile(value: unknown): value is UserFile {
  const file = value as UserFile;
  return (
    typeof file === 'object' &&
    file !== null &&
    typeof file.id === 'string' &&
    typeof file.name === 'string' &&
    typeof file.content === 'string' &&
    typeof file.modified === 'number' &&
    (file.deletedAt === null || typeof file.deletedAt === 'number')
  );
}

function load(): UserFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data?.files)) return data.files.filter(isFile);
    }
  } catch {
    // Storage can be blocked or hold something unreadable; start fresh in memory.
  }
  return seed();
}

const collator = new Intl.Collator(locale);

class FileSystem {
  files = $state<UserFile[]>(load());

  get documents() {
    return this.files.filter((file) => file.deletedAt === null).sort((a, b) => collator.compare(a.name, b.name));
  }

  get trash() {
    return this.files.filter((file) => file.deletedAt !== null).sort((a, b) => b.deletedAt! - a.deletedAt!);
  }

  #save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ files: this.files }));
    } catch {
      // Without storage the files simply last until the tab closes.
    }
  }

  get(id: string) {
    return this.files.find((file) => file.id === id);
  }

  /** Look a name up in 내 문서, ignoring case as Windows does. */
  byName(name: string) {
    const wanted = name.toLowerCase();
    return this.files.find((file) => file.deletedAt === null && file.name.toLowerCase() === wanted);
  }

  /** "메모.txt" stays as is when free, otherwise becomes "메모 (2).txt" and so on. */
  uniqueName(name: string) {
    if (!this.byName(name)) return name;
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let n = 2;
    while (this.byName(stem + ' (' + n + ')' + ext)) n++;
    return stem + ' (' + n + ')' + ext;
  }

  create(name: string, content: string) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    this.files.push({ id, name, content, modified: Date.now(), deletedAt: null });
    this.#save();
    return this.get(id)!;
  }

  write(id: string, content: string) {
    const file = this.get(id);
    if (!file) return;
    file.content = content;
    file.modified = Date.now();
    this.#save();
  }

  /** Move a file to the recycle bin. */
  remove(id: string) {
    const file = this.get(id);
    if (!file || file.deletedAt !== null) return;
    file.deletedAt = Date.now();
    this.#save();
  }

  restore(id: string) {
    const file = this.get(id);
    if (!file || file.deletedAt === null) return;
    file.name = this.uniqueName(file.name);
    file.deletedAt = null;
    this.#save();
  }

  restoreAll() {
    for (const file of this.trash) this.restore(file.id);
  }

  emptyTrash() {
    this.files = this.files.filter((file) => file.deletedAt === null);
    this.#save();
  }
}

export const fs = new FileSystem();

export function fileSize(content: string) {
  return Math.max(1, Math.ceil(new TextEncoder().encode(content).length / 1024)) + 'KB';
}

const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' });

export function formatDate(time: number) {
  return dateFormat.format(time);
}
