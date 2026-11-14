<script lang="ts">
  import { settings, type WallpaperName } from '../os/settings.svelte';

  let { name, still = false }: { name?: WallpaperName; still?: boolean } = $props();
  const uid = $props.id();
  const scene = $derived(name ?? settings.wallpaper);

  const palettes = {
    hill: {
      sky: ['#0a7fb6', '#2bbfd2', '#7fe8d2', '#e4fff7'],
      back: ['#58dba6', '#0f8f86'],
      front: ['#d3f97a', '#6fdc74', '#0d947d'],
      rim: '#f4ffc9',
      cloud: 0.92
    },
    night: {
      sky: ['#03142b', '#0a3557', '#14697c', '#5fc9b4'],
      back: ['#1c7c7a', '#083a47'],
      front: ['#3fb08c', '#17806f', '#06434c'],
      rim: '#b9fff0',
      cloud: 0.14
    },
    aqua: {
      sky: ['#064a6b', '#0b86a8', '#2cc0c2', '#b9fbe9'],
      back: ['#58dba6', '#0f8f86'],
      front: ['#d3f97a', '#6fdc74', '#0d947d'],
      rim: '#f4ffc9',
      cloud: 0
    }
  };
  const palette = $derived(palettes[scene]);

  const bubbles = [
    { x: 170, y: 500, r: 46, delay: 0 },
    { x: 420, y: 300, r: 22, delay: 2 },
    { x: 640, y: 450, r: 30, delay: 4 },
    { x: 985, y: 370, r: 58, delay: 1 },
    { x: 1240, y: 500, r: 26, delay: 3 },
    { x: 1425, y: 330, r: 38, delay: 5 },
    { x: 300, y: 150, r: 16, delay: 2.5 },
    { x: 1090, y: 180, r: 14, delay: 0.5 },
    { x: 800, y: 240, r: 18, delay: 3.5 }
  ];

  // A fixed scatter, so the night sky is the same on every visit.
  const stars = Array.from({ length: 54 }, (_, i) => ({
    x: (i * 397 + 60) % 1600,
    y: (i * 173 + 20) % 540,
    r: 1 + (i % 3) * 0.7,
    opacity: 0.35 + (i % 5) * 0.13
  }));

  const waves = [
    { d: 'M-60 150C300 40 700 300 1660 90v70C760 380 320 120-60 250z', opacity: 0.5 },
    { d: 'M-60 380C420 240 900 470 1660 280v60C900 560 420 320-60 470z', opacity: 0.4 },
    { d: 'M-60 600C380 470 860 720 1660 500v80C880 820 400 560-60 700z', opacity: 0.5 },
    { d: 'M-60 800C400 700 900 900 1660 720v70C900 980 420 780-60 880z', opacity: 0.38 }
  ];
</script>

