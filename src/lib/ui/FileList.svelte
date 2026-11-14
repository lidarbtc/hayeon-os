<script lang="ts">
  import { opensFromList, usesMouse } from '../os/pointer';
  import type { ListColumn, ListRow } from '../os/types';
  import Icon from './Icon.svelte';

  let {
    columns,
    rows,
    selected = $bindable(null),
    empty,
    onopen,
    ondelete
  }: {
    columns: ListColumn[];
    rows: ListRow[];
    selected?: string | null;
    /** Shown when there are no rows. */
    empty: string;
    onopen: (key: string) => void;
    ondelete?: (key: string) => void;
  } = $props();

  const wide = $derived(columns.map((column) => column.width).join(' '));
  const narrow = $derived(
    columns
      .filter((column) => !column.optional)
      .map((column) => column.width)
      .join(' ')
  );

  function click(event: MouseEvent, key: string) {
    const again = selected === key;
    selected = key;
    if (opensFromList(event, again)) onopen(key);
  }

  function keydown(event: KeyboardEvent, key: string) {
    if (event.key !== 'Delete' || !ondelete) return;
    event.preventDefault();
    ondelete(key);
  }

  function pressBlank(event: PointerEvent) {
    if (!(event.target as HTMLElement).closest('.row')) selected = null;
  }
</script>

<div class="list" style="--cols: {wide}; --cols-narrow: {narrow}">
  <div class="head grid" aria-hidden="true">
    {#each columns as column (column.label)}
      <span class:optional={column.optional} class:end={column.align === 'end'}>{column.label}</span>
    {/each}
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="rows" onpointerdown={pressBlank}>
    {#each rows as row (row.key)}
      <button
        class="row grid"
        class:selected={selected === row.key}
        onclick={(event) => click(event, row.key)}
        ondblclick={() => {
          if (usesMouse()) onopen(row.key);
        }}
        onkeydown={(event) => keydown(event, row.key)}
      >
        {#each columns as column, index (column.label)}
          <span class:optional={column.optional} class:end={column.align === 'end'} class:name={index === 0}>
            {#if index === 0}
              <Icon name={row.icon} size={16} />
            {/if}
            <span class="text">{row.cells[index]}</span>
          </span>
        {/each}
      </button>
    {:else}
      <p class="empty">{empty}</p>
    {/each}
  </div>
</div>

<style>
  .list {
    container-type: inline-size;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: #fff;
  }

  .grid {
    display: grid;
    grid-template-columns: var(--cols);
    align-items: center;
  }

  .head {
    flex: none;
    padding: 0 3px;
    border-bottom: 1px solid #d5e2e2;
    background: linear-gradient(180deg, #fff, #f1f6f6);
    color: #4a666c;
  }

  .head span {
    padding: 4px 8px;
    border-right: 1px solid #e3ecec;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rows {
    flex: 1;
    min-height: 0;
    padding: 2px;
    overflow-y: auto;
  }

  .row {
    width: 100%;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 2px;
    background: none;
    text-align: left;
  }

  .row > span {
    min-width: 0;
    padding: 3px 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row .name {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .end {
    text-align: right;
  }

  .row:hover,
  .row:focus-visible {
    outline: none;
    border-color: #b8e8dd;
    background: linear-gradient(180deg, #f7fffd, #e3f9f3);
  }

  .row.selected {
    border-color: #7fd6c4;
    background: linear-gradient(180deg, #e9fff9, #c2f3e7);
  }

  .empty {
    margin: 28px 12px 0;
    color: #6f8a90;
    text-align: center;
  }

  @container (max-width: 470px) {
    .grid {
      grid-template-columns: var(--cols-narrow);
    }

    .optional {
      display: none;
    }
  }

  @media (pointer: coarse) {
    .row > span {
      padding-block: 9px;
    }
  }
</style>
