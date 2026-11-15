<script lang="ts">
  import { t } from '../os/i18n';
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import { photos, photoUrl, thumbUrl, viewer, type Photo } from '../os/photos.svelte';
  import { settings } from '../os/settings.svelte';
  import { wm, type Win } from '../os/wm.svelte';

  let { win }: { win: Win } = $props();

  const SLIDE = 4000;

  /** null shows every picture at once; a number shows that one. */
  let current = $state<number | null>(null);
  let playing = $state(false);
  let note = $state('');

  const photo = $derived(current === null ? null : photos[current]);

  // Albums in the order their first picture appears.
  const albums = $derived.by(() => {
    const groups = new Map<string, { photo: Photo; index: number }[]>();
    photos.forEach((item, index) => {
      const name = item.album || t('기타', 'Other');
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push({ photo: item, index });
    });
    return [...groups];
  });

  // The picture frame on the desktop opens the viewer on what it was showing.
  $effect(() => {
    const want = viewer.want;
    if (want === null) return;
    untrack(() => {
      const index = photos.findIndex((item) => item.id === want);
      if (index >= 0) show(index);
      viewer.want = null;
    });
  });

  $effect(() => {
    const title = (photo ? photo.title + ' - ' : '') + t('사진 뷰어', 'Photo Viewer');
    untrack(() => wm.patch(win.id, { title }));
  });

  $effect(() => {
    if (!playing) return;
    const timer = setInterval(() => step(1), SLIDE);
    return () => clearInterval(timer);
  });

  function show(index: number) {
    current = index;
    note = '';
  }

  function step(by: number) {
    if (current === null) return;
    show((current + by + photos.length) % photos.length);
  }

  function back() {
    current = null;
    playing = false;
    note = '';
  }

  function toggleSlides() {
    if (current === null) show(0);
    playing = !playing;
  }

  function useAsWallpaper() {
    if (!photo) return;
    settings.setPhotoWallpaper(photo.id);
    note = t('바탕 화면으로 설정했습니다.', 'Set as your wallpaper.');
  }

  function day(date: string) {
    return date.replaceAll('-', '.');
  }

  function keydown(event: KeyboardEvent) {
    if (wm.activeId !== win.id || current === null) return;
    if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'Escape') back();
    else return;
    event.preventDefault();
  }
</script>

<svelte:window onkeydown={keydown} />

