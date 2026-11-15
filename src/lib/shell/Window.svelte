<script lang="ts">
  import type { Snippet } from 'svelte';
  import { wm, type Win } from '../os/wm.svelte';
  import Icon from '../ui/Icon.svelte';

  let { win, children }: { win: Win; children: Snippet } = $props();

  type Dir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  const dirs: Dir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  const active = $derived(wm.activeId === win.id);
  const maximized = $derived(win.resizable && (win.maximized || wm.compact));
  const style = $derived.by(() => {
    // Message boxes take their height from their content and always sit above normal windows.
    if (win.dialog) return 'left:' + win.x + 'px;top:' + win.y + 'px;width:' + win.w + 'px;z-index:' + (win.z + 100000);
    if (maximized) return 'z-index:' + win.z;
    return 'left:' + win.x + 'px;top:' + win.y + 'px;width:' + win.w + 'px;height:' + win.h + 'px;z-index:' + win.z;
  });

  // One pointer gesture at a time: dir === null moves the window, anything else resizes it.
  let gesture: { px: number; py: number; x: number; y: number; w: number; h: number; dir: Dir | null } | null = null;

  function start(event: PointerEvent, dir: Dir | null) {
    if (event.button !== 0 || maximized) return;
    if (dir === null && (event.target as HTMLElement).closest('button')) return;
    gesture = { px: event.clientX, py: event.clientY, x: win.x, y: win.y, w: win.w, h: win.h, dir };
    wm.heldId = win.id;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function track(event: PointerEvent) {
    if (!gesture) return;
    const dx = event.clientX - gesture.px;
    const dy = event.clientY - gesture.py;
    const dir = gesture.dir;
    if (dir === null) {
      wm.move(win.id, gesture.x + dx, gesture.y + dy);
      return;
    }
    let { x, y, w, h } = gesture;
    if (dir.includes('e')) w = Math.max(win.minW, gesture.w + dx);
    if (dir.includes('s')) h = Math.max(win.minH, gesture.h + dy);
    if (dir.includes('w')) {
      w = Math.max(win.minW, gesture.w - dx);
      x = gesture.x + gesture.w - w;
    }
    if (dir.includes('n')) {
      // The top edge stops at the top of the work area so the title bar stays reachable.
      const top = Math.max(0, Math.min(gesture.y + dy, gesture.y + gesture.h - win.minH));
      h = gesture.y + gesture.h - top;
      y = top;
    }
    wm.setRect(win.id, { x, y, w, h });
  }

  function end() {
    gesture = null;
    wm.heldId = null;
  }

  function toggleMaximize(event: MouseEvent) {
    if (wm.compact || (event.target as HTMLElement).closest('button')) return;
    wm.toggleMaximize(win.id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<section
  class="window"
  class:active
  class:maximized
  class:minimized={win.minimized}
  {style}
  aria-label={win.title}
  onpointerdowncapture={() => wm.focus(win.id)}
>
  <header
    class="titlebar"
    onpointerdown={(event) => start(event, null)}
    onpointermove={track}
    onpointerup={end}
    onpointercancel={end}
    ondblclick={toggleMaximize}
  >
    <Icon name={win.icon} size={16} />
    <span class="title">{win.title}</span>
    <div class="controls">
      {#if !win.dialog}
        <button aria-label="최소화" title="최소화" onclick={() => wm.minimize(win.id)}>
          <svg viewBox="0 0 12 10" width="12" height="10" aria-hidden="true"><rect x="2" y="6.5" width="8" height="2.2" /></svg>
        </button>
      {/if}
      {#if win.resizable && !wm.compact}
        <button
          aria-label={win.maximized ? '이전 크기로' : '최대화'}
          title={win.maximized ? '이전 크기로' : '최대화'}
          onclick={() => wm.toggleMaximize(win.id)}
        >
          <svg viewBox="0 0 12 10" width="12" height="10" aria-hidden="true">
            {#if win.maximized}
              <path d="M4.2 1.2h6v5h-1.6v-3.4H4.2zM1.8 3.8h6v5h-6zm1.4 1.6v2h3.2v-2z" fill-rule="evenodd" />
            {:else}
              <path d="M1.8 1.2h8.4v7.6H1.8zm1.5 2v4.1h5.4V3.2z" fill-rule="evenodd" />
            {/if}
          </svg>
        </button>
      {/if}
      <button class="close" aria-label="닫기" title="닫기" onclick={() => wm.requestClose(win.id)}>
        <svg viewBox="0 0 12 10" width="12" height="10" aria-hidden="true">
          <path d="M2.4 1.4l7.2 7.2M9.6 1.4L2.4 8.6" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </header>
  <div class="body">{@render children()}</div>
  {#if win.resizable && !maximized}
    {#each dirs as dir (dir)}
      <div
        class="grip {dir}"
        onpointerdown={(event) => start(event, dir)}
        onpointermove={track}
        onpointerup={end}
        onpointercancel={end}
      ></div>
    {/each}
  {/if}
</section>

<style>
  .window {
    position: absolute;
    display: flex;
    flex-direction: column;
    padding: 0 7px 7px;
    border: 1px solid rgba(6, 46, 54, 0.6);
    border-radius: 8px;
    background:
      linear-gradient(115deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 18%, rgba(255, 255, 255, 0) 32%, rgba(255, 255, 255, 0.14) 55%, rgba(255, 255, 255, 0) 70%),
      linear-gradient(180deg, rgba(214, 245, 240, 0.6), rgba(170, 222, 222, 0.5));
    -webkit-backdrop-filter: blur(14px) saturate(1.3);
    backdrop-filter: blur(14px) saturate(1.3);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.6),
      0 6px 18px rgba(3, 40, 50, 0.28);
    animation: open 0.16s ease-out;
  }

  .window.active {
    border-color: rgba(6, 46, 54, 0.82);
    background:
      linear-gradient(115deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.12) 18%, rgba(255, 255, 255, 0) 32%, rgba(255, 255, 255, 0.2) 55%, rgba(255, 255, 255, 0) 70%),
      linear-gradient(180deg, rgba(110, 228, 205, 0.66), rgba(36, 168, 190, 0.55));
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.7),
      0 16px 44px rgba(3, 40, 50, 0.5),
      0 2px 8px rgba(3, 40, 50, 0.3);
  }

  .window.maximized {
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    border-radius: 0;
  }

  .window.minimized {
    display: none;
  }

  .titlebar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding-left: 2px;
    touch-action: none;
  }

  .maximized .titlebar {
    padding: 0 6px;
  }

  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--hy-ink);
    text-shadow:
      0 0 2px #fff,
      0 0 7px #fff,
      0 0 13px #fff;
  }

  .controls {
    align-self: flex-start;
    display: flex;
    border: 1px solid rgba(6, 46, 54, 0.65);
    border-top: 0;
    border-radius: 0 0 5px 5px;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.45);
  }

  .controls button {
    display: grid;
    place-items: center;
    width: 28px;
    height: 19px;
    padding: 0;
    border: 0;
    border-left: 1px solid rgba(6, 46, 54, 0.5);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.25) 46%, rgba(4, 60, 70, 0.1) 50%, rgba(255, 255, 255, 0.3));
  }

  .controls button:first-child {
    border-left: 0;
  }

  .controls button:hover,
  .controls button:focus-visible {
    outline: none;
    background: linear-gradient(180deg, #e3fff8, #8fe9d6 46%, #3fcdb2 50%, #9ff0dd);
  }

  .controls .close {
    width: 46px;
  }

  .active .controls .close {
    background: linear-gradient(180deg, #f3a59a, #d9553f 46%, #c22f17 50%, #e0704f);
  }

  .controls .close:hover,
  .controls .close:focus-visible {
    background: linear-gradient(180deg, #ffc0b3, #f0624a 46%, #dc3418 50%, #ff9a70);
  }

  .controls svg {
    fill: #fff;
    filter: drop-shadow(0 0 1px rgba(4, 34, 42, 0.95)) drop-shadow(0 0 1px rgba(4, 34, 42, 0.7));
  }

  /* Fingers need more to aim at than a mouse pointer does. */
  @media (pointer: coarse) {
    .controls button {
      width: 38px;
      height: 27px;
    }

    .controls .close {
      width: 50px;
    }
  }

  .body {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    border: 1px solid rgba(6, 46, 54, 0.65);
    background: #fff;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.55);
  }

  .maximized .body {
    border-width: 1px 0 0;
    box-shadow: none;
  }

  .grip {
    position: absolute;
    touch-action: none;
  }

  .grip.n,
  .grip.s {
    left: 12px;
    right: 12px;
    height: 6px;
    cursor: ns-resize;
  }

  .grip.e,
  .grip.w {
    top: 12px;
    bottom: 12px;
    width: 6px;
    cursor: ew-resize;
  }

  .grip.n {
    top: -3px;
  }

  .grip.s {
    bottom: -3px;
  }

  .grip.e {
    right: -3px;
  }

  .grip.w {
    left: -3px;
  }

  .grip.ne,
  .grip.nw,
  .grip.se,
  .grip.sw {
    width: 14px;
    height: 14px;
  }

  .grip.ne {
    top: -3px;
    right: -3px;
    cursor: nesw-resize;
  }

  .grip.nw {
    top: -3px;
    left: -3px;
    cursor: nwse-resize;
  }

  .grip.se {
    bottom: -3px;
    right: -3px;
    cursor: nwse-resize;
  }

  .grip.sw {
    bottom: -3px;
    left: -3px;
    cursor: nesw-resize;
  }

  /* Luna: solid, saturated frames in place of glass. The frame keeps its size in both themes. */
  :global([data-theme='luna']) .window {
    border-color: #5d8088;
    border-radius: 8px 8px 0 0;
    background: linear-gradient(180deg, #a9cbd0 0, #86b0b8 30px, #8fb7be 100%);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    box-shadow: 0 4px 12px rgba(3, 40, 50, 0.3);
  }

  :global([data-theme='luna']) .window.active {
    border-color: #064a5c;
    background: linear-gradient(180deg, #4fdcc3 0, #14a6af 4px, #0b8799 14px, #0e95a6 26px, #0a7d90 30px, #0b8799 100%);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.28),
      0 8px 24px rgba(3, 40, 50, 0.45);
  }

  :global([data-theme='luna']) .window.maximized {
    border-radius: 0;
  }

  :global([data-theme='luna']) .title {
    color: #fff;
    font-weight: 700;
    text-shadow: 1px 1px 1px #04404e;
  }

  :global([data-theme='luna']) .controls {
    align-self: center;
    gap: 2px;
    border: 0;
    border-radius: 0;
    overflow: visible;
    box-shadow: none;
  }

  :global([data-theme='luna']) .controls button {
    width: 21px;
    height: 21px;
    border: 1px solid #fff;
    border-radius: 3px;
    background: linear-gradient(135deg, #7fe9d4, #12a0ad 55%, #0b7389);
  }

  :global([data-theme='luna']) .controls .close {
    background: linear-gradient(135deg, #f5a898, #d9482f 55%, #a9260f);
  }

  :global([data-theme='luna']) .controls button:hover,
  :global([data-theme='luna']) .controls button:focus-visible {
    filter: brightness(1.2);
  }

  @keyframes open {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
