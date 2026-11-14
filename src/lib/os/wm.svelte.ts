import { getApp } from './registry';
import type { AppId, DialogOptions, IconName } from './types';

export interface Win {
  id: number;
  appId: AppId;
  /** Windows are unique per app and key; opening the same pair again focuses the existing window. */
  key: string;
  title: string;
  icon: IconName;
  props: Record<string, unknown>;
  /** The window this one belongs to, for message boxes. */
  owner: number | null;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minW: number;
  minH: number;
  resizable: boolean;
  dialog: boolean;
  minimized: boolean;
  maximized: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OpenOptions {
  key?: string;
  title?: string;
  icon?: IconName;
  owner?: number;
  props?: Record<string, unknown>;
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
  /** A guard returns false to veto closing its window, e.g. while it asks about unsaved changes. */
  #guards = new Map<number, () => boolean>();

  /** On phone-sized screens every resizable window fills the work area. */
  get compact() {
    return this.area.w < 640;
  }

  #find(id: number) {
    return this.windows.find((win) => win.id === id);
  }

  #activateTop() {
    const visible = this.windows.filter((win) => !win.minimized);
    const top = visible.sort((a, b) => Number(b.dialog) - Number(a.dialog) || b.z - a.z)[0];
    this.activeId = top ? top.id : null;
  }

  open(appId: AppId, options: OpenOptions = {}) {
    const key = options.key ?? '';
    const existing = this.windows.find((win) => win.appId === appId && win.key === key);
    if (existing) {
      this.focus(existing.id);
      return existing.id;
    }
    const app = getApp(appId);
    const dialog = app.dialog === true;
    const w = Math.min(app.width, this.area.w - 16);
    const h = Math.min(app.height, this.area.h - 16);
    const step = dialog ? 0 : (this.windows.filter((win) => !win.dialog).length % 6) * 30;
    const x = clamp(Math.round((this.area.w - w) / 2) - (dialog ? 0 : 45) + step, 8, this.area.w - w - 8);
    const y = dialog
      ? clamp(Math.round(this.area.h * 0.28), 8, this.area.h - 220)
      : clamp(Math.round((this.area.h - h) / 2) - 45 + step, 8, this.area.h - h - 8);
    const id = this.#nextId++;
    this.windows.push({
      id,
      appId,
      key,
      title: options.title ?? app.title,
      icon: options.icon ?? app.icon,
      props: options.props ?? {},
      owner: options.owner ?? null,
      x,
      y,
      w,
      h,
      z: 0,
      minW: Math.min(app.minWidth, w),
      minH: Math.min(app.minHeight, h),
      resizable: app.resizable !== false,
      dialog,
      minimized: false,
      maximized: false
    });
    this.focus(id);
    return id;
  }

  /** Show a message box. Buttons close it unless their action returns false. */
  dialog(options: DialogOptions) {
    return this.open('dialog', {
      key: options.key ?? 'dialog:' + this.#nextId,
      title: options.title,
      icon: options.icon ?? options.kind ?? 'info',
      owner: options.owner,
      props: { options }
    });
  }

  focus(id: number) {
    const win = this.#find(id);
    if (!win) return;
    win.minimized = false;
    // Message boxes have no taskbar button, so they come back together with their owner.
    for (const other of this.windows) if (other.owner === id) other.minimized = false;
    if (this.activeId !== id || win.z !== this.#topZ) win.z = ++this.#topZ;
    this.activeId = id;
  }

  blur() {
    this.activeId = null;
  }

  /** Change what a window shows in its title bar and taskbar button, or the key it is found by. */
  patch(id: number, changes: Partial<Pick<Win, 'title' | 'icon' | 'key'>>) {
    const win = this.#find(id);
    if (win) Object.assign(win, changes);
  }

  setCloseGuard(id: number, guard: (() => boolean) | null) {
    if (guard) this.#guards.set(id, guard);
    else this.#guards.delete(id);
  }

  /** Close as the user would: the window's guard may veto it. */
  requestClose(id: number) {
    const guard = this.#guards.get(id);
    if (guard && !guard()) return;
    this.close(id);
  }

  /** Ask every window to close. False means at least one is still open, asking about unsaved work. */
  requestCloseAll() {
    for (const win of [...this.windows]) if (!win.dialog) this.requestClose(win.id);
    return !this.windows.some((win) => !win.dialog);
  }

  /** Close a window and every message box that belongs to it. */
  close(id: number) {
    const gone = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const win of this.windows) {
        if (win.owner !== null && gone.has(win.owner) && !gone.has(win.id)) {
          gone.add(win.id);
          grew = true;
        }
      }
    }
    for (const goneId of gone) this.#guards.delete(goneId);
    this.windows = this.windows.filter((win) => !gone.has(win.id));
    if (this.activeId !== null && gone.has(this.activeId)) this.#activateTop();
  }

  minimize(id: number) {
    const win = this.#find(id);
    if (!win) return;
    win.minimized = true;
    for (const other of this.windows) if (other.owner === id) other.minimized = true;
    if (this.activeId !== null && this.#find(this.activeId)?.minimized) this.#activateTop();
  }

  toggleMaximize(id: number) {
    const win = this.#find(id);
    if (!win || !win.resizable) return;
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
    // A message box without an owner has no way back from the taskbar, so it stays put.
    const movable = this.windows.filter((win) => !(win.dialog && win.owner === null));
    if (movable.some((win) => !win.minimized)) {
      for (const win of movable) win.minimized = true;
      this.#activateTop();
    } else {
      for (const win of movable) win.minimized = false;
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
    this.#guards.clear();
    this.windows = [];
    this.activeId = null;
  }
}

export const wm = new WindowManager();
