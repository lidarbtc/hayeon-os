<script lang="ts">
  import { t } from '../os/i18n';
  import { REPO_URL, TRIPLES_URL, outbound } from '../os/about';
  import { wm, type Win } from '../os/wm.svelte';
  import Icon from '../ui/Icon.svelte';
  import Orb from '../ui/Orb.svelte';

  let { win }: { win: Win } = $props();

  const tabs = [t('일반', 'General'), t('컴퓨터 이름', 'Computer Name'), t('하드웨어', 'Hardware')];
  let tab = $state(tabs[0]);

  let width = $state(0);
  let height = $state(0);
  let uptime = $state(performance.now());
  const threads = navigator.hardwareConcurrency;

  $effect(() => {
    const timer = setInterval(() => (uptime = performance.now()), 1000);
    return () => clearInterval(timer);
  });

  function duration(ms: number) {
    const total = Math.floor(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return (hours ? hours + t('시간 ', 'h ') : '') + (hours || minutes ? minutes + t('분 ', 'm ') : '') + (total % 60) + t('초', 's');
  }
</script>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<div class="properties">
  <div class="tabs" role="tablist">
    {#each tabs as name (name)}
      <button role="tab" aria-selected={tab === name} class:current={tab === name} onclick={() => (tab = name)}>
        {name}
      </button>
    {/each}
  </div>

  <div class="panel" role="tabpanel">
    {#if tab === tabs[0]}
      <div class="banner">
        <Orb size={54} />
        <div class="wordmark">HaYeon<span>OS</span><sup>S19</sup></div>
      </div>
      <dl>
        <dt>{t('시스템', 'System')}</dt>
        <dd>HaYeon OS S19<br />Version 19.0<br />Build 20070801</dd>
        <dt>{t('등록된 사용자', 'Registered to')}</dt>
        <dd>hayeon.eth</dd>
        <dt>{t('테마 색', 'Theme color')}</dt>
        <dd><i class="swatch"></i>Medium Turquoise #52D9BB</dd>
        <dt>{t('만든 사람', 'Made by')}</dt>
        <dd class="links">
          <a href={outbound(TRIPLES_URL)} target="_blank" rel="noopener" title="triples.love" aria-label="triples.love">
            <Icon name="triples" size={22} />
          </a>
          <a href={outbound(REPO_URL)} target="_blank" rel="noopener" title="GitHub" aria-label="GitHub">
            <Icon name="github" size={20} />
          </a>
        </dd>
      </dl>
    {:else if tab === tabs[1]}
      <p class="lead">
        <Icon name="computer" size={32} />
        <span>{t('이 컴퓨터는 아래 이름으로 찾을 수 있습니다.', 'This computer goes by the name below.')}</span>
      </p>
      <dl>
        <dt>{t('컴퓨터 이름', 'Computer name')}</dt>
        <dd>hayeon.eth</dd>
        <dt>{t('작업 그룹', 'Workgroup')}</dt>
        <dd>tripleS</dd>
        <dt>{t('설명', 'Description')}</dt>
        <dd>{t('S19 정하연 팬의 컴퓨터', 'An S19 HaYeon fan’s computer')}</dd>
      </dl>
      <p class="note">{t('tripleS S19 정하연을 좋아하는 팬이 만든 비공식 작품입니다.', 'An unofficial work by a fan of tripleS S19 Jeong HaYeon.')}</p>
    {:else}
      <h3>{t('지금 빌려 쓰는 컴퓨터', 'The computer you’re borrowing')}</h3>
      <dl>
        <dt>{t('화면', 'Screen')}</dt>
        <dd>{width} × {height}</dd>
        <dt>{t('프로세서', 'Processor')}</dt>
        <dd>{threads ? t('스레드 ' + threads + '개', threads + ' threads') : t('알 수 없음', 'Unknown')}</dd>
        <dt>{t('가동 시간', 'Uptime')}</dt>
        <dd>{duration(uptime)}</dd>
      </dl>
    {/if}
  </div>

  <footer><button class="btn primary" onclick={() => wm.close(win.id)}>{t('확인', 'OK')}</button></footer>
</div>

<style>
  .properties {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 8px 8px 0;
    background: #f1f6f6;
  }

  .tabs {
    flex: none;
    display: flex;
    padding-left: 3px;
  }

  .tabs button {
    position: relative;
    top: 1px;
    margin-top: 2px;
    padding: 3px 11px 4px;
    border: 1px solid #a9bcbf;
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
    margin-right: -1px;
    background: linear-gradient(180deg, #f6f9f9, #dfe8e8);
  }

  .tabs button:hover,
  .tabs button:focus-visible {
    outline: none;
    background: linear-gradient(180deg, #f3fffb, #c9f5ea);
  }

  .tabs button.current {
    z-index: 1;
    margin-top: 0;
    padding-bottom: 6px;
    border-top: 2px solid var(--hy-turquoise);
    background: #fff;
  }

  @media (pointer: coarse) {
    .tabs button {
      padding-top: 6px;
      padding-bottom: 7px;
    }

    .tabs button.current {
      padding-bottom: 9px;
    }
  }

  .panel {
    flex: 1;
    min-height: 0;
    padding: 14px 16px;
    border: 1px solid #a9bcbf;
    background: #fff;
    overflow-y: auto;
    user-select: text;
    -webkit-user-select: text;
  }

  .banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    height: 92px;
    margin-bottom: 4px;
    border: 1px solid #0f8f86;
    border-radius: 3px;
    color: #fff;
    background:
      radial-gradient(90% 120% at 50% 130%, rgba(214, 255, 245, 0.9), rgba(214, 255, 245, 0) 62%),
      linear-gradient(115deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 38%),
      linear-gradient(180deg, #0b86a8, #2cc0c2 62%, #52d9bb);
  }

  .wordmark {
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.4px;
    line-height: 1;
    text-shadow: 0 1px 3px rgba(3, 40, 50, 0.55);
  }

  .wordmark span {
    margin-left: 6px;
    font-weight: 300;
  }

  sup {
    margin-left: 3px;
    font-size: 14px;
    font-weight: 700;
    font-style: italic;
    color: var(--hy-mint);
    vertical-align: top;
  }

  dl {
    display: grid;
    grid-template-columns: 96px 1fr;
    gap: 10px 14px;
    margin: 14px 0 0;
  }

  dt {
    color: #4a666c;
  }

  dd {
    margin: 0;
  }

  .links {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .links a {
    display: block;
    border-radius: 5px;
    color: #18171f;
  }

  .links a:hover,
  .links a:focus-visible {
    outline: 2px solid var(--hy-turquoise);
    outline-offset: 2px;
  }

  .swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-right: 7px;
    border: 1px solid #0f8f86;
    border-radius: 2px;
    background: var(--hy-turquoise);
    vertical-align: -2px;
  }

  .lead {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 4px;
  }

  h3 {
    margin: 22px 0 0;
    padding-bottom: 5px;
    border-bottom: 1px solid #d5e2e2;
    font-size: 13px;
    font-weight: 400;
    color: #0b6f7d;
  }

  .note {
    margin: 22px 0 0;
    padding-top: 12px;
    border-top: 1px solid #d5e2e2;
    font-size: 12px;
    color: #4a666c;
  }

  footer {
    flex: none;
    display: flex;
    justify-content: flex-end;
    padding: 9px 2px 10px;
  }
</style>
