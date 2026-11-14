import { apps } from './apps';
import type { AppId } from './types';

export interface Win {
  id: number;
  appId: AppId;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How much of a title bar must stay inside the work area so a window can always be grabbed again. */
const REACH = 96;
const TITLE_H = 30;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

class WindowManager {
  windows = $state<Win[]>([]);
  activeId = $state<number | null>(null);
  /** Size of the desktop work area (viewport minus taskbar). */
  area = $state({ w: 1280, h: 680 });

  #nextId = 1;
  #topZ = 1;

  /** On phone-sized screens every window fills the work area. */
  get compact() {
    return this.area.w < 640;
  }

  #find(id: number) {
    return this.windows.find((win) => win.id === id);
  }

  #activateTop() {
    const visible = this.windows.filter((win) => !win.minimized);
    const top = visible.sort((a, b) => b.z - a.z)[0];
    this.activeId = top ? top.id : null;
  }

  open(appId: AppId) {
    const existing = this.windows.find((win) => win.appId === appId);
    if (existing) {
      this.focus(existing.id);
      return;
    }
    const app = apps[appId];
    const w = Math.min(app.width, this.area.w - 16);
    const h = Math.min(app.height, this.area.h - 16);
    const step = (this.windows.length % 6) * 30;
    const x = clamp(Math.round((this.area.w - w) / 2) - 45 + step, 8, this.area.w - w - 8);
    const y = clamp(Math.round((this.area.h - h) / 2) - 45 + step, 8, this.area.h - h - 8);
    const id = this.#nextId++;
    this.windows.push({ id, appId, x, y, w, h, z: 0, minimized: false, maximized: false });
    this.focus(id);
  }

  focus(id: number) {
    const win = this.#find(id);
    if (!win) return;
    win.minimized = false;
    if (this.activeId !== id || win.z !== this.#topZ) win.z = ++this.#topZ;
    this.activeId = id;
  }

  blur() {
    this.activeId = null;
  }

  close(id: number) {
    this.windows = this.windows.filter((win) => win.id !== id);
    if (this.activeId === id) this.#activateTop();
  }

  minimize(id: number) {
    const win = this.#find(id);
    if (!win) return;
    win.minimized = true;
    if (this.activeId === id) this.#activateTop();
  }

  toggleMaximize(id: number) {
    const win = this.#find(id);
    if (!win) return;
    win.maximized = !win.maximized;
    this.focus(id);
  }

  /** Taskbar button behaviour: the active window minimizes, anything else comes to the front. */
  toggleFromTaskbar(id: number) {
    const win = this.#find(id);
    if (!win) return;
    if (this.activeId === id && !win.minimized) this.minimize(id);
    else this.focus(id);
  }

  /** "Show desktop": minimize everything, or bring everything back if nothing is showing. */
  toggleDesktop() {
    if (this.windows.some((win) => !win.minimized)) {
      for (const win of this.windows) win.minimized = true;
      this.activeId = null;
    } else {
      for (const win of this.windows) win.minimized = false;
      this.#activateTop();
    }
  }

  move(id: number, x: number, y: number) {
    const win = this.#find(id);
    if (!win) return;
    win.x = clamp(Math.round(x), REACH - win.w, this.area.w - REACH);
    win.y = clamp(Math.round(y), 0, this.area.h - TITLE_H);
  }

  setRect(id: number, rect: Rect) {
    const win = this.#find(id);
    if (!win) return;
    win.x = Math.round(rect.x);
    win.y = Math.round(rect.y);
    win.w = Math.round(rect.w);
    win.h = Math.round(rect.h);
  }

  setArea(w: number, h: number) {
    this.area = { w, h };
    for (const win of this.windows) this.move(win.id, win.x, win.y);
  }

  reset() {
    this.windows = [];
    this.activeId = null;
  }
}

export const wm = new WindowManager();
