import type { Component } from 'svelte';
import type { AppId, IconName } from './types';
import About from '../apps/About.svelte';
import Readme from '../apps/Readme.svelte';

export interface AppDef {
  id: AppId;
  title: string;
  /** Short name used on the desktop and in the Start menu. */
  label: string;
  icon: IconName;
  // Every app receives a close() callback so it never has to import the window manager.
  component: Component<any>;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

export const apps: Record<AppId, AppDef> = {
  readme: {
    id: 'readme',
    title: '읽어보기.txt',
    label: '읽어보기.txt',
    icon: 'readme',
    component: Readme,
    width: 470,
    height: 460,
    minWidth: 280,
    minHeight: 200
  },
  about: {
    id: 'about',
    title: 'HaYeon OS 정보',
    label: 'HaYeon OS 정보',
    icon: 'about',
    component: About,
    width: 420,
    height: 430,
    minWidth: 320,
    minHeight: 360
  }
};

export const appList: AppDef[] = [apps.readme, apps.about];
