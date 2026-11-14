<script lang="ts">
  import type { IconName } from '../os/types';

  let { name, size = 32 }: { name: IconName; size?: number } = $props();
  const uid = $props.id();
  const spikes = Array.from({ length: 12 }, (_, i) => -110 + i * 20);
</script>

{#if name === 'hedgehog'}
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
{:else if name === 'power' || name === 'restart' || name === 'logoff' || name === 'back' || name === 'up'}
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
    {:else if name === 'logoff'}
      <path d="M6.5 2.5h-3v11h3" />
      <path d="M7 8h6.5M11 5.5 13.5 8 11 10.5" />
    {:else if name === 'back'}
      <path d="M7.5 3.5 3 8l4.5 4.5M3 8h10" />
    {:else}
      <path d="M3.5 7.5 8 3l4.5 4.5M8 3v10" />
    {/if}
  </svg>
{:else}
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <defs>
      <linearGradient id="{uid}-case" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f7fafb" />
        <stop offset="1" stop-color="#a3b5bc" />
      </linearGradient>
      <linearGradient id="{uid}-aqua" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#a5f5e3" />
        <stop offset=".5" stop-color="#52d9bb" />
        <stop offset="1" stop-color="#0f8fa8" />
      </linearGradient>
      <linearGradient id="{uid}-page" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="1" stop-color="#dff3f1" />
      </linearGradient>
      <linearGradient id="{uid}-folder" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff0a8" />
        <stop offset="1" stop-color="#f0b43a" />
      </linearGradient>
      <linearGradient id="{uid}-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f4fffd" stop-opacity=".95" />
        <stop offset="1" stop-color="#7fd6cc" stop-opacity=".8" />
      </linearGradient>
      <linearGradient id="{uid}-red" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ff8f7a" />
        <stop offset="1" stop-color="#c22f17" />
      </linearGradient>
      <linearGradient id="{uid}-blue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8fdcf7" />
        <stop offset="1" stop-color="#0f7fb0" />
      </linearGradient>
      <linearGradient id="{uid}-disc" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset=".35" stop-color="#bfeee6" />
        <stop offset=".6" stop-color="#e8eef6" />
        <stop offset="1" stop-color="#9fb8d8" />
      </linearGradient>
    </defs>

    {#if name === 'computer' || name === 'system'}
      <path d="M12.5 22.5h7l1.5 4h-10z" fill="url(#{uid}-case)" stroke="#5c6f78" stroke-linejoin="round" />
      <rect x="8" y="26.5" width="16" height="3" rx="1.5" fill="url(#{uid}-case)" stroke="#5c6f78" />
      <rect x="2.5" y="3.5" width="27" height="19" rx="2.5" fill="url(#{uid}-case)" stroke="#5c6f78" />
      <rect x="5" y="6" width="22" height="14" rx="1" fill="url(#{uid}-aqua)" stroke="#2c6f74" stroke-width=".8" />
      <path d="M5.4 6.4h21.2v5.4C19.5 12.4 12 11 5.4 14.6z" fill="#fff" opacity=".38" />
      {#if name === 'computer'}
        <circle cx="16" cy="13.2" r="3.3" fill="#fff" opacity=".9" />
        <circle cx="16" cy="13.2" r="2.1" fill="#0f8fa8" />
      {:else}
        <circle cx="24" cy="23.5" r="6.8" fill="url(#{uid}-aqua)" stroke="#0b6a63" />
        <path d="M20.6 23.7l2.4 2.4 4.4-4.9" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      {/if}
    {:else if name === 'notepad'}
      <path d="M6.5 5.5h19v23h-19z" fill="url(#{uid}-page)" stroke="#6d8791" stroke-linejoin="round" />
      <rect x="6.5" y="4.5" width="19" height="5" rx="1" fill="url(#{uid}-aqua)" stroke="#2c6f74" />
      <path d="M10 2.8v4M14 2.8v4M18 2.8v4M22 2.8v4" stroke="#55707a" stroke-width="1.4" stroke-linecap="round" />
      <path d="M9.5 14h13M9.5 17.5h13M9.5 21h13M9.5 24.5h8" stroke="#7fb8c9" stroke-width="1.2" stroke-linecap="round" />
    {:else if name === 'text' || name === 'sysfile'}
      <path d="M7.5 3.5h12l5 5v20h-17z" fill="url(#{uid}-page)" stroke="#6d8791" stroke-linejoin="round" />
      <path d="M19.5 3.5v5h5z" fill="#cfe6e6" stroke="#6d8791" stroke-linejoin="round" />
      {#if name === 'text'}
        <path d="M10.5 13h11M10.5 16.5h11M10.5 20h11M10.5 23.5h7" stroke="#7fb8c9" stroke-width="1.2" stroke-linecap="round" />
      {:else}
        <circle cx="16" cy="19" r="4.6" fill="none" stroke="#5c7f88" stroke-width="2.6" stroke-dasharray="2.3 1.3" />
        <circle cx="16" cy="19" r="3.3" fill="#9fe0d6" stroke="#5c7f88" />
        <circle cx="16" cy="19" r="1.1" fill="#fff" stroke="#5c7f88" stroke-width=".6" />
      {/if}
    {:else if name === 'folder'}
      <path d="M3.5 8.5a2 2 0 0 1 2-2h6.3l2.6 3h12.1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-21a2 2 0 0 1-2-2z" fill="#e0a93b" stroke="#a87216" />
      <rect x="6" y="10.5" width="20" height="8" rx="1" fill="#fff" stroke="#c9c9c9" />
      <path d="M3.5 15a2 2 0 0 1 2-2h21a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2h-21a2 2 0 0 1-2-2z" fill="url(#{uid}-folder)" stroke="#a87216" />
      <path d="M5.5 14.5h21" stroke="#fff" stroke-linecap="round" opacity=".7" />
    {:else if name === 'disk'}
      <path d="M6.5 8.5h19l4 9.5h-27z" fill="url(#{uid}-case)" stroke="#5c6f78" stroke-linejoin="round" />
      <rect x="2.5" y="18" width="27" height="8.5" rx="2" fill="url(#{uid}-case)" stroke="#5c6f78" />
      <path d="M6 22.2h11" stroke="#5c6f78" stroke-linecap="round" />
      <circle cx="25" cy="22.2" r="1.7" fill="#52d9bb" stroke="#0b6a63" stroke-width=".7" />
      <path d="M8 10h16l1.2 3H6.8z" fill="#fff" opacity=".5" />
    {:else if name === 'floppy'}
      <path d="M5.5 4.5h18.3l2.7 2.7v20.3h-21z" fill="#3d5a66" stroke="#1f3138" stroke-linejoin="round" />
      <rect x="10" y="4.5" width="11" height="8" fill="url(#{uid}-case)" stroke="#1f3138" />
      <rect x="16.5" y="6" width="2.8" height="5" fill="#3d5a66" />
      <rect x="8.5" y="16.5" width="15" height="11" fill="#fff" stroke="#1f3138" />
      <path d="M10.5 19.5h11M10.5 22.5h11" stroke="#52d9bb" stroke-width="1.3" stroke-linecap="round" />
    {:else if name === 'cd'}
      <circle cx="16" cy="16" r="12.5" fill="url(#{uid}-disc)" stroke="#6d8791" />
      <path d="M16 16 8.2 6.3A12.5 12.5 0 0 1 14 3.7z" fill="#52d9bb" opacity=".45" />
      <path d="M16 16l7.8 9.7A12.5 12.5 0 0 1 18 28.3z" fill="#19b4d8" opacity=".35" />
      <circle cx="16" cy="16" r="4.2" fill="#eef6f7" stroke="#6d8791" />
      <circle cx="16" cy="16" r="1.6" fill="#fff" stroke="#6d8791" />
    {:else if name === 'bin' || name === 'bin-full'}
      <path d="M8 9.5h16l-1.8 18a1.5 1.5 0 0 1-1.5 1.3h-9.4a1.5 1.5 0 0 1-1.5-1.3z" fill="url(#{uid}-glass)" stroke="#3c8f8a" stroke-linejoin="round" />
      {#if name === 'bin-full'}
        <path d="M10.2 9.5l1.6-4.6 3 1.8 2.2-3.5 3 2.9 1.9 3.4z" fill="#fff" stroke="#8aa0a8" stroke-linejoin="round" />
        <path d="M11.8 4.9l1.8 3.2M17 3.2l-.6 4.3M20 6.1l-1.6 2" fill="none" stroke="#b6c6cc" stroke-linecap="round" />
      {/if}
      <path d="M7.4 9.5a8.6 2.4 0 0 0 17.2 0" fill="url(#{uid}-glass)" stroke="#3c8f8a" />
      {#if name === 'bin'}
        <ellipse cx="16" cy="9.5" rx="8.6" ry="2.4" fill="#f4fffd" stroke="#3c8f8a" />
      {/if}
      <path d="M12.3 14.5l.8 11M16 14.5v11M19.7 14.5l-.8 11" stroke="#3c8f8a" stroke-linecap="round" opacity=".5" />
    {:else if name === 'player'}
      <circle cx="16" cy="16" r="13" fill="url(#{uid}-aqua)" stroke="#0b6a63" />
      <ellipse cx="16" cy="10" rx="9" ry="5.5" fill="#fff" opacity=".3" />
      <path d="M13 10.2v11.6l9.2-5.8z" fill="#fff" stroke="#0b6a63" stroke-width=".8" stroke-linejoin="round" />
    {:else if name === 'terminal'}
      <rect x="2.5" y="5.5" width="27" height="21" rx="2.5" fill="url(#{uid}-case)" stroke="#5c6f78" />
      <rect x="5" y="9.5" width="22" height="14.5" rx="1" fill="#04222a" stroke="#2c6f74" stroke-width=".8" />
      <path d="M8 13.5l3.5 3-3.5 3" fill="none" stroke="#52d9bb" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M13.5 20h5.5" stroke="#52d9bb" stroke-width="1.6" stroke-linecap="round" />
    {:else if name === 'control'}
      <rect x="3.5" y="4.5" width="25" height="23" rx="3" fill="url(#{uid}-case)" stroke="#5c6f78" />
      <path d="M8 11h16M8 16h16M8 21h16" stroke="#6d8791" stroke-width="1.6" stroke-linecap="round" />
      <circle cx="12" cy="11" r="2.6" fill="url(#{uid}-aqua)" stroke="#0b6a63" />
      <circle cx="20.5" cy="16" r="2.6" fill="url(#{uid}-aqua)" stroke="#0b6a63" />
      <circle cx="14.5" cy="21" r="2.6" fill="url(#{uid}-aqua)" stroke="#0b6a63" />
    {:else if name === 'error'}
      <circle cx="16" cy="16" r="13" fill="url(#{uid}-red)" stroke="#8a1a0c" />
      <ellipse cx="16" cy="10" rx="9" ry="5.5" fill="#fff" opacity=".25" />
      <path d="M11 11l10 10M21 11L11 21" stroke="#fff" stroke-width="3.2" stroke-linecap="round" />
    {:else if name === 'question'}
      <circle cx="16" cy="16" r="13" fill="url(#{uid}-blue)" stroke="#0b5a80" />
      <ellipse cx="16" cy="10" rx="9" ry="5.5" fill="#fff" opacity=".25" />
      <path d="M12 12.4a4.1 4.1 0 1 1 6.3 3.4c-1.5 1-2.3 1.7-2.3 3.4" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" />
      <circle cx="16" cy="23.6" r="1.8" fill="#fff" />
    {:else}
      <circle cx="16" cy="16" r="13" fill="url(#{uid}-aqua)" stroke="#0b6a63" />
      <ellipse cx="16" cy="10" rx="9" ry="5.5" fill="#fff" opacity=".25" />
      <circle cx="16" cy="9.6" r="2.1" fill="#fff" />
      <rect x="14.1" y="13.6" width="3.8" height="10.6" rx="1.2" fill="#fff" />
    {/if}
  </svg>
{/if}

<style>
  svg {
    display: block;
    flex: none;
  }
</style>
