// What this computer knows about its favourite person. Collected by fans, so
// treat it as a fan's notes rather than an official record.
import { lang, t } from './i18n';

const profileKo: [string, string][] = [
  ['이름', '정하연 (Jeong HaYeon)'],
  ['영어 이름', 'Luna Jeong'],
  ['S 번호', 'S19'],
  ['생일', '2007년 8월 1일'],
  ['고향', '경기도 안양'],
  ['색', 'Medium Turquoise #52D9BB'],
  ['포지션', '보컬, 댄스 · zenith 리더'],
  ['유닛', 'NXT, Alphie, zenith'],
  ['MBTI', 'ENTP'],
  ['별명', '고슴도치, 햄스터, 고양이, 초코볼'],
  ['취미', '글쓰기, 먹기, 예쁜 카페 찾기'],
  ['특기', '돌고래 고음, 초상화 그리기']
];

const profileEn: [string, string][] = [
  ['Name', 'Jeong HaYeon (정하연)'],
  ['English name', 'Luna Jeong'],
  ['S number', 'S19'],
  ['Birthday', 'August 1, 2007'],
  ['Hometown', 'Anyang, Gyeonggi-do'],
  ['Color', 'Medium Turquoise #52D9BB'],
  ['Position', 'Vocal, dance · zenith leader'],
  ['Units', 'NXT, Alphie, zenith'],
  ['MBTI', 'ENTP'],
  ['Nicknames', 'Hedgehog, hamster, cat, choco ball'],
  ['Hobbies', 'Writing, eating, finding pretty cafés'],
  ['Strengths', 'Dolphin high notes, drawing portraits']
];

export const profile = lang === 'en' ? profileEn : profileKo;

export const timeline: { date: string; text: string }[] = [
  { date: '2023.12.23', text: t('S19로 공개. NXT 〈Just Do It〉', 'Revealed as S19. NXT “Just Do It”') },
  { date: '2024.01.22', text: t('하우스 입주', 'Moved into the tripleS house') },
  { date: '2024.02.04', text: t('첫 콘서트, Authentic 서울 공연', 'First concert, Authentic in Seoul') },
  { date: '2024.05.08', text: t('ASSEMBLE24 〈Girls Never Die〉로 정식 데뷔', 'Official debut with ASSEMBLE24 “Girls Never Die”') },
  { date: '2025.01.11', text: t('tripleS Come True 투어 시작', 'tripleS Come True tour begins') },
  { date: '2025.05.12', text: t('ASSEMBLE25 〈깨어 (Are You Alive)〉', 'ASSEMBLE25 “Are You Alive”') },
  { date: '2025.09.03', text: t('zenith 리더로 공개', 'Revealed as the leader of zenith') },
  { date: '2025.11.24', text: t('zenith 〈Q&A〉, Beyond Beauty', 'zenith “Q&A”, Beyond Beauty') },
  { date: '2026.02.11', text: t('고등학교 졸업', 'Graduated from high school') },
  { date: '2026.06.01', text: t('ASSEMBLE26 LOVE&POP 〈Baby Flower〉', 'ASSEMBLE26 LOVE&POP “Baby Flower”') }
];

const REVEAL = new Date(2023, 11, 23);
const DEBUT = new Date(2024, 4, 8);

function dayNumber(date: Date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** Days until the next August 1st; 0 on the day itself. */
export function daysToBirthday(now: Date) {
  let next = new Date(now.getFullYear(), 7, 1);
  if (dayNumber(next) < dayNumber(now)) next = new Date(now.getFullYear() + 1, 7, 1);
  return dayNumber(next) - dayNumber(now);
}

/** Counted the way fans do: the day itself is day 1. */
export function daysSinceReveal(now: Date) {
  return dayNumber(now) - dayNumber(REVEAL) + 1;
}

export function daysSinceDebut(now: Date) {
  return dayNumber(now) - dayNumber(DEBUT) + 1;
}

export function birthdayLabel(now: Date) {
  const days = daysToBirthday(now);
  return days === 0 ? 'D-DAY' : 'D-' + days;
}
