<script lang="ts">
  import { itemCount, t } from '../os/i18n';
  import { untrack } from 'svelte';
  import {
    BUILD_TIME,
    DOCUMENTS,
    displayPath,
    drives,
    driveTitle,
    folderTitle,
    parentOf,
    staticFolder,
    type Drive
  } from '../os/disk';
  import { fileSize, formatDate, fs } from '../os/fs.svelte';
  import { opensFromList, usesMouse } from '../os/pointer';
  import { openTextFile } from '../os/shell';
  import type { IconName, ListColumn, ListRow } from '../os/types';
  import { wm, type Win } from '../os/wm.svelte';
  import FileList from '../ui/FileList.svelte';
  import Icon from '../ui/Icon.svelte';

  let { win, path = '' }: { win: Win; path?: string } = $props();

  let current = $state(untrack(() => path));
  let trail = $state<string[]>([]);
  let selected = $state<string | null>(null);

  const columns: ListColumn[] = [
    { label: t('이름', 'Name'), width: 'minmax(120px, 1fr)' },
    { label: t('수정한 날짜', 'Date Modified'), width: '150px', optional: true },
    { label: t('유형', 'Type'), width: '120px', optional: true },
    { label: t('크기', 'Size'), width: '72px', align: 'end' }
  ];

  const types: Record<string, string> = {
    txt: t('텍스트 문서', 'Text Document'),
    ini: t('구성 설정', 'Configuration Settings'),
    dll: t('응용 프로그램 확장', 'Application Extension'),
    sys: t('시스템 파일', 'System File')
  };

  function typeOf(name: string) {
    return types[name.slice(name.lastIndexOf('.') + 1).toLowerCase()] ?? t('파일', 'File');
  }

  interface Entry extends ListRow {
    open: () => void;
    /** Set for files the visitor saved; only those can be deleted. */
    fileId?: string;
  }

  const built = formatDate(BUILD_TIME);

  const entries = $derived.by(() => {
    const here = current;
    const folder = staticFolder(here);
    const list: Entry[] = [];
    if (!folder) return list;
    for (const name of folder.folders) {
      list.push({
        key: 'dir:' + name,
        icon: 'folder',
        cells: [name, built, t('파일 폴더', 'File Folder'), ''],
        open: () => go(here + '/' + name)
      });
    }
    for (const file of folder.files) {
      const text = file.content !== undefined;
      list.push({
        key: 'file:' + file.name,
        icon: text ? 'text' : 'sysfile',
        cells: [file.name, built, typeOf(file.name), file.size],
        open: () => (text ? openTextFile({ kind: 'static', path: here + '/' + file.name }) : inUse(file.name))
      });
    }
    if (here === DOCUMENTS) {
      for (const file of fs.documents) {
        list.push({
          key: 'user:' + file.id,
          icon: 'text',
          cells: [file.name, formatDate(file.modified), typeOf(file.name), fileSize(file.content)],
          open: () => openTextFile({ kind: 'user', id: file.id }),
          fileId: file.id
        });
      }
    }
    return list;
  });

  const disks = drives.filter((drive) => drive.type === 'disk');
  const removable = drives.filter((drive) => drive.type !== 'disk');

  const rootDrive = $derived(drives.find((drive) => drive.letter + ':' === current));
  const icon = $derived<IconName>(current === '' ? 'computer' : rootDrive ? rootDrive.type : 'folder');
  const address = $derived(current === '' ? t('내 컴퓨터', 'My Computer') : displayPath(current) + (rootDrive ? '\\' : ''));
  const selectedFile = $derived(entries.find((entry) => entry.key === selected)?.fileId);
  const count = $derived(current === '' ? drives.length : entries.length);

  // The window is found again by the folder it shows, and is named after it.
  $effect(() => {
    const changes = { key: current, title: folderTitle(current), icon };
    untrack(() => wm.patch(win.id, changes));
  });

  function go(to: string) {
    trail.push(current);
    current = to;
    selected = null;
  }

  function back() {
    const previous = trail.pop();
    if (previous === undefined) return;
    current = previous;
    selected = null;
  }

  function up() {
    if (current !== '') go(parentOf(current));
  }

  function openDrive(drive: Drive) {
    if (drive.type === 'disk') {
      go(drive.letter + ':');
      return;
    }
    wm.dialog({
      key: 'no-disk:' + drive.letter + ':' + win.id,
      owner: win.id,
      title: t('내 컴퓨터', 'My Computer'),
      kind: 'error',
      message: drive.letter +
        t(
          ':\\에 액세스할 수 없습니다.\n\n드라이브에 디스크를 넣고 다시 시도하십시오.',
          ':\\ is not accessible.\n\nPlease insert a disk into the drive and try again.'
        )
    });
  }

  function inUse(name: string) {
    wm.dialog({
      key: 'in-use:' + name + ':' + win.id,
      owner: win.id,
      title: name,
      kind: 'error',
      message: name + t('은(는) HaYeon OS가 사용 중이라 열 수 없습니다.', ' is in use by HaYeon OS and can’t be opened.')
    });
  }

  function clickDrive(event: MouseEvent, drive: Drive) {
    const again = selected === drive.letter;
    selected = drive.letter;
    if (opensFromList(event, again)) openDrive(drive);
  }

  function pressBlank(event: PointerEvent) {
    if (!(event.target as HTMLElement).closest('.tile')) selected = null;
  }

  function openEntry(key: string) {
    entries.find((entry) => entry.key === key)?.open();
  }

  function removeEntry(key: string) {
    const id = entries.find((entry) => entry.key === key)?.fileId;
    if (id === undefined) return;
    fs.remove(id);
    selected = null;
  }

  function newFile() {
    const file = fs.create(fs.uniqueName(t('새 텍스트 문서.txt', 'New Text Document.txt')), '');
    selected = 'user:' + file.id;
  }