<div class="viewer">
  <div class="toolbar bar">
    <button class="tool" disabled={current === null} onclick={back}>{t('모아 보기', 'All Photos')}</button>
    <button class="tool" disabled={current === null} onclick={() => step(-1)}>{t('이전', 'Previous')}</button>
    <button class="tool" disabled={current === null} onclick={() => step(1)}>{t('다음', 'Next')}</button>
    <button class="tool" disabled={!photos.length} aria-pressed={playing} onclick={toggleSlides}>
      {playing ? t('슬라이드 쇼 멈춤', 'Stop Slide Show') : t('슬라이드 쇼', 'Slide Show')}
    </button>
    <button class="tool" disabled={!photo} onclick={useAsWallpaper}>{t('바탕 화면으로', 'Set as Wallpaper')}</button>
  </div>

  {#if photo}
    <div class="stage">
      {#key photo.id}
        <img src={photoUrl(photo)} alt={photo.title} in:fade={{ duration: 220 }} />
      {/key}
      <button class="nav prev" aria-label={t('이전 사진', 'Previous photo')} onclick={() => step(-1)}>
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M10.5 2.5 5 8l5.5 5.5" /></svg>
      </button>
      <button class="nav next" aria-label={t('다음 사진', 'Next photo')} onclick={() => step(1)}>
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M5.5 2.5 11 8l-5.5 5.5" /></svg>
      </button>
    </div>
    <div class="about">
      <p class="what">
        <strong>{photo.title}</strong>
        {#if photo.date}<span>{day(photo.date)}</span>{/if}
      </p>
      {#if photo.caption}<p>{photo.caption}</p>{/if}
      {#if photo.credit}
        <p class="credit">
          {t('사진:', 'Photo:')}
          {#if photo.source}
            <a href={photo.source} target="_blank" rel="noopener noreferrer">{photo.credit}</a>
          {:else}
            {photo.credit}
          {/if}
        </p>
      {/if}
    </div>
  {:else if photos.length}
    <div class="shelf">
      {#each albums as [name, items] (name)}
        <h3>{name}</h3>
        <div class="grid">
          {#each items as item (item.photo.id)}
            <button class="thumb" onclick={() => show(item.index)}>
              <img src={thumbUrl(item.photo)} alt="" loading="lazy" style:object-position={item.photo.focus} />
              <span>{item.photo.title}</span>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {:else}
    <p class="empty">{t('아직 사진이 없습니다.', 'No photos yet.')}</p>
  {/if}

  <div class="statusbar" role="status">
    <span>{note || (current === null ? t('사진 ' + photos.length + '장', photos.length + ' photos') : current + 1 + ' / ' + photos.length)}</span>
    {#if photo}<span>{photo.w} × {photo.h}</span>{/if}
  </div>
</div>

<style>
  .viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
  }

  .bar {
    flex-wrap: wrap;
  }

  .tool[aria-pressed='true'] {
    border-color: #7fd6c4;
    background: linear-gradient(180deg, #c5eee3, #9fe0cf);
  }

  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    background:
      radial-gradient(90% 70% at 50% 110%, rgba(25, 180, 216, 0.22), rgba(25, 180, 216, 0) 60%),
      linear-gradient(180deg, #03161c, #06303a);
  }

  .stage img {
    position: absolute;
    inset: 10px;
    width: calc(100% - 20px);
    height: calc(100% - 20px);
    object-fit: contain;
    -webkit-user-drag: none;
  }

  .nav {
    position: absolute;
    top: 50%;
    display: grid;
    place-items: center;
    width: 34px;
    height: 46px;
    margin-top: -23px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.35);
    color: #fff;
    background: rgba(3, 34, 42, 0.5);
    opacity: 0.55;
    transition: opacity 0.12s;
  }

  .nav svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .prev {
    left: 0;
    border-left: 0;
    border-radius: 0 4px 4px 0;
  }

  .next {
    right: 0;
    border-right: 0;
    border-radius: 4px 0 0 4px;
  }

  .nav:hover,
  .nav:focus-visible {
    outline: none;
    opacity: 1;
    background: rgba(15, 143, 168, 0.8);
  }

  .about {
    flex: none;
    padding: 8px 12px 9px;
    border-top: 1px solid #04222a;
    color: #dff5f0;
    background: #06303a;
    user-select: text;
    -webkit-user-select: text;
  }

  .about p {
    margin: 0;
    line-height: 1.45;
  }

  .what {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
  }

  .what strong {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
  }

  .what span,
  .credit {
    font-size: 12px;
    color: #9fd9cf;
  }

  .credit a {
    color: var(--hy-mint);
  }

  .shelf {
    flex: 1;
    min-height: 0;
    padding: 2px 12px 12px;
    overflow-y: auto;
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 0 8px;
    font-size: 13px;
    font-weight: 400;
    color: #0b6f7d;
  }

  h3::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, #b9dcd8, rgba(185, 220, 216, 0));
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 8px;
  }

  .thumb {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 6px 6px 5px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: none;
    font-size: 12px;
    line-height: 1.3;
    text-align: center;
    word-break: keep-all;
  }

  .thumb img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    border: 1px solid #5c7f88;
    object-fit: cover;
    background: #e9f1f1;
    box-shadow: 0 2px 5px rgba(4, 60, 70, 0.25);
  }

  .thumb:hover,
  .thumb:focus-visible {
    outline: none;
    border-color: #7fd6c4;
    background: linear-gradient(180deg, #f3fffb, #c9f5ea);
  }

  .empty {
    flex: 1;
    display: grid;
    place-items: center;
    margin: 0;
    color: #5c7f88;
  }
</style>
