<script lang="ts">
  import Orb from '../ui/Orb.svelte';

  let { close }: { close: () => void } = $props();
</script>

<div class="about">
  <div class="banner">
    <Orb size={54} />
    <div class="wordmark">HaYeon<span>OS</span><sup>S19</sup></div>
  </div>

  <div class="content">
    <p class="version">
      HaYeon OS S19<br />
      Version 19.0 (Build 20070801)
    </p>
    <dl>
      <dt>등록 사용자</dt>
      <dd>hayeon.eth</dd>
      <dt>테마 색</dt>
      <dd><i class="swatch"></i>Medium Turquoise #52D9BB</dd>
      <dt>저장 장치</dt>
      <dd>IPFS</dd>
      <dt>서버</dt>
      <dd>없음</dd>
    </dl>
    <p class="note">tripleS S19 정하연을 좋아하는 팬이 만든 비공식 작품입니다.</p>
  </div>

  <footer><button class="btn" onclick={close}>확인</button></footer>
</div>

<style>
  .about {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f1f6f6;
  }

  .banner {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    height: 96px;
    color: #fff;
    background:
      radial-gradient(90% 120% at 50% 130%, rgba(214, 255, 245, 0.9), rgba(214, 255, 245, 0) 62%),
      linear-gradient(115deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 38%),
      linear-gradient(180deg, #0b86a8, #2cc0c2 62%, #52d9bb);
    border-bottom: 1px solid #0f8f86;
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

  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 22px 8px;
    user-select: text;
    -webkit-user-select: text;
  }

  p {
    margin: 0;
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 7px 18px;
    margin: 16px 0;
    padding: 14px 0;
    border-top: 1px solid #c9d8d8;
    border-bottom: 1px solid #c9d8d8;
  }

  dt {
    color: #4a666c;
  }

  dd {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0;
  }

  .swatch {
    flex: none;
    width: 13px;
    height: 13px;
    border: 1px solid #0f8f86;
    border-radius: 2px;
    background: var(--hy-turquoise);
  }

  .note {
    font-size: 12px;
    color: #4a666c;
  }

  footer {
    flex: none;
    display: flex;
    justify-content: flex-end;
    padding: 10px 14px 12px;
  }
</style>
