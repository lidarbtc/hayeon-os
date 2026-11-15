<script lang="ts">
  import { t } from '../os/i18n';
  import { fade } from 'svelte/transition';
  import { update } from '../os/offline.svelte';

  let open = $state(true);
</script>

{#if update.ready}
  <div class="update">
    <button class="tray" aria-label={t('업데이트 준비됨', 'Update ready')} title={t('업데이트 준비됨', 'Update ready')} aria-expanded={open} onclick={() => (open = !open)}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="#52d9bb" stroke="#fff" stroke-width="1.2" />
        <path d="M8 11.5v-6M5.2 8 8 5.2 10.8 8" fill="none" stroke="#04222a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    {#if open}
      <div class="balloon" role="status" transition:fade={{ duration: 180 }}>
        <strong>{t('HaYeon OS 업데이트 준비 완료', 'HaYeon OS update ready')}</strong>
        <p>{t('다시 시작하면 새 버전으로 열려요.', 'Restart to open the new version.')}</p>
        <div class="row">
          <button class="btn primary" onclick={() => location.reload()}>{t('지금 다시 시작', 'Restart now')}</button>
          <button class="btn" onclick={() => (open = false)}>{t('나중에', 'Later')}</button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .update {
    position: relative;
    flex: none;
    display: flex;
    align-items: center;
  }

  .tray {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: none;
  }

  .tray:hover,
  .tray:focus-visible {
    outline: none;
    background: rgba(255, 255, 255, 0.25);
  }

  .balloon {
    position: absolute;
    right: -6px;
    bottom: calc(100% + 12px);
    width: 236px;
    padding: 10px 12px 12px;
    border: 1px solid #5b5b3a;
    border-radius: 7px;
    color: #1c1c10;
    background: #ffffe1;
    box-shadow: 2px 3px 8px rgba(0, 20, 28, 0.45);
  }

  /* The little tail that points at the tray icon. */
  .balloon::after {
    content: '';
    position: absolute;
    right: 12px;
    bottom: -7px;
    width: 12px;
    height: 12px;
    border-right: 1px solid #5b5b3a;
    border-bottom: 1px solid #5b5b3a;
    background: #ffffe1;
    transform: rotate(45deg);
  }

  .balloon p {
    margin: 4px 0 10px;
  }

  .row {
    display: flex;
    gap: 6px;
  }
</style>
