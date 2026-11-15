<script lang="ts">
  import { untrack } from 'svelte';
  import { player, songs, type Song } from '../os/player.svelte';
  import { wm, type Win } from '../os/wm.svelte';

  let { win }: { win: Win } = $props();

  const BARS = 24;
  const BLOCK = 6;

  let canvas: HTMLCanvasElement;
  let clock = $state(0);
  /** Where the position slider is being dragged to, until it is let go. */
  let scrub = $state<number | null>(null);

  const song = $derived(player.song);

  // The list, album by album.
  const albums = (() => {
    const groups: { label: string; items: { song: Song; index: number }[] }[] = [];
    songs.forEach((item, index) => {
      const label = item.pattern ? 'HaYeon OS 기본 음악' : item.year + ' · ' + (item.unit ? item.unit + ' · ' : '') + item.album;
      const last = groups[groups.length - 1];
      if (last?.label === label) last.items.push({ song: item, index });
      else groups.push({ label, items: [{ song: item, index }] });
    });
    return groups;
  })();

  $effect(() => {
    const title = song.title + ' - 미디어 플레이어';
    untrack(() => wm.patch(win.id, { title }));
  });

  // Closing the window, logging off or shutting down all end the music.
  $effect(() => () => player.stop());

  // The visualizer: one column of blocks per band, with a cap that falls slowly.
  $effect(() => {
    const g = canvas.getContext('2d');
    if (!g) return;
    const width = canvas.width;
    const height = canvas.height;
    const rows = Math.floor(height / BLOCK);
    const slot = width / BARS;
    const data = new Uint8Array(256);
    const level = new Float32Array(BARS);
    const cap = new Float32Array(BARS);
    const fill = g.createLinearGradient(0, height, 0, 0);
    fill.addColorStop(0, '#0f8fa8');
    fill.addColorStop(0.55, '#52d9bb');
    fill.addColorStop(1, '#d6fff5');

    let frame = requestAnimationFrame(function draw() {
      const analyser = player.analyser;
      if (analyser && player.playing) analyser.getByteFrequencyData(data);
      else data.fill(0);

      g.clearRect(0, 0, width, height);
      for (let i = 0; i < BARS; i++) {
        // Low notes carry the music, so the bands are narrow at the bottom and wide at the top.
        const from = Math.floor((i / BARS) ** 1.8 * 90) + 1;
        const to = Math.max(from + 1, Math.floor(((i + 1) / BARS) ** 1.8 * 90) + 1);
        let loud = 0;
        for (let bin = from; bin < to; bin++) loud = Math.max(loud, data[bin]);
        const target = loud / 255;
        level[i] = target > level[i] ? target : Math.max(0, level[i] - 0.035);
        cap[i] = level[i] > cap[i] ? level[i] : Math.max(0, cap[i] - 0.008);

        const x = i * slot + 2;
        g.fillStyle = fill;
        for (let row = 0; row < Math.round(level[i] * rows); row++) {
          g.fillRect(x, height - (row + 1) * BLOCK + 1, slot - 4, BLOCK - 2);
        }
        if (cap[i] > 0.02) {
          g.fillStyle = '#ffffff';
          g.fillRect(x, height - Math.round(cap[i] * rows) * BLOCK - 2, slot - 4, 2);
        }
      }

      // A jump starts a moment ahead of the audio clock; the margin keeps the handle from slipping back a second.
      const now = Math.floor(player.elapsed() + 0.1);
      if (now !== clock) clock = now;
      frame = requestAnimationFrame(draw);
    });
    return () => cancelAnimationFrame(frame);
  });

  function time(seconds: number) {
    const whole = Math.round(seconds);
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
  }
</script>

