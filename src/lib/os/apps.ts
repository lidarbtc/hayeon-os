import Dialog from '../apps/Dialog.svelte';
import Explorer from '../apps/Explorer.svelte';
import Notepad from '../apps/Notepad.svelte';
import RecycleBin from '../apps/RecycleBin.svelte';
import SystemProperties from '../apps/SystemProperties.svelte';
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
