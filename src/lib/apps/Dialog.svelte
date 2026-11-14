<script lang="ts">
  import { untrack } from 'svelte';
  import type { DialogButton, DialogOptions } from '../os/types';
  import { wm, type Win } from '../os/wm.svelte';
  import Icon from '../ui/Icon.svelte';

  let { win, options }: { win: Win; options: DialogOptions } = $props();

  const buttons = $derived<DialogButton[]>(options.buttons ?? [{ label: '확인', primary: true }]);
  let value = $state(untrack(() => options.input?.value ?? ''));
  let root: HTMLElement;

  function press(button: DialogButton) {
    if (button.action?.(value) === false) return;
    wm.close(win.id);
  }

  function keydown(event: KeyboardEvent) {
    // Enter also confirms a Hangul syllable that is still being composed; that one is not ours.
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      wm.close(win.id);
    } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      const primary = buttons.find((button) => button.primary);
      if (primary) press(primary);
    }
  }

  $effect(() => {
    const target = root.querySelector<HTMLElement>('input, .primary') ?? root.querySelector<HTMLElement>('button');
    target?.focus();
    if (target instanceof HTMLInputElement) {
      // Preselect the name without its extension, ready to be typed over.
      const dot = target.value.lastIndexOf('.');
      target.setSelectionRange(0, dot > 0 ? dot : target.value.length);
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="dialog" bind:this={root} onkeydown={keydown}>
  <div class="content">
    {#if options.kind}
      <Icon name={options.kind} size={32} />
    {/if}
    <div class="text">
      <p>{options.message}</p>
      {#if options.input}
        <label>
          <span>{options.input.label}</span>
          <input type="text" bind:value spellcheck="false" autocomplete="off" />
        </label>
      {/if}
    </div>
  </div>
  <footer>
    {#each buttons as button (button.label)}
      <button class="btn" class:primary={button.primary} onclick={() => press(button)}>{button.label}</button>
    {/each}
  </footer>
</div>

<style>
  .dialog {
    background: #fff;
  }

  .content {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 18px 18px 20px;
  }

  .text {
    flex: 1;
    min-width: 0;
  }

  p {
    margin: 0;
    padding-top: 2px;
    white-space: pre-line;
    overflow-wrap: anywhere;
    user-select: text;
    -webkit-user-select: text;
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
  }

  label span {
    flex: none;
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 3px 6px;
    border: 1px solid #8fa5a8;
    border-radius: 2px;
    background: #fff;
  }

  input:focus {
    outline: none;
    border-color: #1f9c8a;
    box-shadow: 0 0 0 1px rgba(82, 217, 187, 0.65);
  }

  footer {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid #dbe6e6;
    background: #f1f6f6;
  }

  @media (max-width: 639px) {
    input {
      font-size: 16px;
    }
  }
</style>