<svg class="wallpaper" class:still viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="{uid}-sky" x1="0" y1="0" x2={scene === 'aqua' ? 0.6 : 0} y2="1">
      <stop offset="0" stop-color={palette.sky[0]} />
      <stop offset=".36" stop-color={palette.sky[1]} />
      <stop offset=".6" stop-color={palette.sky[2]} />
      <stop offset={scene === 'aqua' ? 1 : 0.78} stop-color={palette.sky[3]} />
    </linearGradient>
    <radialGradient id="{uid}-sun" gradientUnits="userSpaceOnUse" cx="1270" cy="120" r={scene === 'night' ? 330 : 560}>
      <stop offset="0" stop-color="#fff" stop-opacity={scene === 'night' ? 0.55 : 0.98} />
      <stop offset=".12" stop-color="#fff" stop-opacity={scene === 'night' ? 0.3 : 0.7} />
      <stop offset=".45" stop-color="#d6fff5" stop-opacity={scene === 'night' ? 0.1 : 0.25} />
      <stop offset="1" stop-color="#d6fff5" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="{uid}-hill-back" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color={palette.back[0]} />
      <stop offset="1" stop-color={palette.back[1]} />
    </linearGradient>
    <linearGradient id="{uid}-hill-front" x1=".2" y1="0" x2=".7" y2="1">
      <stop offset="0" stop-color={palette.front[0]} />
      <stop offset=".35" stop-color={palette.front[1]} />
      <stop offset="1" stop-color={palette.front[2]} />
    </linearGradient>
    <linearGradient id="{uid}-ribbon" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0" />
      <stop offset=".5" stop-color="#fff" stop-opacity=".5" />
      <stop offset="1" stop-color="#fff" stop-opacity="0" />
    </linearGradient>
    <radialGradient id="{uid}-bubble" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff" stop-opacity="0" />
      <stop offset=".72" stop-color="#fff" stop-opacity=".06" />
      <stop offset=".93" stop-color="#eafffa" stop-opacity=".38" />
      <stop offset="1" stop-color="#fff" stop-opacity=".85" />
    </radialGradient>
    <filter id="{uid}-soft" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="9" />
    </filter>
    <filter id="{uid}-haze" x="-10%" y="-50%" width="120%" height="200%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
  </defs>

  <rect width="1600" height="900" fill="url(#{uid}-sky)" />

  {#if scene === 'night'}
    {#each stars as star, i (i)}
      <circle cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.opacity} />
    {/each}
  {/if}

  <rect width="1600" height="900" fill="url(#{uid}-sun)" />

  {#if scene === 'night'}
    <circle cx="1270" cy="120" r="44" fill="#f4fff9" />
    <circle cx="1254" cy="108" r="9" fill="#cfeee6" opacity=".7" />
    <circle cx="1284" cy="134" r="6" fill="#cfeee6" opacity=".6" />
  {/if}

  {#if scene === 'aqua'}
    {#each waves as wave (wave.d)}
      <path d={wave.d} fill="url(#{uid}-ribbon)" opacity={wave.opacity} />
    {/each}
  {:else}
    <path d="M-60 250C320 90 760 330 1660 130v60C800 400 330 170-60 330z" fill="url(#{uid}-ribbon)" opacity={scene === 'night' ? 0.2 : 0.5} />
    <path d="M-60 420C420 280 900 470 1660 300v36C900 520 420 340-60 470z" fill="url(#{uid}-ribbon)" opacity={scene === 'night' ? 0.14 : 0.35} />

    <g fill="#fff" filter="url(#{uid}-soft)" opacity={palette.cloud}>
      <ellipse cx="300" cy="235" rx="150" ry="34" />
      <ellipse cx="250" cy="210" rx="74" ry="34" />
      <ellipse cx="350" cy="200" rx="88" ry="44" />
      <ellipse cx="820" cy="140" rx="120" ry="24" />
      <ellipse cx="800" cy="122" rx="60" ry="26" />
      <ellipse cx="1200" cy="330" rx="170" ry="30" />
      <ellipse cx="1150" cy="305" rx="80" ry="34" />
      <ellipse cx="1260" cy="300" rx="70" ry="30" />
    </g>

    {#if scene === 'hill'}
      <g opacity=".7">
        <circle cx="1080" cy="255" r="34" fill="#c9fff2" opacity=".28" />
        <circle cx="950" cy="345" r="16" fill="#fff" opacity=".4" />
        <circle cx="820" cy="435" r="54" fill="none" stroke="#d6fff5" stroke-width="3" opacity=".35" />
        <circle cx="700" cy="520" r="22" fill="#e9ff9d" opacity=".25" />
      </g>
    {/if}

    <path d="M0 640C260 560 520 540 820 612s520 88 780-12v300H0z" fill="url(#{uid}-hill-back)" />
    <ellipse cx="800" cy="660" rx="900" ry="26" fill="#fff" opacity={scene === 'night' ? 0.12 : 0.35} filter="url(#{uid}-haze)" />
    <path d="M0 728C300 606 620 604 900 692s500 110 700 50v158H0z" fill="url(#{uid}-hill-front)" />
    <path
      d="M0 728C300 606 620 604 900 692s500 110 700 50"
      fill="none"
      stroke={palette.rim}
      stroke-width="5"
      opacity={scene === 'night' ? 0.3 : 0.55}
      filter="url(#{uid}-soft)"
    />
  {/if}

  <g opacity={scene === 'night' ? 0.55 : 1}>
    {#each bubbles as b, i (i)}
      <g class="bubble" style="animation-delay: -{b.delay}s; animation-duration: {8 + (i % 4)}s">
        <circle cx={b.x} cy={b.y} r={b.r} fill="url(#{uid}-bubble)" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" />
        <ellipse
          cx={b.x - b.r * 0.36}
          cy={b.y - b.r * 0.42}
          rx={b.r * 0.28}
          ry={b.r * 0.15}
          fill="#fff"
          opacity=".85"
          transform="rotate(-38 {b.x - b.r * 0.36} {b.y - b.r * 0.42})"
        />
        <circle cx={b.x + b.r * 0.42} cy={b.y + b.r * 0.46} r={b.r * 0.07} fill="#fff" opacity=".75" />
      </g>
    {/each}
  </g>
</svg>

<style>
  .wallpaper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  .bubble {
    animation: float 9s ease-in-out infinite alternate;
  }

  .still .bubble {
    animation: none;
  }

  @keyframes float {
    from {
      transform: translateY(9px);
    }
    to {
      transform: translateY(-11px);
    }
  }
</style>
