<script lang="ts">
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
</script>

<svg class="wallpaper" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="wp-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a7fb6" />
      <stop offset=".36" stop-color="#2bbfd2" />
      <stop offset=".6" stop-color="#7fe8d2" />
      <stop offset=".78" stop-color="#e4fff7" />
    </linearGradient>
    <radialGradient id="wp-sun" gradientUnits="userSpaceOnUse" cx="1270" cy="120" r="560">
      <stop offset="0" stop-color="#fff" stop-opacity=".98" />
      <stop offset=".12" stop-color="#fff" stop-opacity=".7" />
      <stop offset=".45" stop-color="#d6fff5" stop-opacity=".25" />
      <stop offset="1" stop-color="#d6fff5" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="wp-hill-back" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#58dba6" />
      <stop offset="1" stop-color="#0f8f86" />
    </linearGradient>
    <linearGradient id="wp-hill-front" x1=".2" y1="0" x2=".7" y2="1">
      <stop offset="0" stop-color="#d3f97a" />
      <stop offset=".35" stop-color="#6fdc74" />
      <stop offset="1" stop-color="#0d947d" />
    </linearGradient>
    <linearGradient id="wp-ribbon" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0" />
      <stop offset=".5" stop-color="#fff" stop-opacity=".5" />
      <stop offset="1" stop-color="#fff" stop-opacity="0" />
    </linearGradient>
    <radialGradient id="wp-bubble" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff" stop-opacity="0" />
      <stop offset=".72" stop-color="#fff" stop-opacity=".06" />
      <stop offset=".93" stop-color="#eafffa" stop-opacity=".38" />
      <stop offset="1" stop-color="#fff" stop-opacity=".85" />
    </radialGradient>
    <filter id="wp-soft" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="9" />
    </filter>
    <filter id="wp-haze" x="-10%" y="-50%" width="120%" height="200%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
  </defs>

  <rect width="1600" height="900" fill="url(#wp-sky)" />
  <rect width="1600" height="900" fill="url(#wp-sun)" />

  <path d="M-60 250C320 90 760 330 1660 130v60C800 400 330 170-60 330z" fill="url(#wp-ribbon)" opacity=".5" />
  <path d="M-60 420C420 280 900 470 1660 300v36C900 520 420 340-60 470z" fill="url(#wp-ribbon)" opacity=".35" />

  <g fill="#fff" filter="url(#wp-soft)" opacity=".92">
    <ellipse cx="300" cy="235" rx="150" ry="34" />
    <ellipse cx="250" cy="210" rx="74" ry="34" />
    <ellipse cx="350" cy="200" rx="88" ry="44" />
    <ellipse cx="820" cy="140" rx="120" ry="24" />
    <ellipse cx="800" cy="122" rx="60" ry="26" />
    <ellipse cx="1200" cy="330" rx="170" ry="30" />
    <ellipse cx="1150" cy="305" rx="80" ry="34" />
    <ellipse cx="1260" cy="300" rx="70" ry="30" />
  </g>

  <g opacity=".7">
    <circle cx="1080" cy="255" r="34" fill="#c9fff2" opacity=".28" />
    <circle cx="950" cy="345" r="16" fill="#fff" opacity=".4" />
    <circle cx="820" cy="435" r="54" fill="none" stroke="#d6fff5" stroke-width="3" opacity=".35" />
    <circle cx="700" cy="520" r="22" fill="#e9ff9d" opacity=".25" />
  </g>

  <path d="M0 640C260 560 520 540 820 612s520 88 780-12v300H0z" fill="url(#wp-hill-back)" />
  <ellipse cx="800" cy="660" rx="900" ry="26" fill="#fff" opacity=".35" filter="url(#wp-haze)" />
  <path d="M0 728C300 606 620 604 900 692s500 110 700 50v158H0z" fill="url(#wp-hill-front)" />
  <path
    d="M0 728C300 606 620 604 900 692s500 110 700 50"
    fill="none"
    stroke="#f4ffc9"
    stroke-width="5"
    opacity=".55"
    filter="url(#wp-soft)"
  />

  {#each bubbles as b, i (i)}
    <g class="bubble" style="animation-delay: -{b.delay}s; animation-duration: {8 + (i % 4)}s">
      <circle cx={b.x} cy={b.y} r={b.r} fill="url(#wp-bubble)" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" />
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

  @keyframes float {
    from {
      transform: translateY(9px);
    }
    to {
      transform: translateY(-11px);
    }
  }
</style>
