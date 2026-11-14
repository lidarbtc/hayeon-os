import { photoById } from './photos.svelte';

const STORAGE_KEY = 'hayeon-os:settings:v1';

export type Theme = 'aero' | 'luna';
/** The drawn wallpapers. */
export type Scene = 'hill' | 'night' | 'aqua';
export type WallpaperName = Scene | 'photo';

const themes: Theme[] = ['aero', 'luna'];
const wallpapers: WallpaperName[] = ['hill', 'night', 'aqua', 'photo'];

interface Saved {
  theme: Theme;
  wallpaper: WallpaperName;
  wallpaperPhoto: string | null;
  gadgets: boolean;
}

function load(): Saved {
  const fresh: Saved = { theme: 'aero', wallpaper: 'hill', wallpaperPhoto: null, gadgets: true };
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const photo = photoById(data?.wallpaperPhoto)?.id ?? null;
    const wallpaper: WallpaperName = wallpapers.includes(data?.wallpaper) ? data.wallpaper : 'hill';
    return {
      theme: themes.includes(data?.theme) ? data.theme : 'aero',
      // A picture that has since been removed falls back to the hill.
      wallpaper: wallpaper === 'photo' && !photo ? 'hill' : wallpaper,
      wallpaperPhoto: photo,
      gadgets: data?.gadgets !== false
    };
  } catch {
    return fresh;
  }
}

const saved = load();

class Settings {
  theme = $state<Theme>(saved.theme);
  wallpaper = $state<WallpaperName>(saved.wallpaper);
  /** The picture shown when the wallpaper is 'photo'. */
  wallpaperPhoto = $state<string | null>(saved.wallpaperPhoto);
  gadgets = $state(saved.gadgets);
  /** A toy, so it is not remembered: every visit starts with windows that stay put. */
  gravity = $state(false);

  #save() {
    try {
      const data: Saved = {
        theme: this.theme,
        wallpaper: this.wallpaper,
        wallpaperPhoto: this.wallpaperPhoto,
        gadgets: this.gadgets
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Without storage the choice lasts until the tab closes.
    }
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.#save();
  }

  setWallpaper(wallpaper: Scene) {
    this.wallpaper = wallpaper;
    this.#save();
  }

  setPhotoWallpaper(id: string) {
    this.wallpaper = 'photo';
    this.wallpaperPhoto = id;
    this.#save();
  }

  setGadgets(on: boolean) {
    this.gadgets = on;
    this.#save();
  }
}

export const settings = new Settings();
