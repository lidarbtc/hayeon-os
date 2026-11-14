<script lang="ts">
  import { photoById, photos, thumbUrl } from '../os/photos.svelte';
  import { settings, type Scene, type Theme } from '../os/settings.svelte';
  import { wm, type Win } from '../os/wm.svelte';
  import Wallpaper from '../ui/Wallpaper.svelte';

  let { win }: { win: Win } = $props();

  const themes: { id: Theme; label: string; note: string }[] = [
    { id: 'aero', label: '에어로', note: '유리처럼 비치는 창' },
    { id: 'luna', label: '루나', note: '또렷한 색의 창' }
  ];

  const wallpapers: { id: Scene; label: string }[] = [
    { id: 'hill', label: '언덕' },
    { id: 'night', label: '밤 언덕' },
    { id: 'aqua', label: '물결' }
  ];

  // The picture last chosen in the viewer, or the first one until then.
  const picture = $derived(photoById(settings.wallpaperPhoto) ?? photos[0]);

  function monday() {
    wm.dialog({
      key: 'monday:' + win.id,
      owner: win.id,
      title: '월요일',
      kind: 'error',
      message: '월요일을 끌 수 없습니다.\n\n관리자 권한이 필요하지만 이 컴퓨터에는 관리자가 없습니다.'
    });
  }
</script>

<div class="control">
  <section>
    <h3>테마</h3>
    <div class="choices">
      {#each themes as theme (theme.id)}
        <button
          class="choice"
          class:current={settings.theme === theme.id}
          aria-pressed={settings.theme === theme.id}
          onclick={() => settings.setTheme(theme.id)}
        >
          <span class="preview {theme.id}"><i></i></span>
          <strong>{theme.label}</strong>
          <small>{theme.note}</small>
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h3>배경 화면</h3>
    <div class="choices">
      {#each wallpapers as paper (paper.id)}
        <button
          class="choice"
          class:current={settings.wallpaper === paper.id}
          aria-pressed={settings.wallpaper === paper.id}
          onclick={() => settings.setWallpaper(paper.id)}
        >
          <span class="preview"><Wallpaper name={paper.id} still /></span>
          <strong>{paper.label}</strong>
        </button>
      {/each}
      {#if picture}
        <button
          class="choice"
          class:current={settings.wallpaper === 'photo'}
          aria-pressed={settings.wallpaper === 'photo'}
          onclick={() => settings.setPhotoWallpaper(picture.id)}
        >
          <span class="preview"><img src={thumbUrl(picture)} alt="" style:object-position={picture.focus} /></span>
          <strong>사진</strong>
        </button>
      {/if}
    </div>
    {#if picture}
      <small class="hint">다른 사진은 내 사진에서 열고 “바탕 화면으로”를 누르면 됩니다.</small>
    {/if}
  </section>

  <section>
    <h3>가젯</h3>
    <div class="row">
      <div>
        <strong>바탕 화면 가젯</strong>
        <small>사진 액자와 D-day를 오른쪽에 둡니다.</small>
      </div>
      <button
        class="switch"
        role="switch"
        aria-label="가젯"
        aria-checked={settings.gadgets}
        onclick={() => settings.setGadgets(!settings.gadgets)}><i></i></button
      >
    </div>
  </section>

  <section>
    <h3>실험실</h3>
    <div class="row">
      <div>
        <strong>중력</strong>
        <small>켜면 창이 바닥으로 떨어집니다.</small>
      </div>
      <button
        class="switch"
        role="switch"
        aria-label="중력"
        aria-checked={settings.gravity}
        onclick={() => (settings.gravity = !settings.gravity)}><i></i></button
      >
    </div>
    <div class="row">
      <div>
        <strong>월요일</strong>
        <small>끄기를 시도해 볼 수 있습니다.</small>
      </div>
      <button class="switch" role="switch" aria-label="월요일" aria-checked="true" onclick={monday}><i></i></button>
    </div>
  </section>
</div>

<style>
  .control {
    height: 100%;
    padding: 4px 16px 14px;
    overflow-y: auto;
    background: #f6fafa;
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 0 9px;
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

  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .choice {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 128px;
    padding: 7px 6px 6px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: none;
  }

  .choice:hover,
  .choice:focus-visible {
    outline: none;
    border-color: #b8e8dd;
    background: linear-gradient(180deg, #f7fffd, #e3f9f3);
  }

  .choice.current {
    border-color: #52d9bb;
    background: linear-gradient(180deg, #e9fff9, #c2f3e7);
  }

  .choice strong {
    margin-top: 4px;
    font-weight: 400;
  }

  small {
    display: block;
    font-size: 12px;
    color: #5c7f88;
  }

  .preview {
    position: relative;
    display: block;
    width: 112px;
    height: 64px;
    border: 1px solid #5c7f88;
    border-radius: 2px;
    overflow: hidden;
    background: linear-gradient(180deg, #0a7fb6, #2bbfd2 45%, #7fe8d2 70%, #6fdc74 71%, #0d947d);
  }

  .preview img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hint {
    margin: 6px 2px 0;
  }

  /* A tiny window in each theme's style. */
  .preview i {
    position: absolute;
    inset: 12px 18px 12px;
  }

  .preview.aero i {
    border: 1px solid rgba(6, 46, 54, 0.8);
    border-radius: 3px;
    background:
      linear-gradient(180deg, transparent 9px, #fff 9px) padding-box,
      linear-gradient(115deg, rgba(255, 255, 255, 0.75), rgba(110, 228, 205, 0.6) 40%, rgba(36, 168, 190, 0.6));
    box-shadow: 0 3px 8px rgba(3, 40, 50, 0.45);
  }

  .preview.luna i {
    border: 2px solid #0b8799;
    border-top: 0;
    border-radius: 4px 4px 0 0;
    background: linear-gradient(180deg, #4fdcc3, #0b8799 9px, #fff 9px);
    box-shadow: 0 3px 8px rgba(3, 40, 50, 0.45);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 7px 2px;
  }

  .row strong {
    font-weight: 400;
  }

  .switch {
    flex: none;
    width: 44px;
    height: 22px;
    padding: 2px;
    border: 1px solid #6f8a90;
    border-radius: 11px;
    background: linear-gradient(180deg, #c5d2d2, #e3ebeb);
    box-shadow: inset 0 1px 3px rgba(4, 60, 70, 0.3);
    transition: background 0.15s;
  }

  .switch i {
    display: block;
    width: 16px;
    height: 16px;
    border: 1px solid #6f8a90;
    border-radius: 50%;
    background: linear-gradient(180deg, #fff, #dbe3e3);
    transition: transform 0.15s;
  }

  .switch[aria-checked='true'] {
    border-color: #1f9c8a;
    background: linear-gradient(180deg, #2fb8a2, #52d9bb);
  }

  .switch[aria-checked='true'] i {
    border-color: #1f9c8a;
    transform: translateX(22px);
  }

  .switch:focus-visible {
    outline: 2px solid #075a70;
    outline-offset: 2px;
  }
</style>