</script>

{#snippet tile(drive: Drive)}
  <button
    class="tile"
    class:selected={selected === drive.letter}
    onclick={(event) => clickDrive(event, drive)}
    ondblclick={() => {
      if (usesMouse()) openDrive(drive);
    }}
  >
    <Icon name={drive.type} size={40} />
    <span class="info">
      <span class="name">{driveTitle(drive)}</span>
      {#if drive.type === 'disk'}
        <span class="bar"><i style="width: {drive.usedPercent}%"></i></span>
        <span class="detail">{t(drive.total + 'GB 중 ' + drive.free + 'GB 사용 가능', drive.free + ' GB free of ' + drive.total + ' GB')}</span>
      {:else}
        <span class="detail">{drive.type === 'cd' ? t('CD 드라이브', 'CD Drive') : t('3.5 플로피 디스크', '3½ Floppy Disk')}</span>
      {/if}
    </span>
  </button>
{/snippet}

<div class="explorer">
  <div class="toolbar">
    <button class="tool" aria-label={t('뒤로', 'Back')} title={t('뒤로', 'Back')} disabled={trail.length === 0} onclick={back}>
      <Icon name="back" size={16} />
    </button>
    <button class="tool" aria-label={t('위로', 'Up')} title={t('위로', 'Up')} disabled={current === ''} onclick={up}>
      <Icon name="up" size={16} />
    </button>
    <div class="address">
      <Icon name={icon} size={16} />
      <span>{address}</span>
    </div>
  </div>

  {#if current === DOCUMENTS}
    <div class="toolbar">
      <button class="tool" onclick={newFile}>{t('새 텍스트 문서', 'New Text Document')}</button>
      <button class="tool" disabled={selectedFile === undefined} onclick={() => selected && removeEntry(selected)}>
        {t('삭제', 'Delete')}
      </button>
    </div>
  {/if}

  {#if current === ''}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="drives" onpointerdown={pressBlank}>
      <h3>{t('하드 디스크 드라이브', 'Hard Disk Drives')} ({disks.length})</h3>
      <div class="tiles">
        {#each disks as drive (drive.letter)}
          {@render tile(drive)}
        {/each}
      </div>
      <h3>{t('이동식 저장소가 있는 장치', 'Devices with Removable Storage')} ({removable.length})</h3>
      <div class="tiles">
        {#each removable as drive (drive.letter)}
          {@render tile(drive)}
        {/each}
      </div>
    </div>
  {:else}
    <FileList
      {columns}
      rows={entries}
      bind:selected
      empty={t('이 폴더는 비어 있습니다.', 'This folder is empty.')}
      onopen={openEntry}
      ondelete={removeEntry}
    />
  {/if}

  <div class="statusbar"><span>{itemCount(count)}</span></div>
</div>

<style>
  .explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .address {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    margin-left: 2px;
    padding: 0 7px;
    border: 1px solid #a9bcbf;
    border-radius: 2px;
    background: #fff;
  }

  .address span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .drives {
    flex: 1;
    min-height: 0;
    padding: 4px 14px 14px;
    overflow-y: auto;
    background: #fff;
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 0 8px;
    font-size: 13px;
    font-weight: 400;
    color: #0b6f7d;
  }

  h3::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, #b9dcd8, rgba(185, 220, 216, 0));
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 4px 10px;
  }

  .tile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: none;
    text-align: left;
  }

  .tile:hover,
  .tile:focus-visible {
    outline: none;
    border-color: #b8e8dd;
    background: linear-gradient(180deg, #f7fffd, #e3f9f3);
  }

  .tile.selected {
    border-color: #7fd6c4;
    background: linear-gradient(180deg, #e9fff9, #c2f3e7);
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bar {
    height: 13px;
    padding: 1px;
    border: 1px solid #9fb3b6;
    background: #eef3f3;
  }

  .bar i {
    display: block;
    height: 100%;
    background: linear-gradient(180deg, #a5f5e3, #52d9bb 45%, #19a9a3);
  }

  .detail {
    font-size: 12px;
    color: #5c7f88;
  }
</style>
