<script lang="ts">
  import { session } from '../os/session.svelte';
  import { wm } from '../os/wm.svelte';
  import Icon from '../ui/Icon.svelte';
  import Orb from '../ui/Orb.svelte';
  import Clock from './Clock.svelte';

  // Message boxes belong to whoever opened them and get no button of their own.
  const tasks = $derived(wm.windows.filter((win) => !win.dialog));
</script>

<div class="taskbar">
  <button
    class="start"
    class:open={session.startOpen}
    data-start-button
    aria-label="시작"
    aria-expanded={session.startOpen}
    title="시작"
    onclick={() => (session.startOpen = !session.startOpen)}
  >
    <Orb size={36} />
  </button>

  <div class="tasks">
    {#each tasks as win (win.id)}
      <button
        class="task"
        class:active={wm.activeId === win.id}
        title={win.title}
        onclick={() => wm.toggleFromTaskbar(win.id)}
      >
        <Icon name={win.icon} size={22} />
        <span>{win.title}</span>
      </button>
    {/each}
  </div>

  <Clock />
  <button class="peek" aria-label="바탕 화면 보기" title="바탕 화면 보기" onclick={() => wm.toggleDesktop()}></button>
</div>

<style>
  .taskbar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
    display: flex;
    align-items: stretch;
    gap: 6px;
    height: var(--taskbar-h);
    padding-left: 6px;
    border-top: 1px solid rgba(3, 34, 42, 0.85);
    background: linear-gradient(
      180deg,
      rgba(190, 255, 240, 0.5) 0%,
      rgba(60, 170, 180, 0.42) 7%,
      rgba(8, 70, 88, 0.66) 50%,
      rgba(4, 44, 58, 0.76) 100%
    );
    -webkit-backdrop-filter: blur(12px) saturate(1.3);
    backdrop-filter: blur(12px) saturate(1.3);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
  }

  .start {
    flex: none;
    align-self: center;
    display: grid;
    place-items: center;
    width: 40px;
    height: 38px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    transition: filter 0.15s;
  }

  .start:hover,
  .start:focus-visible,
  .start.open {
    outline: none;
    filter: brightness(1.15) drop-shadow(0 0 7px rgba(201, 255, 242, 0.95));
  }

  .tasks {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .task {
    flex: 0 1 172px;
    min-width: 40px;
    display: flex;
    align-items: center;
    gap: 7px;
    height: 33px;
    padding: 0 8px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 3px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.07) 50%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  }

  .task span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task:hover,
  .task:focus-visible {
    outline: none;
    border-color: rgba(255, 255, 255, 0.6);
    background:
      radial-gradient(70% 90% at 50% 100%, rgba(120, 255, 225, 0.5), rgba(120, 255, 225, 0) 70%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.03) 50%, rgba(255, 255, 255, 0.16));
  }

  .task.active {
    border-color: rgba(255, 255, 255, 0.75);
    background:
      radial-gradient(80% 100% at 50% 100%, rgba(150, 255, 232, 0.7), rgba(150, 255, 232, 0) 72%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.24));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  }

  .peek {
    flex: none;
    width: 14px;
    padding: 0;
    border: 0;
    border-left: 1px solid rgba(3, 34, 42, 0.8);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.06));
    box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.3);
  }

  .peek:hover,
  .peek:focus-visible {
    outline: none;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0.25));
  }

  @media (max-width: 639px) {
    .task {
      flex: 0 1 44px;
      justify-content: center;
    }

    .task span {
      display: none;
    }
  }
</style>
