<script lang="ts">
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
    { label: '이름', width: 'minmax(120px, 1fr)' },
    { label: '원래 위치', width: '110px', optional: true },
    { label: '삭제한 날짜', width: '150px', optional: true },
    { label: '크기', width: '72px', align: 'end' }
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
      title: '휴지통 비우기',
      kind: 'question',
      message: '항목 ' + rows.length + '개를 완전히 삭제하시겠습니까?\n비운 뒤에는 되돌릴 수 없습니다.',
      buttons: [
        { label: '예', action: () => fs.emptyTrash() },
        { label: '아니요', primary: true }
      ]
    });
  }
</script>

<div class="bin">
  <div class="toolbar">
    <button class="tool" disabled={rows.length === 0} onclick={empty}>휴지통 비우기</button>
    <button class="tool" disabled={rows.length === 0} onclick={restore}>
      {picked ? '이 항목 복원' : '모든 항목 복원'}
    </button>
  </div>
  <FileList
    {columns}
    {rows}
    bind:selected
    empty="휴지통이 비어 있습니다."
    onopen={(key) => openTextFile({ kind: 'user', id: key })}
  />
  <div class="statusbar"><span>{rows.length}개 항목</span></div>
</div>

<style>
  .bin {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
</style>
