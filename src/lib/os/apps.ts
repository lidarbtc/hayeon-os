import { t } from './i18n';
import ControlPanel from '../apps/ControlPanel.svelte';
import Dialog from '../apps/Dialog.svelte';
import Explorer from '../apps/Explorer.svelte';
import Guestbook from '../apps/Guestbook.svelte';
import HedgehogFinder from '../apps/HedgehogFinder.svelte';
import MediaPlayer from '../apps/MediaPlayer.svelte';
import Notepad from '../apps/Notepad.svelte';
import PhotoViewer from '../apps/PhotoViewer.svelte';
import Profile from '../apps/Profile.svelte';
import RecycleBin from '../apps/RecycleBin.svelte';
import SystemProperties from '../apps/SystemProperties.svelte';
import Terminal from '../apps/Terminal.svelte';
import { registerApps } from './registry';

registerApps([
  {
    id: 'system',
    title: t('시스템 속성', 'System Properties'),
    icon: 'system',
    component: SystemProperties,
    width: 420,
    height: 470,
    minWidth: 420,
    minHeight: 470,
    resizable: false
  },
  {
    id: 'notepad',
    title: t('제목 없음 - 메모장', 'Untitled - Notepad'),
    icon: 'notepad',
    component: Notepad,
    width: 500,
    height: 540,
    minWidth: 260,
    minHeight: 180
  },
  {
    id: 'explorer',
    title: t('내 컴퓨터', 'My Computer'),
    icon: 'computer',
    component: Explorer,
    width: 640,
    height: 440,
    minWidth: 300,
    minHeight: 240
  },
  {
    id: 'bin',
    title: t('휴지통', 'Recycle Bin'),
    icon: 'bin',
    component: RecycleBin,
    width: 560,
    height: 360,
    minWidth: 300,
    minHeight: 220
  },
  {
    // The game sizes its own window to the board, so these are only the first guess.
    id: 'hedgehog',
    title: t('고슴도치 찾기', 'Hedgehog Finder'),
    icon: 'hedgehog',
    component: HedgehogFinder,
    width: 284,
    height: 412,
    minWidth: 284,
    minHeight: 412,
    resizable: false
  },
  {
    id: 'player',
    title: t('미디어 플레이어', 'Media Player'),
    icon: 'player',
    component: MediaPlayer,
    width: 392,
    height: 540,
    minWidth: 340,
    minHeight: 420
  },
  {
    id: 'terminal',
    title: t('터미널', 'Terminal'),
    icon: 'terminal',
    component: Terminal,
    width: 640,
    height: 400,
    minWidth: 300,
    minHeight: 200
  },
  {
    id: 'control',
    title: t('제어판', 'Control Panel'),
    icon: 'control',
    component: ControlPanel,
    width: 452,
    height: 540,
    minWidth: 452,
    minHeight: 540,
    resizable: false
  },
  {
    id: 'photos',
    title: t('사진 뷰어', 'Photo Viewer'),
    icon: 'pictures',
    component: PhotoViewer,
    width: 720,
    height: 540,
    minWidth: 300,
    minHeight: 260
  },
  {
    id: 'profile',
    title: t('정하연 - 프로필', 'Jeong HaYeon - Profile'),
    icon: 'profile',
    component: Profile,
    width: 430,
    height: 560,
    minWidth: 300,
    minHeight: 260
  },
  {
    id: 'guestbook',
    title: t('방명록', 'Guestbook'),
    icon: 'guestbook',
    component: Guestbook,
    width: 560,
    height: 560,
    minWidth: 300,
    minHeight: 320
  },
  {
    id: 'dialog',
    title: 'HaYeon OS',
    icon: 'info',
    component: Dialog,
    width: 380,
    height: 0,
    minWidth: 380,
    minHeight: 0,
    resizable: false,
    dialog: true
  }
]);
