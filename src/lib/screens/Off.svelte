<script lang="ts">
  import Icon from '../ui/Icon.svelte';
  import { session } from '../os/session.svelte';
</script>

<div class="off">
  <p>이제 탭을 닫아도 안전합니다.</p>
  <button onclick={() => session.powerOn()}>
    <Icon name="power" size={18} />
    <span>전원 켜기</span>
  </button>
</div>

<style>
  .off {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    padding: 24px;
    background: #000;
    text-align: center;
  }

  p {
    margin: 0;
    font-size: 24px;
    color: var(--hy-turquoise);
  }

  button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 16px 7px 12px;
    border: 1px solid #2c5a62;
    border-radius: 16px;
    background: #071b20;
    color: #9fd8cc;
  }

  button:hover,
  button:focus-visible {
    outline: none;
    border-color: var(--hy-turquoise);
    color: #fff;
    box-shadow: 0 0 14px rgba(82, 217, 187, 0.45);
  }
</style>
