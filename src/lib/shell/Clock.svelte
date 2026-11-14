<script lang="ts">
  const timeFormat = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
  const fullFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full' });

  let now = $state(new Date());

  $effect(() => {
    const timer = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(timer);
  });

  function pad(value: number) {
    return String(value).padStart(2, '0');
  }

  const date = $derived(now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()));
</script>

<div class="clock" title={fullFormat.format(now)}>
  <span>{timeFormat.format(now)}</span>
  <span>{date}</span>
</div>

<style>
  .clock {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    font-size: 12px;
    line-height: 1.25;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
    white-space: nowrap;
  }
</style>
