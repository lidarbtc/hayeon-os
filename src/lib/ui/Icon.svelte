<script lang="ts">
  import type { IconName } from '../os/types';

  let { name, size = 32 }: { name: IconName; size?: number } = $props();
  const uid = $props.id();
  const spikes = Array.from({ length: 12 }, (_, i) => -110 + i * 20);
</script>

{#if name === 'about'}
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <defs>
      <linearGradient id="{uid}-case" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f7fafb" />
        <stop offset="1" stop-color="#a3b5bc" />
      </linearGradient>
      <linearGradient id="{uid}-screen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#a5f5e3" />
        <stop offset=".5" stop-color="#52d9bb" />
        <stop offset="1" stop-color="#0f8fa8" />
      </linearGradient>
    </defs>
    <path d="M12.5 22.5h7l1.5 4h-10z" fill="url(#{uid}-case)" stroke="#5c6f78" stroke-linejoin="round" />
    <rect x="8" y="26.5" width="16" height="3" rx="1.5" fill="url(#{uid}-case)" stroke="#5c6f78" />
    <rect x="2.5" y="3.5" width="27" height="19" rx="2.5" fill="url(#{uid}-case)" stroke="#5c6f78" />
    <rect x="5" y="6" width="22" height="14" rx="1" fill="url(#{uid}-screen)" stroke="#2c6f74" stroke-width=".8" />
    <path d="M5.4 6.4h21.2v5.4C19.5 12.4 12 11 5.4 14.6z" fill="#fff" opacity=".38" />
    <circle cx="16" cy="13.2" r="3.3" fill="#fff" opacity=".9" />
    <circle cx="16" cy="13.2" r="2.1" fill="#0f8fa8" />
  </svg>
{:else if name === 'readme'}
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <defs>
      <linearGradient id="{uid}-page" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="1" stop-color="#dff3f1" />
      </linearGradient>
      <linearGradient id="{uid}-top" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8ff0dc" />
        <stop offset="1" stop-color="#19a9a3" />
      </linearGradient>
    </defs>
    <path d="M6.5 5.5h19v23h-19z" fill="url(#{uid}-page)" stroke="#6d8791" stroke-linejoin="round" />
    <rect x="6.5" y="4.5" width="19" height="5" rx="1" fill="url(#{uid}-top)" stroke="#2c6f74" />
    <path d="M10 2.8v4M14 2.8v4M18 2.8v4M22 2.8v4" stroke="#55707a" stroke-width="1.4" stroke-linecap="round" />
    <path d="M9.5 14h13M9.5 17.5h13M9.5 21h13M9.5 24.5h8" stroke="#7fb8c9" stroke-width="1.2" stroke-linecap="round" />
  </svg>
{:else if name === 'hedgehog'}
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <defs>
      <linearGradient id="{uid}-spike" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#b17c55" />
        <stop offset="1" stop-color="#6d4630" />
      </linearGradient>
      <radialGradient id="{uid}-face" cx=".5" cy=".3" r=".75">
        <stop offset="0" stop-color="#fff8ec" />
        <stop offset="1" stop-color="#f5d5b0" />
      </radialGradient>
    </defs>
    <g fill="url(#{uid}-spike)" stroke="#55331f" stroke-linejoin="round">
      {#each spikes as angle (angle)}
        <path d="M-5.2-18 0-29.5 5.2-18z" transform="translate(32 37) rotate({angle})" />
      {/each}
      <circle cx="32" cy="37" r="20.5" />
    </g>
    <path
      d="M21 26l2 4 2-4M30 22.5l2 4 2-4M39 26l2 4 2-4M25.5 31l2 4 2-4M34.5 31l2 4 2-4"
      fill="none"
      stroke="#55331f"
      stroke-width="1.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx="17.5" cy="33.5" r="4.4" fill="#f5d5b0" stroke="#b98d66" />
    <circle cx="46.5" cy="33.5" r="4.4" fill="#f5d5b0" stroke="#b98d66" />
    <circle cx="17.5" cy="33.5" r="2" fill="#ffb3bd" />
    <circle cx="46.5" cy="33.5" r="2" fill="#ffb3bd" />
    <ellipse cx="32" cy="44" rx="15.5" ry="12.5" fill="url(#{uid}-face)" stroke="#b98d66" />
    <ellipse cx="22.5" cy="47.5" rx="3.2" ry="1.9" fill="#ff9fae" opacity=".6" />
    <ellipse cx="41.5" cy="47.5" rx="3.2" ry="1.9" fill="#ff9fae" opacity=".6" />
    <circle cx="26" cy="42" r="2.4" fill="#2a1a12" />
    <circle cx="38" cy="42" r="2.4" fill="#2a1a12" />
    <circle cx="26.8" cy="41.2" r=".8" fill="#fff" />
    <circle cx="38.8" cy="41.2" r=".8" fill="#fff" />
    <ellipse cx="32" cy="46.5" rx="2.7" ry="2" fill="#4a2c1c" />
    <path d="M29.6 49.8q2.4 1.8 4.8 0" fill="none" stroke="#4a2c1c" stroke-width="1.1" stroke-linecap="round" />
  </svg>
{:else}
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {#if name === 'power'}
      <path d="M8 2v6" />
      <path d="M4.6 4.3a5 5 0 1 0 6.8 0" />
    {:else if name === 'restart'}
      <path d="M12.6 8.6A4.7 4.7 0 1 1 11.3 4.7" />
      <path d="M11.6 1.9v3.1H8.5" />
    {:else}
      <path d="M6.5 2.5h-3v11h3" />
      <path d="M7 8h6.5M11 5.5 13.5 8 11 10.5" />
    {/if}
  </svg>
{/if}

<style>
  svg {
    display: block;
    flex: none;
  }
</style>
