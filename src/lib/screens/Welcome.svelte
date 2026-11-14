<script lang="ts">
  import Icon from '../ui/Icon.svelte';
  import Orb from '../ui/Orb.svelte';
  import { session } from '../os/session.svelte';

  let entering = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function enter() {
    if (entering) return;
    entering = true;
    timer = setTimeout(() => session.login(), 1300);
  }

  $effect(() => () => clearTimeout(timer));
</script>

<div class="aero-bg welcome">
  <main>
    {#if entering}
      <div class="entering" role="status"><span class="spinner"></span>환영합니다</div>
    {:else}
      <button class="user" onclick={enter}>
        <span class="avatar"><Icon name="hedgehog" size={96} /></span>
        <span class="name">hayeon.eth</span>
        <span class="hint">눌러서 시작하기</span>
      </button>
    {/if}
  </main>
  <footer>
    <button class="power" aria-label="시스템 종료" title="시스템 종료" onclick={() => session.leave('shutdown')}>
      <Icon name="power" size={18} />
    </button>
    <div class="brand"><Orb size={30} /><span>HaYeon OS <b>S19</b></span></div>
    <span class="spacer"></span>
  </footer>
</div>

<style>
  .welcome {
    display: flex;
    flex-direction: column;
  }

  main {
    position: relative;
    z-index: 1;
    flex: 1;
    display: grid;
    place-items: center;
  }

  .user {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 18px 28px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: none;
    color: #fff;
    text-shadow: 0 1px 3px rgba(3, 40, 50, 0.7);
  }

  .user:hover,
  .user:focus-visible {
    outline: none;
    border-color: rgba(255, 255, 255, 0.55);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.08));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  }

  .avatar {
    display: grid;
    place-items: center;
    width: 118px;
    height: 118px;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.15) 46%, rgba(255, 255, 255, 0) 50%),
      linear-gradient(160deg, #d6fff5, #6fe0c8 60%, #25b6b6);
    box-shadow:
      0 0 0 1px rgba(4, 60, 70, 0.65),
      0 0 0 5px rgba(255, 255, 255, 0.6),
      0 0 0 6px rgba(4, 60, 70, 0.45),
      0 10px 28px rgba(0, 40, 50, 0.5);
  }

  .name {
    margin-top: 8px;
    font-size: 22px;
  }

  .hint {
    font-size: 12px;
    opacity: 0.85;
  }

  .entering {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 22px;
    text-shadow: 0 1px 3px rgba(3, 40, 50, 0.7);
  }

  footer {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 22px 20px;
  }

  .power,
  .spacer {
    width: 36px;
    height: 30px;
  }

  .power {
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid rgba(90, 20, 10, 0.8);
    border-radius: 4px;
    color: #fff;
    background: linear-gradient(180deg, #f3a59a, #d9553f 46%, #c22f17 50%, #e0704f);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  }

  .power:hover,
  .power:focus-visible {
    filter: brightness(1.15);
    outline: none;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
    text-shadow: 0 1px 3px rgba(3, 40, 50, 0.6);
  }

  .brand b {
    font-style: italic;
    color: var(--hy-mint);
  }
</style>
