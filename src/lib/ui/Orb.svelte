<script lang="ts">
  let { size = 40 }: { size?: number } = $props();
  const uid = $props.id();
</script>

<svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
  <defs>
    <linearGradient id="{uid}-ring" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a8496" />
      <stop offset="1" stop-color="#052a33" />
    </linearGradient>
    <radialGradient id="{uid}-ball" cx=".38" cy=".28" r=".85">
      <stop offset="0" stop-color="#d6fff5" />
      <stop offset=".42" stop-color="#52d9bb" />
      <stop offset=".8" stop-color="#0f8fa8" />
      <stop offset="1" stop-color="#075a70" />
    </radialGradient>
    <linearGradient id="{uid}-gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".9" />
      <stop offset="1" stop-color="#fff" stop-opacity="0" />
    </linearGradient>
    <radialGradient id="{uid}-glow" cx=".5" cy="1" r=".6">
      <stop offset="0" stop-color="#c9fff2" stop-opacity=".85" />
      <stop offset="1" stop-color="#c9fff2" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="31" fill="url(#{uid}-ring)" />
  <circle cx="32" cy="32" r="30.5" fill="none" stroke="#fff" stroke-opacity=".45" />
  <circle cx="32" cy="32" r="27" fill="url(#{uid}-ball)" />
  <circle cx="32" cy="32" r="27" fill="url(#{uid}-glow)" />
  <ellipse cx="32" cy="18.5" rx="19" ry="11.5" fill="url(#{uid}-gloss)" />
  <text
    x="32"
    y="40"
    text-anchor="middle"
    font-family="Segoe UI, Arial, sans-serif"
    font-weight="800"
    font-size="21"
    fill="#fff"
    stroke="#075a70"
    stroke-width="2.5"
    paint-order="stroke">S19</text
  >
</svg>

<style>
  svg {
    display: block;
    flex: none;
  }
</style>
