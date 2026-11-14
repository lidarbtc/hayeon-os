import type { AppDef, AppId } from './types';

// The window manager looks apps up here instead of importing them, so app
// components are free to import the window manager.
const defs = new Map<AppId, AppDef>();

export function registerApps(list: AppDef[]) {
  for (const def of list) defs.set(def.id, def);
}

export function getApp(id: AppId): AppDef {
  const def = defs.get(id);
  if (!def) throw new Error('Unknown app: ' + id);
  return def;
}
