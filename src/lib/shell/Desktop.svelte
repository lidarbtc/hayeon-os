<script lang="ts">
  import { untrack } from 'svelte';
  import { appList, apps } from '../os/apps';
  import { session } from '../os/session.svelte';
  import type { AppId } from '../os/types';
  import { wm } from '../os/wm.svelte';
  import Icon from '../ui/Icon.svelte';
  import Wallpaper from '../ui/Wallpaper.svelte';
  import StartMenu from './StartMenu.svelte';
  import Taskbar from './Taskbar.svelte';
  import Window from './Window.svelte';

  let areaWidth = $state(0);
  let areaHeight = $state(0);
  let selected = $state<AppId | null>(null);
  let pointerType = 'mouse';

  $effect(() => {
    const w = areaWidth;
    const h = areaHeight;
    if (!w || !h) return;
    untrack(() => {
      wm.setArea(w, h);
      if (session.firstLogin) {
        session.firstLogin = false;
        wm.open('readme');
      }
    });
  });

  // Mouse: click selects, double-click opens. Touch and keyboard open straight away.
  function clickIcon(event: MouseEvent, id: AppId) {
    selected = id;
    if (event.detail === 0 || pointerType !== 'mouse') wm.open(id);
  }

  function pressDesktop(event: PointerEvent) {
    pointerType = event.pointerType;
    wm.blur();
    if (!(event.target as HTMLElement).closest('.icon')) selected = null;
  }
</script>

<div class="desktop">
  <Wallpaper />

  <div class="workarea" bind:clientWidth={areaWidth} bind:clientHeight={areaHeight}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="icons" onpointerdown={pressDesktop}>
      {#each appList as app (app.id)}
        <button
          class="icon"
          class:selected={selected === app.id}
          onclick={(event) => clickIcon(event, app.id)}
          ondblclick={() => wm.open(app.id)}
        >
          <Icon name={app.icon} size={48} />
          <span>{app.label}</span>
        </button>
      {/each}
    </div>

    {#each wm.windows as win (win.id)}
      {@const App = apps[win.appId].component}
      <Window {win}>
        <App close={() => wm.close(win.id)} />
      </Window>
    {/each}
  </div>

  {#if session.startOpen}
    <StartMenu />
  {/if}
  <Taskbar />
</div>

<style>
  .desktop {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .workarea {
    position: absolute;
    inset: 0 0 var(--taskbar-h) 0;
    z-index: 1;
    overflow: hidden;
  }

  .icons {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 6px;
    padding: 10px 8px;
  }

  .icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 88px;
    padding: 6px 4px 5px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: none;
    color: #fff;
    font-size: 12px;
    line-height: 1.3;
    text-align: center;
    word-break: keep-all;
    overflow-wrap: anywhere;
    text-shadow:
      0 1px 2px rgba(0, 30, 40, 0.95),
      0 0 5px rgba(0, 30, 40, 0.7);
  }

  .icon :global(svg) {
    filter: drop-shadow(0 2px 3px rgba(0, 30, 40, 0.45));
  }

  .icon:hover,
  .icon:focus-visible {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.12));
  }

  .icon.selected {
    border-color: rgba(255, 255, 255, 0.75);
    background: linear-gradient(180deg, rgba(201, 255, 242, 0.5), rgba(82, 217, 187, 0.38));
  }
</style>
