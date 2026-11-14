import ControlPanel from '../apps/ControlPanel.svelte';
import Dialog from '../apps/Dialog.svelte';
import Explorer from '../apps/Explorer.svelte';
import HedgehogFinder from '../apps/HedgehogFinder.svelte';
import MediaPlayer from '../apps/MediaPlayer.svelte';
import Notepad from '../apps/Notepad.svelte';
import RecycleBin from '../apps/RecycleBin.svelte';
import SystemProperties from '../apps/SystemProperties.svelte';
import Terminal from '../apps/Terminal.svelte';
import { registerApps } from './registry';

registerApps([
  {
    id: 'system',
    title: '시스템 속성',
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
    title: '제목 없음 - 메모장',
    icon: 'notepad',
    component: Notepad,
    width: 500,
    height: 540,
    minWidth: 260,
    minHeight: 180
  },
  {
    id: 'explorer',
    title: '내 컴퓨터',
    icon: 'computer',
    component: Explorer,
    width: 640,
    height: 440,
    minWidth: 300,
    minHeight: 240
  },
  {
    id: 'bin',
    title: '휴지통',
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
    title: '고슴도치 찾기',
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
    title: '미디어 플레이어',
    icon: 'player',
    component: MediaPlayer,
    width: 372,
    height: 420,
    minWidth: 372,
    minHeight: 420,
    resizable: false
  },
  {
    id: 'terminal',
    title: '터미널',
    icon: 'terminal',
    component: Terminal,
    width: 640,
    height: 400,
    minWidth: 300,
    minHeight: 200
  },
  {
    id: 'control',
    title: '제어판',
    icon: 'control',
    component: ControlPanel,
    width: 452,
    height: 540,
    minWidth: 452,
    minHeight: 540,
    resizable: false
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
