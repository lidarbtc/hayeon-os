<script lang="ts">
  import { t } from '../os/i18n';
  import { session, type LeaveMode } from '../os/session.svelte';
  import { shortcuts, type Shortcut } from '../os/shell';
  import Avatar from '../ui/Avatar.svelte';
  import Icon from '../ui/Icon.svelte';

  const programs: Shortcut[] = [
    shortcuts.photos,
    shortcuts.profile,
    shortcuts.guestbook,
    shortcuts.notepad,
    shortcuts.hedgehog,
    shortcuts.player,
    shortcuts.terminal,
    shortcuts.bin,
    shortcuts.readme
  ];
  const places: Shortcut[] = [shortcuts.documents, shortcuts.computer, shortcuts.control, shortcuts.system];

  let menu: HTMLElement;

  function launch(shortcut: Shortcut) {
    session.startOpen = false;
    shortcut.open();
  }

  function leave(mode: LeaveMode) {
    session.leave(mode);
  }

  function closeOnOutside(event: PointerEvent) {
    const target = event.target as HTMLElement;
    if (menu.contains(target) || target.closest('[data-start-button]')) return;
    session.startOpen = false;
  }

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') session.startOpen = false;
  }
</script>

<svelte:window onpointerdown={closeOnOutside} onkeydown={closeOnEscape} />

<div class="start-menu" bind:this={menu} role="menu" aria-label={t('시작 메뉴', 'Start menu')}>
  <div class="programs">
    {#each programs as program (program.id)}
      <button role="menuitem" onclick={() => launch(program)}>
        <Icon name={program.icon} size={32} />
        <span>{program.label}</span>
      </button>
    {/each}
  </div>

  <div class="side">
    <div class="avatar"><Avatar size={60} /></div>
    <div class="who">
      <strong>hayeon.eth</strong>
      <span>{t('S19 · 정하연', 'S19 · Jeong HaYeon')}</span>
    </div>
    <hr />
    {#each places as place (place.id)}
      <button role="menuitem" onclick={() => launch(place)}>{place.label}</button>
    {/each}
  </div>

  <div class="power">
    <button role="menuitem" onclick={() => leave('logoff')}><Icon name="logoff" size={15} />{t('로그오프', 'Log Off')}</button>
    <button role="menuitem" onclick={() => leave('restart')}><Icon name="restart" size={15} />{t('다시 시작', 'Restart')}</button>
    <button role="menuitem" class="shutdown" onclick={() => leave('shutdown')}>
      <Icon name="power" size={15} />{t('종료', 'Shut Down')}
    </button>
  </div>
</div>

<style>
  .start-menu {
    position: absolute;
    left: 0;
    bottom: var(--taskbar-h);
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 148px;
    /* The list row gives way first, so the power buttons stay on screen when the screen is short. */
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 7px;
    width: min(420px, calc(100% - 8px));
    max-height: calc(100% - var(--taskbar-h) - 8px);
    padding: 7px;
    border: 1px solid rgba(3, 34, 42, 0.85);
    border-bottom: 0;
    border-radius: 8px 8px 0 0;
    color: #fff;
    background:
      linear-gradient(115deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.05) 26%, rgba(255, 255, 255, 0) 40%),
      linear-gradient(180deg, rgba(40, 150, 165, 0.72), rgba(5, 62, 80, 0.82));
    -webkit-backdrop-filter: blur(14px) saturate(1.3);
    backdrop-filter: blur(14px) saturate(1.3);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.45),
      0 -4px 26px rgba(3, 40, 50, 0.4);
    animation: pop 0.14s ease-out;
  }

  .programs {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
    padding: 6px;
    border: 1px solid rgba(3, 34, 42, 0.75);
    border-radius: 4px;
    background: #fff;
    color: var(--hy-ink);
    overflow-y: auto;
  }

  .programs button {
    display: flex;
    flex: none;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 5px 7px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: none;
    text-align: left;
  }

  .programs button:hover,
  .programs button:focus-visible {
    outline: none;
    border-color: #7fd6c4;
    background: linear-gradient(180deg, #f3fffb, #c9f5ea);
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
    padding: 4px 0;
    overflow-y: auto;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }

  .avatar {
    flex: none;
    align-self: center;
    display: grid;
    place-items: center;
    width: 60px;
    height: 60px;
    border-radius: 7px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.15) 46%, rgba(255, 255, 255, 0) 50%),
      linear-gradient(160deg, #d6fff5, #6fe0c8 60%, #25b6b6);
    box-shadow:
      0 0 0 1px rgba(4, 60, 70, 0.65),
      0 0 0 3px rgba(255, 255, 255, 0.6),
      0 0 0 4px rgba(4, 60, 70, 0.45);
  }

  .who {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 10px;
  }

  .who strong {
    font-size: 14px;
    font-weight: 600;
  }

  .who span {
    font-size: 12px;
    opacity: 0.85;
  }

  hr {
    width: 100%;
    margin: 6px 0;
    border: 0;
    border-top: 1px solid rgba(3, 34, 42, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  }

  .side button {
    padding: 6px 9px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: none;
    text-align: left;
    text-shadow: inherit;
  }

  .side button:hover,
  .side button:focus-visible,
  .power button:hover,
  .power button:focus-visible {
    outline: none;
    border-color: rgba(255, 255, 255, 0.6);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.14) 50%, rgba(255, 255, 255, 0.04) 50%, rgba(255, 255, 255, 0.2));
  }

  .power {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
  }

  .power button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px 4px 8px;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 3px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.07) 50%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1));
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }

  .power .shutdown {
    border-color: rgba(90, 20, 10, 0.8);
    background: linear-gradient(180deg, #f3a59a, #d9553f 46%, #c22f17 50%, #e0704f);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  }

  .power .shutdown:hover,
  .power .shutdown:focus-visible {
    border-color: rgba(90, 20, 10, 0.8);
    background: linear-gradient(180deg, #ffc0b3, #f0624a 46%, #dc3418 50%, #ff9a70);
  }

  :global([data-theme='luna']) .start-menu {
    background: linear-gradient(180deg, #1fb0b8, #0b7f93);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (max-width: 400px) {
    .start-menu {
      grid-template-columns: minmax(0, 1fr) 120px;
    }
  }
</style>
