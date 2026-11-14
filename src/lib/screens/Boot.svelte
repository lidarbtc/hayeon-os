<script lang="ts">
  import Orb from '../ui/Orb.svelte';
  import { session } from '../os/session.svelte';

  $effect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => session.finishBoot(), reduce ? 1400 : 3600);
    return () => clearTimeout(timer);
  });
</script>

<svelte:window onkeydown={() => session.finishBoot()} />

<!-- Clicking anywhere skips the boot animation; the key handler above covers keyboards. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="boot" onclick={() => session.finishBoot()}>
  <div class="logo">
    <Orb size={104} />
    <div class="wordmark">HaYeon<span class="os">OS</span><sup>S19</sup></div>
  </div>
  <div class="progress" role="progressbar" aria-label="HaYeon OS를 시작하는 중">
    <div class="blocks"><i></i><i></i><i></i></div>
  </div>
  <footer>
    <span>Build 20070801</span>
    <span>hayeon.eth</span>
  </footer>
</div>

<style>
  .boot {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 44px;
    background: #000;
    color: #fff;
  }

  .logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    animation: rise 0.9s ease-out both;
  }

  .logo :global(svg) {
    filter: drop-shadow(0 0 22px rgba(82, 217, 187, 0.55));
  }

  .wordmark {
    font-size: 40px;
    font-weight: 600;
    letter-spacing: -0.5px;
    line-height: 1;
  }

  .os {
    margin-left: 8px;
    font-weight: 300;
  }

  sup {
    margin-left: 4px;
    font-size: 17px;
    font-weight: 700;
    font-style: italic;
    color: var(--hy-turquoise);
    vertical-align: top;
  }

  .progress {
    width: 190px;
    height: 15px;
    padding: 2px;
    border: 1px solid #8a9aa0;
    border-radius: 5px;
    overflow: hidden;
  }

  .blocks {
    display: flex;
    gap: 3px;
    width: 39px;
    height: 100%;
    animation: slide 1.9s linear infinite;
  }

  .blocks i {
    flex: 1;
    border-radius: 1px;
    background: linear-gradient(180deg, #c9fff2, #52d9bb 45%, #0f8fa8);
  }

  footer {
    position: absolute;
    left: 28px;
    right: 28px;
    bottom: 22px;
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #9fb0b5;
  }

  @keyframes slide {
    from {
      transform: translateX(-45px);
    }
    to {
      transform: translateX(190px);
    }
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (max-width: 480px) {
    .wordmark {
      font-size: 32px;
    }
  }
</style>
