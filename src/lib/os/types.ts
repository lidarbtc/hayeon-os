import type { Component } from 'svelte';

export type IconName =
  | 'computer'
  | 'system'
  | 'notepad'
  | 'text'
  | 'sysfile'
  | 'folder'
  | 'disk'
  | 'floppy'
  | 'cd'
  | 'bin'
  | 'bin-full'
  | 'error'
  | 'question'
  | 'info'
  | 'hedgehog'
  | 'power'
  | 'logoff'
  | 'restart'
  | 'back'
  | 'up';

export type AppId = 'system' | 'notepad' | 'explorer' | 'bin' | 'dialog';

export interface AppDef {
  id: AppId;
  title: string;
  icon: IconName;
  // Apps receive their window as the win prop, plus whatever props the opener passed.
  component: Component<any>;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  /** Fixed-size windows have no resize grips and no maximize button. */
  resizable?: boolean;
  /** Message boxes: sized by their content, kept above normal windows, hidden from the taskbar. */
  dialog?: boolean;
}

/** A text file is either one the visitor saved or one that ships with the system. */
export type FileRef = { kind: 'user'; id: string } | { kind: 'static'; path: string };

export interface DialogButton {
  label: string;
  primary?: boolean;
  /** Receives the input value. Return false to keep the dialog open. */
  action?: (value: string) => void | false;
}

export interface DialogOptions {
  title: string;
  message: string;
  /** Shows the matching large icon next to the message. */
  kind?: 'info' | 'error' | 'question';
  /** Title bar icon; defaults to the kind's icon. */
  icon?: IconName;
  /** The window this dialog belongs to. It closes and minimizes together with its owner. */
  owner?: number;
  input?: { label: string; value: string };
  /** Defaults to a single 확인 button. */
  buttons?: DialogButton[];
  /** Dialogs with the same key are not opened twice. */
  key?: string;
}

export type MenuItem =
  | { separator: true }
  | { label: string; shortcut?: string; checked?: boolean; disabled?: boolean; action: () => void };

export interface Menu {
  label: string;
  items: MenuItem[];
}

export interface ListColumn {
  label: string;
  /** A CSS grid track size. */
  width: string;
  /** Optional columns disappear when the window gets narrow. */
  optional?: boolean;
  align?: 'end';
}

export interface ListRow {
  key: string;
  icon: IconName;
  /** One text per column. */
  cells: string[];
}
