<script lang="ts">
  import { session } from '../os/session.svelte';

  const messages = {
    logoff: '로그오프하는 중…',
    restart: '다시 시작하는 중…',
    shutdown: '시스템을 종료하는 중…'
  };

  $effect(() => {
    const timer = setTimeout(() => session.finishLeave(), 1500);
    return () => clearTimeout(timer);
  });
</script>

<div class="aero-bg leaving">
  <div class="status" role="status"><span class="spinner"></span>{messages[session.leaveMode]}</div>
</div>

<style>
  .leaving {
    display: grid;
    place-items: center;
  }

  .status {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 22px;
    text-shadow: 0 1px 3px rgba(3, 40, 50, 0.7);
  }
</style>
