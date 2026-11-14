<script lang="ts">
  import { avatar, thumbUrl } from '../os/photos.svelte';
  import Icon from './Icon.svelte';

  // Fills its parent, which sets the size and the rounded corners.
  let { size }: { size: number } = $props();
</script>

{#if avatar}
  <img src={thumbUrl(avatar)} alt="" width={size} height={size} style:object-position={avatar.focus ?? '50% 25%'} />
{:else}
  <Icon name="hedgehog" size={Math.round(size * 0.82)} />
{/if}

<style>
  img {
    display: block;
    border-radius: inherit;
    object-fit: cover;
  }
</style>
