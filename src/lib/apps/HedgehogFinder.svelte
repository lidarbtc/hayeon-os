<script lang="ts">
  import { untrack } from 'svelte';
  import { emptyBoard, levels, neighbours, plant, reveal, type Cell, type Level, type LevelId } from '../os/hog';
  import type { Menu } from '../os/types';
  import { FRAME_H, FRAME_W, wm, type Win } from '../os/wm.svelte';
  import Icon from '../ui/Icon.svelte';
  import MenuBar from '../ui/MenuBar.svelte';

  let { win }: { win: Win } = $props();

  const STORAGE_KEY = 'hayeon-os:hog:v1';
  type Records = Partial<Record<LevelId, number>>;

  function loadRecords(): Records {
    const records: Records = {};
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      for (const level of levels) if (typeof data?.[level.id] === 'number') records[level.id] = data[level.id];
    } catch {
      // No storage, no records.
    }
    return records;
  }

  let records = $state(loadRecords());
  let level = $state<Level>(levels[0]);
  let cells = $state<Cell[]>(emptyBoard(levels[0]));
  let phase = $state<'ready' | 'playing' | 'won' | 'lost'>('ready');
  let seconds = $state(0);
  let flagMode = $state(false);
  /** The hedgehog that was stepped on. */
  let stepped = $state(-1);
  let newRecord = $state(false);

  const flags = $derived(cells.filter((cell) => cell.flag).length);
  const over = $derived(phase === 'won' || phase === 'lost');
  const status = $derived.by(() => {
    if (phase === 'won') return '모두 찾았습니다! ' + seconds + '초' + (newRecord ? ' (새 기록)' : '');
    if (phase === 'lost') return '앗, 따가워!';
    return '고슴도치 ' + level.hogs + '마리가 숨어 있습니다.';
  });

  $effect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      if (seconds < 999) seconds++;
    }, 1000);
    return () => clearInterval(timer);
  });

  // The window follows the board: a bigger level makes a bigger window.
  let tableW = $state(0);
  let tableH = $state(0);
  let menuH = $state(0);
  let statusH = $state(0);

  $effect(() => {
    if (!tableW || !tableH) return;
    const w = tableW + FRAME_W;
    const h = tableH + menuH + statusH + FRAME_H;
    // Reading the area makes the window grow back when the screen gets bigger.
    void wm.area.w;
    void wm.area.h;
    untrack(() => wm.fit(win.id, w, h));
  });

  function start(next: Level = level) {
    level = next;
    cells = emptyBoard(next);
    phase = 'ready';
    seconds = 0;
    stepped = -1;
    newRecord = false;
  }

  function lose(index: number) {
    stepped = index;
    phase = 'lost';
    for (const cell of cells) if (cell.hog) cell.open = true;
  }

  function checkWin() {
    if (!cells.every((cell) => cell.hog || cell.open)) return;
    phase = 'won';
    for (const cell of cells) if (cell.hog) cell.flag = true;
    const best = records[level.id];
    if (best === undefined || seconds < best) {
      records[level.id] = seconds;
      newRecord = true;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } catch {
        // The record lasts until the tab closes.
      }
    }
  }

  function open(index: number) {
    if (over) return;
    const cell = cells[index];
    if (cell.flag) return;
    if (cell.open) {
      chord(index);
      return;
    }
    if (phase === 'ready') {
      plant(cells, level, index);
      phase = 'playing';
    }
    if (cell.hog) {
      lose(index);
      return;
    }
    reveal(cells, level, index);
    checkWin();
  }

  /** Clicking a number whose hedgehogs are all flagged opens the rest of its neighbours. */
  function chord(index: number) {
    const cell = cells[index];
    if (cell.near === 0) return;
    const around = neighbours(level, index);
    if (around.filter((n) => cells[n].flag).length !== cell.near) return;
    for (const n of around) {
      if (cells[n].flag || cells[n].open) continue;
      if (cells[n].hog) {
        lose(n);
        return;
      }
      reveal(cells, level, n);
    }
    checkWin();
  }

  function toggleFlag(index: number) {
    const cell = cells[index];
    if (over || cell.open) return;
    cell.flag = !cell.flag;
  }

  function label(cell: Cell, index: number) {
    const where = Math.floor(index / level.cols) + 1 + '행 ' + ((index % level.cols) + 1) + '열, ';
    if (cell.open) return where + (cell.hog ? '고슴도치' : cell.near ? '주변에 ' + cell.near + '마리' : '빈 칸');
    return where + (cell.flag ? '깃발' : '닫힘');
  }

  function lcd(value: number) {
    return String(Math.max(0, Math.min(999, value))).padStart(3, '0');
  }

  function showRecords() {
    wm.dialog({
      key: 'records:' + win.id,
      owner: win.id,
      title: '최고 기록',
      icon: 'hedgehog',
      message: levels
        .map((item) => item.label + ': ' + (records[item.id] === undefined ? '기록 없음' : records[item.id] + '초'))
        .join('\n')
    });
  }

  function showHelp() {
    wm.dialog({
      key: 'help:' + win.id,
      owner: win.id,
      title: '놀이 방법',
      kind: 'info',
      message:
        '고슴도치를 밟지 않고 빈 칸을 모두 열면 됩니다.\n\n' +
        '숫자는 주변 여덟 칸에 숨은 고슴도치 수입니다.\n' +
        '고슴도치가 있을 것 같은 칸에는 깃발을 꽂으세요.\n\n' +
        '깃발: 마우스 오른쪽 단추, F 키, 또는 깃발 단추를 켜고 누르기'
    });
  }

  const menus = $derived<Menu[]>([
    {
      label: '게임',
      items: [
        { label: '새 게임', action: () => start() },
        { separator: true },
        ...levels.map((item) => ({
          label: item.label + ' (' + item.cols + '×' + item.rows + ', ' + item.hogs + '마리)',
          checked: item.id === level.id,
          action: () => start(item)
        })),
        { separator: true },
        { label: '최고 기록', action: showRecords },
        { label: '끝내기', action: () => wm.requestClose(win.id) }
      ]
    },
    { label: '도움말', items: [{ label: '놀이 방법', action: showHelp }] }
  ]);
