<script lang="ts">
  import { fade } from 'svelte/transition';
  import { birthdayLabel, daysSinceDebut, daysSinceReveal, daysToBirthday } from '../os/hayeon';
  import { photos, thumbUrl, viewer } from '../os/photos.svelte';
  import { wm } from '../os/wm.svelte';

  const TURN = 9000;

  let index = $state(0);
  let now = $state(new Date());

  const shown = $derived(photos[index % Math.max(1, photos.length)]);

  $effect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => (index = (index + 1) % photos.length), TURN);
    return () => clearInterval(timer);
  });

  $effect(() => {
    const timer = setInterval(() => (now = new Date()), 60_000);
    return () => clearInterval(timer);
  });

  function open() {
    viewer.want = shown.id;
    wm.open('photos');
  }
</script>

<aside class="gadgets" aria-label="가젯">
  {#if shown}
    <button class="frame" title="사진 뷰어에서 열기" onclick={open}>
      <span class="glass">
        {#key shown.id}
          <img src={thumbUrl(shown)} alt={shown.title} style:object-position={shown.focus} transition:fade={{ duration: 600 }} />
        {/key}
      </span>
      <span class="label">{shown.title}</span>
    </button>
  {/if}

  <div class="dday">
    <strong>{birthdayLabel(now)}</strong>
    <span>{daysToBirthday(now) === 0 ? '오늘은 하연 생일' : '하연 생일 · 8월 1일'}</span>
    <dl>
      <dt>데뷔</dt>
      <dd>{daysSinceDebut(now).toLocaleString('ko-KR')}일째</dd>
      <dt>S19 공개</dt>
      <dd>{daysSinceReveal(now).toLocaleString('ko-KR')}일째</dd>
    </dl>
  </div>
</aside>

<style>
  .gadgets {
    position: absolute;
    top: 14px;
    right: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 172px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 30, 40, 0.85);
  }

  .frame,
  .dday {
    border: 1px solid rgba(3, 34, 42, 0.7);
    border-radius: 8px;
    background:
      linear-gradient(115deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.08) 30%, rgba(255, 255, 255, 0) 46%),
      linear-gradient(180deg, rgba(60, 170, 180, 0.5), rgba(5, 62, 80, 0.6));
    -webkit-backdrop-filter: blur(10px) saturate(1.3);
    backdrop-filter: blur(10px) saturate(1.3);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.42),
      0 6px 18px rgba(0, 30, 40, 0.35);
  }

  .frame {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 7px 7px 6px;
    color: inherit;
    text-shadow: inherit;
  }

  .frame:hover,
  .frame:focus-visible {
    outline: none;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.7),
      0 0 12px rgba(201, 255, 242, 0.75),
      0 6px 18px rgba(0, 30, 40, 0.35);
  }

  .glass {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 5 / 6;
    border: 1px solid rgba(3, 34, 42, 0.8);
    border-radius: 3px;
    overflow: hidden;
    background: var(--hy-ink);
  }

  .glass img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* The reflection that makes it a glass frame. */
  .glass::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(125deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.06) 34%, rgba(255, 255, 255, 0) 35%);
    pointer-events: none;
  }

  .label {
    font-size: 12px;
    line-height: 1.3;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dday {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 9px 10px 10px;
  }

  .dday strong {
    font-size: 30px;
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.5px;
    color: var(--hy-mint);
  }

  .dday span {
    font-size: 12px;
    opacity: 0.92;
  }

  dl {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 8px;
    width: 100%;
    margin: 8px 0 0;
    padding-top: 7px;
    border-top: 1px solid rgba(255, 255, 255, 0.28);
    font-size: 12px;
  }

  dt {
    opacity: 0.85;
  }

  dd {
    margin: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
