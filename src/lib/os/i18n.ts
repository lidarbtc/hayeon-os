// HaYeon OS speaks Korean and English. The language is settled once per page
// load: a ?lang= in the address first, then the visitor's earlier choice, then
// the browser's first language. Switching restarts the page, the way a desktop
// asks you to sign out before a new display language takes effect.

export type Lang = 'ko' | 'en';

const KEY = 'hayeon-os:lang';

function pick(value: unknown): Lang | null {
  return value === 'ko' || value === 'en' ? value : null;
}

function detect(): Lang {
  try {
    const asked = pick(new URLSearchParams(location.search).get('lang'));
    if (asked) return asked;
  } catch {
    // No address to read, as in a test runner.
  }
  try {
    const saved = pick(localStorage.getItem(KEY));
    if (saved) return saved;
  } catch {
    // Storage can be switched off.
  }
  const first = (typeof navigator === 'undefined' ? '' : (navigator.languages?.[0] ?? navigator.language)) || '';
  return first.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export const lang: Lang = detect();
export const locale = lang === 'ko' ? 'ko-KR' : 'en-US';

/** The Korean or the English wording, whichever this page speaks. */
export function t(ko: string, en: string) {
  return lang === 'en' ? en : ko;
}

/** "922일째" or "Day 922". */
export function dayCount(n: number) {
  return lang === 'en' ? 'Day ' + n.toLocaleString(locale) : n.toLocaleString(locale) + '일째';
}

/** "5개 항목" or "5 items". */
export function itemCount(n: number) {
  return lang === 'en' ? n + (n === 1 ? ' item' : ' items') : n + '개 항목';
}

/** Reopens the page in the other language and remembers the choice. */
export function reopenIn(next: Lang) {
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // The address below still carries the choice for this visit.
  }
  const url = new URL(location.href);
  url.searchParams.set('lang', next);
  location.replace(url.href);
}