</script>

{#snippet flag(wrong: boolean)}
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path d="M5 2.5V14" stroke="#04222a" stroke-width="1.6" stroke-linecap="round" />
    <path d="M5.8 3h7l-2 2.6 2 2.6h-7z" fill="#e0463a" stroke="#8a1a0c" stroke-width=".8" stroke-linejoin="round" />
    {#if wrong}
      <path d="M2 2l12 12M14 2L2 14" stroke="#04222a" stroke-width="1.5" stroke-linecap="round" />
    {/if}
  </svg>
{/snippet}

<div class="hog">
  <div bind:offsetHeight={menuH}><MenuBar {menus} /></div>

  <div class="scroll">
    <div class="table" bind:offsetWidth={tableW} bind:offsetHeight={tableH}>
      <div class="head">
        <span class="lcd" title="남은 고슴도치">{lcd(level.hogs - flags)}</span>
        <div class="middle">
          <button class="face" class:lost={phase === 'lost'} aria-label="새 게임" title="새 게임" onclick={() => start()}>
            <Icon name="hedgehog" size={30} />
          </button>
          <button
            class="mode"
            class:on={flagMode}
            aria-label="깃발 꽂기"
            aria-pressed={flagMode}
            title="켜면 누르는 칸에 깃발을 꽂습니다"
            onclick={() => (flagMode = !flagMode)}
          >
            {@render flag(false)}
          </button>
        </div>
        <span class="lcd" title="걸린 시간">{lcd(seconds)}</span>
      </div>

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="grid"
        style="grid-template-columns: repeat({level.cols}, 26px)"
        oncontextmenu={(event) => event.preventDefault()}
      >
        {#each cells as cell, index (index)}
          <button
            class="cell"
            class:open={cell.open}
            class:boom={index === stepped}
            data-n={cell.open && !cell.hog && cell.near ? cell.near : undefined}
            aria-label={label(cell, index)}
            onclick={() => (flagMode ? toggleFlag(index) : open(index))}
            oncontextmenu={(event) => {
              event.preventDefault();
              toggleFlag(index);
            }}
            onkeydown={(event) => {
              if (event.key.toLowerCase() === 'f') toggleFlag(index);
            }}
          >
            {#if cell.open && cell.hog}
              <Icon name="hedgehog" size={21} />
            {:else if cell.open}
              {cell.near || ''}
            {:else if cell.flag}
              {@render flag(phase === 'lost' && !cell.hog)}
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div bind:offsetHeight={statusH}>
    <div class="statusbar" role="status"><span>{status}</span></div>
  </div>
</div>

<style>
  .hog {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #dcebea;
  }

  /* Auto margins centre the board when there is room and let it scroll when there is not. */
  .scroll {
    flex: 1;
    min-height: 0;
    display: grid;
    overflow: auto;
    container-type: inline-size;
  }

  .table {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: max-content;
    margin: auto;
    padding: 10px;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* When the board is wider than the window, the counters stay in view while the board scrolls under them. */
    position: sticky;
    left: 10px;
    align-self: flex-start;
    width: min(100%, 100cqw - 20px);
    padding: 5px 7px;
    border: 2px solid;
    border-color: #9db9b8 #fff #fff #9db9b8;
    background: #cfe2e1;
  }

  .lcd {
    min-width: 50px;
    padding: 2px 5px 1px;
    border: 1px solid #04222a;
    border-radius: 2px;
    background: #04222a;
    color: var(--hy-turquoise);
    font-family: var(--font-mono);
    font-size: 21px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 1px;
    text-align: center;
    text-shadow: 0 0 6px rgba(82, 217, 187, 0.7);
  }

  .middle {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .face,
  .mode {
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid #2c8f88;
    border-radius: 4px;
    background: linear-gradient(180deg, #f6fffd, #c9f5ea 48%, #a9ecdc 52%, #d3f9ef);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
  }

  .face {
    width: 36px;
    height: 36px;
  }

  .face.lost :global(svg) {
    transform: rotate(180deg);
  }

  .mode {
    width: 26px;
    height: 26px;
  }

  .mode.on {
    border-color: #075a70;
    background: linear-gradient(180deg, #8fe0cf, #52d9bb);
    box-shadow: inset 0 2px 4px rgba(4, 60, 70, 0.45);
  }

  .face:hover,
  .mode:hover {
    filter: brightness(1.06);
  }

  .face:focus-visible,
  .mode:focus-visible,
  .cell:focus-visible {
    outline: 2px solid #075a70;
    outline-offset: -2px;
  }

  .grid {
    display: grid;
    grid-auto-rows: 26px;
    gap: 1px;
    padding: 1px;
    border: 2px solid;
    border-color: #9db9b8 #fff #fff #9db9b8;
    background: #b5cccb;
  }

  .cell {
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid #2c8f88;
    border-radius: 3px;
    background: linear-gradient(180deg, #d6fff5, #7fe3cf 48%, #52d9bb 52%, #8ff0dc);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    touch-action: manipulation;
  }

  .cell:not(.open):hover {
    filter: brightness(1.08);
  }

  .cell.open {
    border-color: transparent;
    border-radius: 0;
    background: #eef5f5;
    box-shadow: none;
  }

  .cell.boom {
    background: #ff9d8f;
  }

  .cell[data-n='1'] {
    color: #0b7fb0;
  }

  .cell[data-n='2'] {
    color: #1f8f47;
  }

  .cell[data-n='3'] {
    color: #d2442d;
  }

  .cell[data-n='4'] {
    color: #5a3fb0;
  }

  .cell[data-n='5'] {
    color: #9a4a1f;
  }

  .cell[data-n='6'] {
    color: #0f8f86;
  }

  .cell[data-n='7'] {
    color: #222;
  }

  .cell[data-n='8'] {
    color: #6f7f82;
  }
</style>
