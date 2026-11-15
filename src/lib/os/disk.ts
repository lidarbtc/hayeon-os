// The read-only part of the machine: drives, system folders and the files that
// ship with HaYeon OS. Paths use forward slashes internally ("C:/HaYeon OS").
import { t } from './i18n';

export interface Drive {
  letter: string;
  label: string;
  type: 'disk' | 'floppy' | 'cd';
  /** Sizes in GB as shown, for hard disks only. */
  total?: string;
  free?: string;
  usedPercent?: number;
}

// Drive letters A to E are labelled after the tripleS objekt seasons that
// start with the same letter. C: is the system disk.
export const drives: Drive[] = [
  { letter: 'A', label: 'ATOM01', type: 'floppy' },
  { letter: 'B', label: 'BINARY01', type: 'floppy' },
  { letter: 'C', label: 'CREAM01', type: 'disk', total: '19.0', free: '8.01', usedPercent: 58 },
  { letter: 'D', label: 'DIVINE01', type: 'disk', total: '24.0', free: '24.0', usedPercent: 0 },
  { letter: 'E', label: 'EVER01', type: 'cd' }
];

export const DOCUMENTS = t('C:/내 문서', 'C:/My Documents');
export const README = t('C:/HaYeon OS/읽어보기.txt', 'C:/HaYeon OS/Readme.txt');
/** Everything that ships with the system carries the build date, 2007-08-01. */
export const BUILD_TIME = new Date(2007, 7, 1, 0, 19).getTime();

export interface StaticFile {
  name: string;
  size: string;
  /** Text files have content and open in 메모장; files without it are system binaries. */
  content?: string;
}

export interface StaticFolder {
  folders: string[];
  files: StaticFile[];
}

const readmeKo = [
  'HaYeon OS S19에 오신 것을 환영합니다.',
  '',
  '정하연을 좋아하는 팬이 만든 작은 컴퓨터입니다.',
  '아이콘을 두 번 누르면 열립니다. 천천히 둘러보세요.',
  '',
  '[지금 할 수 있는 것]',
  '- 내 사진: 하연 사진을 넘겨 보고 바탕 화면으로 걸기',
  '- 프로필: 하연이 걸어온 길 훑어보기',
  '- 방명록: 쪽지를 붙이고, 다른 사람이 붙인 쪽지 읽기',
  '- 메모장에 글을 쓰고 내 문서에 저장하기',
  '- 내 컴퓨터에서 드라이브와 폴더 둘러보기',
  '- 파일을 휴지통에 버리고, 다시 꺼내기',
  '- 시스템 속성에서 이 컴퓨터 살펴보기',
  '- 고슴도치 찾기: 고슴도치를 밟지 않고 빈 칸 모두 열기',
  '- 미디어 플레이어: 하연이 참여한 트리플에스 노래를 이 컴퓨터가 유리 소리로 다시 연주한 리믹스 듣기',
  '- 터미널: help 를 입력해 명령어 써 보기',
  '- 제어판: 테마와 배경 화면 바꾸기, 중력 켜기',
  '- 창을 끌어 옮기고, 가장자리를 잡아 크기 바꾸기',
  '',
  '메모장에 쓴 글은 지금 쓰는 기기에만 저장됩니다.',
  '',
  'Build 20070801'
].join('\n');

const readmeEn = [
  'Welcome to HaYeon OS S19.',
  '',
  'A little computer made by a fan of Jeong HaYeon.',
  'Double-click an icon to open it. Take your time and look around.',
  '',
  '[Things to try]',
  '- My Pictures: flip through photos of HaYeon and set one as your wallpaper',
  '- Profile: look back at the road HaYeon has walked so far',
  '- Guestbook: stick up a note and read the notes others left',
  '- Write in Notepad and save it to My Documents',
  '- Look around the drives and folders in My Computer',
  '- Throw files in the Recycle Bin, then take them back out',
  '- Look this computer over in System Properties',
  '- Hedgehog Finder: open every empty square without stepping on a hedgehog',
  '- Media Player: tripleS songs HaYeon sang on, played again by this computer as glassy electronic remixes',
  '- Terminal: type help and try out the commands',
  '- Control Panel: change the theme and the wallpaper, switch gravity on',
  '- Drag windows around, and pull at their edges to resize them',
  '',
  'What you write in Notepad is saved only on this device.',
  '',
  'Build 20070801'
].join('\n');

const readme = t(readmeKo, readmeEn);

const bootIni = [
  '[boot loader]',
  'timeout=19',
  'default=hayeon.eth',
  '',
  '[operating systems]',
  'hayeon.eth="HaYeon OS S19" /build:20070801 /theme:52D9BB /mascot:hedgehog'
].join('\n');

const tree: Record<string, StaticFolder> = {
  'C:': { folders: ['HaYeon OS', t('내 문서', 'My Documents')], files: [] },
  'C:/HaYeon OS': {
    folders: ['System19'],
    files: [
      { name: 'boot.ini', size: '1KB', content: bootIni },
      { name: t('읽어보기.txt', 'Readme.txt'), size: '1KB', content: readme }
    ]
  },
  'C:/HaYeon OS/System19': {
    folders: [],
    files: [
      { name: 'aero.dll', size: '1,907KB' },
      { name: 'bubble.dll', size: '801KB' },
      { name: 'hedgehog.sys', size: '19KB' },
      { name: 'turquoise.dll', size: '529KB' }
    ]
  },
  [DOCUMENTS]: { folders: [], files: [] },
  'D:': { folders: [], files: [] }
};

export function staticFolder(path: string): StaticFolder | undefined {
  return tree[path];
}

export function staticFile(path: string): StaticFile | undefined {
  const slash = path.lastIndexOf('/');
  const name = path.slice(slash + 1);
  return tree[path.slice(0, slash)]?.files.find((file) => file.name === name);
}

export function driveTitle(drive: Drive) {
  return drive.label + ' (' + drive.letter + ':)';
}

export function parentOf(path: string) {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
}

export function baseName(path: string) {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** "C:/내 문서" as Windows would write it. */
export function displayPath(path: string) {
  return path.replaceAll('/', '\\');
}

/** The name a folder window shows: the drive title for a drive root, else the folder name. */
export function folderTitle(path: string) {
  if (path === '') return t('내 컴퓨터', 'My Computer');
  const drive = drives.find((d) => d.letter + ':' === path);
  return drive ? driveTitle(drive) : baseName(path);
}
