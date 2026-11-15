<script lang="ts">
  import type { Menu, MenuItem } from '../os/types';

  let { menus }: { menus: Menu[] } = $props();

  let open = $state<number | null>(null);
  let bar: HTMLElement;

  function run(item: Exclude<MenuItem, { separator: true }>) {
    open = null;
    item.action();
  }

  function closeOnOutside(event: PointerEvent) {
    if (open !== null && !bar.contains(event.target as Node)) open = null;
  }

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') open = null;
  }
</script>

<svelte:window onpointerdown={closeOnOutside} onkeydown={closeOnEscape} />

<div class="menubar" bind:this={bar} role="menubar">
  {#each menus as menu, index (menu.label)}
    <div class="menu">
      <button
        class:open={open === index}
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={open === index}
        onclick={() => (open = open === index ? null : index)}
        onpointerenter={() => {
          if (open !== null) open = index;
        }}>{menu.label}</button
      >
      {#if open === index}
        <div class="dropdown" role="menu">
          {#each menu.items as item, i (i)}
            {#if 'separator' in item}
              <hr />
            {:else}
              <button role="menuitem" disabled={item.disabled} onclick={() => run(item)}>
                <span class="check">{item.checked ? '✓' : ''}</span>
                <span class="label">{item.label}</span>
                <span class="shortcut">{item.shortcut ?? ''}</span>
              </button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .menubar {
    flex: none;
    display: flex;
    padding: 1px 2px;
    border-bottom: 1px solid #c9d8d8;
    background: linear-gradient(180deg, #fbfdfd, #e9f1f1);
  }

  .menu {
    position: relative;
  }

  .menu > button {
    padding: 2px 8px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: none;
  }

  .menu > button:hover,
  .menu > button:focus-visible,
  .menu > button.open {
    outline: none;
    border-color: #7fd6c4;
    background: linear-gradient(180deg, #f3fffb, #c9f5ea);
  }

  @media (pointer: coarse) {
    .menu > button {
      padding: 6px 11px;
    }

    .dropdown button {
      padding-top: 8px;
      padding-bottom: 8px;
    }
  }

  .dropdown {
    position: absolute;
    left: 0;
    top: 100%;
    z-index: 5;
    min-width: 190px;
    padding: 2px;
    border: 1px solid #8fa5a8;
    background: #f6fafa;
    box-shadow: 3px 3px 8px rgba(3, 40, 50, 0.3);
  }

  .dropdown button {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 4px 12px 4px 4px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: none;
    text-align: left;
    white-space: nowrap;
  }

  .dropdown button:hover:not(:disabled),
  .dropdown button:focus-visible {
    outline: none;
    border-color: #7fd6c4;
    background: linear-gradient(180deg, #f3fffb, #c9f5ea);
  }

  .dropdown button:disabled {
    color: #93a5a8;
  }

  .check {
    text-align: center;
  }

  .shortcut {
    padding-left: 22px;
    color: #5c7f88;
  }

  hr {
    margin: 3px 2px;
    border: 0;
    border-top: 1px solid #c9d8d8;
  }
</style>
