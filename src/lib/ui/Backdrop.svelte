<script lang="ts">
  import { photoById, photoUrl, thumbUrl } from '../os/photos.svelte';
  import { settings } from '../os/settings.svelte';
  import Wallpaper from './Wallpaper.svelte';

  const photo = $derived(settings.wallpaper === 'photo' ? photoById(settings.wallpaperPhoto) : undefined);
  // Pictures shaped like a screen fill it. Anything taller or much wider is shown
  // whole, over a blurred copy of itself.
  const fills = $derived(photo ? photo.w / photo.h >= 1.3 && photo.w / photo.h <= 2 : false);
</script>

{#if photo}
  <div class="photo">
    {#key photo.id}
      <img class="blur" src={thumbUrl(photo)} alt="" />
      <img class="main" class:fills src={photoUrl(photo)} alt="" style:object-position={fills ? photo.focus : undefined} />
    {/key}
  </div>
{:else}
  <Wallpaper />
{/if}

<style>
  .photo {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--hy-ink);
  }

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .blur {
    inset: -48px;
    width: calc(100% + 96px);
    height: calc(100% + 96px);
    object-fit: cover;
    filter: blur(30px) saturate(1.25) brightness(0.82);
  }

  .main {
    /* Leaves room for the taskbar, so a whole picture is not hidden behind it. */
    height: calc(100% - var(--taskbar-h));
    object-fit: contain;
    filter: drop-shadow(0 8px 36px rgba(0, 20, 28, 0.55));
  }

  .main.fills {
    height: 100%;
    object-fit: cover;
    filter: none;
  }
</style>
