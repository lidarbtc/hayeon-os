<script lang="ts">
  import { itemCount, t } from '../os/i18n';
  import { untrack } from 'svelte';
  import { DOCUMENTS, displayPath } from '../os/disk';
  import { fileSize, formatDate, fs } from '../os/fs.svelte';
  import { openTextFile } from '../os/shell';
  import type { IconName, ListColumn, ListRow } from '../os/types';
  import { wm, type Win } from '../os/wm.svelte';
  import FileList from '../ui/FileList.svelte';

  let { win }: { win: Win } = $props();

  let selected = $state<string | null>(null);

  const columns: ListColumn[] = [
    { label: t('이름', 'Name'), width: 'minmax(120px, 1fr)' },
    { label: t('원래 위치', 'Original Location'), width: '110px', optional: true },
    { label: t('삭제한 날짜', 'Date Deleted'), width: '150px', optional: true },
    { label: t('크기', 'Size'), width: '72px', align: 'end' }
  ];

  const origin = displayPath(DOCUMENTS);

  const rows = $derived(
    fs.trash.map(
      (file): ListRow => ({
        key: file.id,
        icon: 'text',
        cells: [file.name, origin, formatDate(file.deletedAt!), fileSize(file.content)]
      })
    )
  );

  /** The selection, as long as that file is still in the bin. */
  const picked = $derived(rows.some((row) => row.key === selected) ? selected : null);

  $effect(() => {
    const icon: IconName = rows.length ? 'bin-full' : 'bin';
    untrack(() => wm.patch(win.id, { icon }));
  });

  function restore() {
    if (picked) fs.restore(picked);
    else fs.restoreAll();
    selected = null;
  }

  function empty() {
    wm.dialog({
      key: 'empty:' + win.id,
      owner: win.id,
      title: t('휴지통 비우기', 'Empty Recycle Bin'),
      kind: 'question',
      message: t(
        '항목 ' + rows.length + '개를 완전히 삭제하시겠습니까?\n비운 뒤에는 되돌릴 수 없습니다.',
        'Permanently delete ' + itemCount(rows.length) + '?\nThis can’t be undone.'
      ),
      buttons: [
        { label: t('예', 'Yes'), action: () => fs.emptyTrash() },
        { label: t('아니요', 'No'), primary: true }
      ]
    });
  }
</script>

<div class="bin">
  <div class="toolbar">
    <button class="tool" disabled={rows.length === 0} onclick={empty}>{t('휴지통 비우기', 'Empty Recycle Bin')}</button>
    <button class="tool" disabled={rows.length === 0} onclick={restore}>
      {picked ? t('이 항목 복원', 'Restore This Item') : t('모든 항목 복원', 'Restore All Items')}
    </button>
  </div>
  <FileList
    {columns}
    {rows}
    bind:selected
    empty={t('휴지통이 비어 있습니다.', 'The Recycle Bin is empty.')}
    onopen={(key) => openTextFile({ kind: 'user', id: key })}
  />
  <div class="statusbar"><span>{itemCount(rows.length)}</span></div>
</div>

<style>
  .bin {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
</style>
