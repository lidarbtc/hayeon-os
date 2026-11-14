const STORAGE_KEY = 'hayeon-os:settings:v1';

export type Theme = 'aero' | 'luna';
export type WallpaperName = 'hill' | 'night' | 'aqua';

const themes: Theme[] = ['aero', 'luna'];
const wallpapers: WallpaperName[] = ['hill', 'night', 'aqua'];

function load(): { theme: Theme; wallpaper: WallpaperName } {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      theme: themes.includes(data?.theme) ? data.theme : 'aero',
      wallpaper: wallpapers.includes(data?.wallpaper) ? data.wallpaper : 'hill'
    };
  } catch {
    return { theme: 'aero', wallpaper: 'hill' };
  }
}

const saved = load();

class Settings {
  theme = $state<Theme>(saved.theme);
  wallpaper = $state<WallpaperName>(saved.wallpaper);
  /** A toy, so it is not remembered: every visit starts with windows that stay put. */
  gravity = $state(false);

  #save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: this.theme, wallpaper: this.wallpaper }));
    } catch {
      // Without storage the choice lasts until the tab closes.
    }
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.#save();
  }

  setWallpaper(wallpaper: WallpaperName) {
    this.wallpaper = wallpaper;
    this.#save();
  }
}

export const settings = new Settings();