<div class="player">
  <div class="display">
    <canvas bind:this={canvas} width="480" height="150"></canvas>
    <input
      class="seek"
      type="range"
      min="0"
      max={Math.round(song.seconds)}
      step="1"
      value={scrub ?? clock}
      aria-label="재생 위치"
      oninput={(event) => (scrub = Number(event.currentTarget.value))}
      onchange={(event) => {
        // Move the clock with the handle so quick key presses add up.
        clock = Number(event.currentTarget.value);
        player.seek(clock);
        scrub = null;
      }}
    />
    <div class="now">
      <span class="name">
        {#if player.failed}
          곡을 불러오지 못했습니다
        {:else if player.loading}
          {song.title} · 불러오는 중…
        {:else}
          {song.title}
        {/if}
      </span>
      <span>{time(scrub ?? clock)} / {time(song.seconds)}</span>
    </div>
  </div>

  <div class="controls">
    <button aria-label="이전 곡" title="이전 곡" onclick={() => player.skip(-1)}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 3h2v10H3zM13 3v10L6 8z" /></svg>
    </button>
    <button
      class="main"
      aria-label={player.playing ? '일시 정지' : '재생'}
      title={player.playing ? '일시 정지' : '재생'}
      onclick={() => player.toggle()}
    >
      <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
        {#if player.playing}
          <path d="M4 3h3v10H4zM9 3h3v10H9z" />
        {:else}
          <path d="M5 2.5v11l8.5-5.5z" />
        {/if}
      </svg>
    </button>
    <button aria-label="정지" title="정지" onclick={() => player.stop()}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4h8v8H4z" /></svg>
    </button>
    <button aria-label="다음 곡" title="다음 곡" onclick={() => player.skip(1)}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M11 3h2v10h-2zM3 3v10l7-5z" /></svg>
    </button>
    <label class="volume">
      <span>음량</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={player.volume}
        oninput={(event) => player.setVolume(Number(event.currentTarget.value))}
      />
    </label>
  </div>

  <div class="list">
    {#each albums as album (album.label)}
      <h3>{album.label}</h3>
      <ol>
        {#each album.items as item (item.song.id)}
          <li>
            <button class:current={item.index === player.index} onclick={() => player.play(item.index)}>
              <span class="no">{item.index + 1}</span>
              <span class="title">{item.song.title}</span>
              <span class="length">{time(item.song.seconds)}</span>
            </button>
          </li>
        {/each}
      </ol>
    {/each}
  </div>

  <div class="statusbar"><span>녹음이 아니라, 이 컴퓨터가 음표를 읽어 직접 연주하는 리믹스입니다.</span></div>
</div>

<style>
  .player {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #e9f1f1;
  }

  .display {
    flex: none;
    margin: 8px 8px 0;
    border: 1px solid #04222a;
    border-radius: 4px;
    overflow: hidden;
    background:
      radial-gradient(120% 90% at 50% 110%, rgba(25, 180, 216, 0.28), rgba(25, 180, 216, 0) 60%),
      linear-gradient(180deg, #03161c, #06303a);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  canvas {
    display: block;
    width: 100%;
    height: 124px;
  }

  .seek {
    display: block;
    width: calc(100% - 16px);
    height: 14px;
    margin: 0 8px;
    accent-color: #52d9bb;
  }

  .now {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 10px 6px;
    border-top: 1px solid rgba(82, 217, 187, 0.25);
    color: var(--hy-mint);
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .controls {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 10px 8px;
  }

  .controls button {
    flex: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid #2c8f88;
    border-radius: 50%;
    color: #075a70;
    background: linear-gradient(180deg, #f6fffd, #c9f5ea 48%, #a9ecdc 52%, #d3f9ef);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
  }

  .controls .main {
    width: 42px;
    height: 42px;
    border-color: #075a70;
    color: #fff;
    background: linear-gradient(180deg, #a5f5e3, #52d9bb 46%, #19a9a3 50%, #5fe0c8);
  }

  .controls button:hover,
  .controls button:focus-visible {
    outline: none;
    filter: brightness(1.08);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.7),
      0 0 6px rgba(82, 217, 187, 0.9);
  }

  .controls svg {
    fill: currentColor;
  }

  .volume {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    margin-left: 6px;
    font-size: 12px;
    color: #4a666c;
  }

  .volume input {
    flex: 1;
    min-width: 0;
    accent-color: #19a9a3;
  }

  .list {
    flex: 1;
    min-height: 0;
    margin: 0 8px 8px;
    padding: 2px;
    border: 1px solid #a9bcbf;
    background: #fff;
    overflow-y: auto;
  }

  .list ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .list h3 {
    position: sticky;
    top: -2px;
    margin: 0;
    padding: 4px 8px;
    border-bottom: 1px solid #cfe6e1;
    color: #075a70;
    font-size: 12px;
    font-weight: 600;
    background: linear-gradient(180deg, #f3fbf9, #dff3ee);
  }

  .list button {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 5px 8px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: none;
    text-align: left;
  }

  .list button:hover,
  .list button:focus-visible {
    outline: none;
    border-color: #b8e8dd;
    background: linear-gradient(180deg, #f7fffd, #e3f9f3);
  }

  .list button.current {
    border-color: #7fd6c4;
    background: linear-gradient(180deg, #e9fff9, #c2f3e7);
  }

  .no,
  .length {
    color: #5c7f88;
    font-size: 12px;
  }

  .title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
