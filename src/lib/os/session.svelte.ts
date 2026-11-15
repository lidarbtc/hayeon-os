import { reopenIn, type Lang } from './i18n';
import { wm } from './wm.svelte';

export type Phase = 'boot' | 'welcome' | 'desktop' | 'leaving' | 'off';
export type LeaveMode = 'logoff' | 'restart' | 'shutdown';

class Session {
  phase = $state<Phase>('boot');
  leaveMode = $state<LeaveMode>('logoff');
  startOpen = $state(false);
  /** The readme opens by itself only on the first login after the page loads. */
  firstLogin = true;

  finishBoot() {
    if (this.phase === 'boot') this.phase = 'welcome';
  }

  login() {
    if (this.phase === 'welcome') this.phase = 'desktop';
  }

  leave(mode: LeaveMode) {
    this.startOpen = false;
    // Windows with unsaved work ask first; leaving waits until they are closed.
    if (!wm.requestCloseAll()) return;
    this.leaveMode = mode;
    this.phase = 'leaving';
  }

  /** Restarts into the other language. Like any restart, unsaved work asks first. */
  switchLanguage(next: Lang) {
    this.#language = next;
    this.leave('restart');
    if (this.phase !== 'leaving') this.#language = null;
  }

  #language: Lang | null = null;

  finishLeave() {
    if (this.phase !== 'leaving') return;
    if (this.#language && this.leaveMode === 'restart') return reopenIn(this.#language);
    wm.reset();
    this.phase = this.leaveMode === 'logoff' ? 'welcome' : this.leaveMode === 'restart' ? 'boot' : 'off';
  }

  powerOn() {
    if (this.phase === 'off') this.phase = 'boot';
  }
}

export const session = new Session();
