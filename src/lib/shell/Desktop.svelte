<script lang="ts">
  import { untrack } from 'svelte';
  import { opensImmediately } from '../os/pointer';
  import { getApp } from '../os/registry';
  import { session } from '../os/session.svelte';
  import { settings } from '../os/settings.svelte';
  import { shortcuts, type Shortcut } from '../os/shell';
  import { wm } from '../os/wm.svelte';
  import Backdrop from '../ui/Backdrop.svelte';
  import Icon from '../ui/Icon.svelte';
  import Gadgets from './Gadgets.svelte';
  import StartMenu from './StartMenu.svelte';
  import Taskbar from './Taskbar.svelte';
  import Window from './Window.svelte';

  const icons: Shortcut[] = [
    shortcuts.computer,
    shortcuts.documents,
    shortcuts.photos,
    shortcuts.profile,
    shortcuts.bin,
    shortcuts.notepad,
    shortcuts.hedgehog,
    shortcuts.player,
    shortcuts.terminal,
    shortcuts.readme
  ];

  let areaWidth = $state(0);
  let areaHeight = $state(0);
  let selected = $state<string | null>(null);

  $effect(() => {
    const w = areaWidth;
    const h = areaHeight;
    if (!w || !h) return;
    untrack(() => {
      wm.setArea(w, h);
      if (session.firstLogin) {
        session.firstLogin = false;
        shortcuts.readme.open();
      }
    });
  });

  // While gravity is on, windows fall a little further every frame.
  $effect(() => {
    if (!settings.gravity) return;
    const snap = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speeds = new Map<number, number>();
    let last = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      wm.fall(Math.min(0.032, (now - last) / 1000), speeds, snap);
      last = now;
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  });

  function clickIcon(event: MouseEvent, icon: Shortcut) {
    selected = icon.id;
    if (opensImmediately(event)) icon.open();
  }

  function pressDesktop(event: PointerEvent) {
    wm.blur();
    if (!(event.target as HTMLElement).closest('.icon')) selected = null;
  }
</script>

<div class="desktop" data-theme={settings.theme}>
  <Backdrop />

  <div class="workarea" bind:clientWidth={areaWidth} bind:clientHeight={areaHeight}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="icons" onpointerdown={pressDesktop}>
      {#each icons as icon (icon.id)}
        <button
          class="icon"
          class:selected={selected === icon.id}
          onclick={(event) => clickIcon(event, icon)}
          ondblclick={() => icon.open()}
        >
          <Icon name={icon.icon} size={48} />
          <span>{icon.label}</span>
        </button>
      {/each}
    </div>

    {#if settings.gadgets && areaWidth >= 900}
      <Gadgets />
    {/if}

    {#each wm.windows as win (win.id)}
      {@const App = getApp(win.appId).component}
      <Window {win}>
        <App {win} {...win.props} />
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
    /* "hidden" still scrolls when a control inside a half-offscreen window takes focus. */
    overflow: clip;
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
      0 1px 1px rgba(0, 30, 40, 1),
      0 1px 3px rgba(0, 30, 40, 0.95),
      0 0 6px rgba(0, 30, 40, 0.85),
      0 0 10px rgba(0, 30, 40, 0.55);
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
