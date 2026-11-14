<script lang="ts">
  import { fade } from 'svelte/transition';
  import { session } from './lib/os/session.svelte';
  import Boot from './lib/screens/Boot.svelte';
  import Welcome from './lib/screens/Welcome.svelte';
  import Leaving from './lib/screens/Leaving.svelte';
  import Off from './lib/screens/Off.svelte';
  import Desktop from './lib/shell/Desktop.svelte';
</script>

{#if session.phase === 'boot'}
  <div class="screen" transition:fade={{ duration: 350 }}><Boot /></div>
{:else if session.phase === 'welcome'}
  <div class="screen" transition:fade={{ duration: 350 }}><Welcome /></div>
{:else if session.phase === 'desktop'}
  <div class="screen" transition:fade={{ duration: 350 }}><Desktop /></div>
{:else if session.phase === 'leaving'}
  <div class="screen" transition:fade={{ duration: 350 }}><Leaving /></div>
{:else}
  <div class="screen" transition:fade={{ duration: 350 }}><Off /></div>
{/if}
