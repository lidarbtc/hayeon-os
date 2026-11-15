<script lang="ts">
  import { locale, t } from '../os/i18n';
  import { untrack } from 'svelte';
  import { DOCUMENTS, displayPath, staticFile } from '../os/disk';
  import { fs } from '../os/fs.svelte';
  import { usesMouse } from '../os/pointer';
  import { newNoteKey } from '../os/shell';
  import type { FileRef, Menu } from '../os/types';
  import { wm, type Win } from '../os/wm.svelte';
  import MenuBar from '../ui/MenuBar.svelte';

  let { win, source }: { win: Win; source?: FileRef } = $props();

  const UNTITLED = t('제목 없음', 'Untitled');

  // Only a file that sits in 내 문서 can be saved in place. System files and files
  // opened from the recycle bin start out unbound, so saving them asks for a new name.
  function load() {
    if (source?.kind === 'user') {
      const file = fs.get(source.id);
      if (file) return { id: file.deletedAt === null ? file.id : null, name: file.name, text: file.content };
    } else if (source?.kind === 'static') {
      const file = staticFile(source.path);
      if (file?.content !== undefined) return { id: null, name: file.name, text: file.content };
    }
    return { id: null, name: UNTITLED, text: '' };
  }

  const initial = load();
  let fileId = $state<string | null>(initial.id);
  let name = $state(initial.name);
  let saved = $state(initial.text);
  let text = $state(initial.text);
  let wrap = $state(true);
  let caret = $state({ line: 1, column: 1 });
  let area: HTMLTextAreaElement;
  /** What to do once a pending "save as" goes through. */
  let afterSave: (() => void) | undefined;

  const dirty = $derived(text !== saved);

  $effect(() => {
    const title = name + t(' - 메모장', ' - Notepad');
    untrack(() => wm.patch(win.id, { title }));
  });

  $effect(() => {
    const id = win.id;
    wm.setCloseGuard(id, () => {
      if (!dirty) return true;
      confirmDiscard('close', () => wm.close(id));
      return false;
    });
    return () => wm.setCloseGuard(id, null);
  });

  $effect(() => {
    // A blank document is for typing. On touch screens this would only pop the keyboard up.
    if (initial.name === UNTITLED && usesMouse()) area.focus();
  });

  function bind(id: string, fileName: string) {
    fileId = id;
    name = fileName;
    saved = text;
    wm.patch(win.id, { key: 'user:' + id });
  }

  function save(after?: () => void) {
    const file = fileId === null ? undefined : fs.get(fileId);
    if (file && file.deletedAt === null) {
      fs.write(file.id, text);
      saved = text;
      after?.();
    } else {
      saveAs(after);
    }
  }

  function saveAs(after?: () => void) {
    afterSave = after;
    const dialogId = wm.dialog({
      key: 'save-as:' + win.id,
      owner: win.id,
      title: t('다른 이름으로 저장', 'Save As'),
      icon: 'notepad',
      message: t('저장 위치: ', 'Save in: ') + displayPath(DOCUMENTS),
      input: { label: t('파일 이름:', 'File name:'), value: name === UNTITLED ? UNTITLED + '.txt' : name },
      buttons: [
        { label: t('저장', 'Save'), primary: true, action: (value) => commit(value, dialogId) },
        { label: t('취소', 'Cancel') }
      ]
    });
  }

  function commit(value: string, dialogId: number): void | false {
    let fileName = value.trim();
    if (fileName === '') return false;
    if (/[\\/:*?"<>|]/.test(fileName)) {
      wm.dialog({
        key: 'bad-name:' + win.id,
        owner: win.id,
        title: t('다른 이름으로 저장', 'Save As'),
        kind: 'error',
        message: t('파일 이름에는 다음 문자를 쓸 수 없습니다.', 'A file name can’t contain any of these characters:') +
          '\n\\ / : * ? " < > |'
      });
      return false;
    }
    if (!fileName.toLowerCase().endsWith('.txt')) fileName += '.txt';

    const existing = fs.byName(fileName);
    if (existing && existing.id !== fileId) {
      wm.dialog({
        key: 'overwrite:' + win.id,
        owner: win.id,
        title: t('다른 이름으로 저장', 'Save As'),
        kind: 'question',
        message: existing.name + t('은(는) 이미 있습니다.\n바꾸시겠습니까?', ' already exists.\nDo you want to replace it?'),
        buttons: [
          {
            label: t('예', 'Yes'),
            action: () => {
              fs.write(existing.id, text);
              bind(existing.id, existing.name);
              wm.close(dialogId);
              finishSave();
            }
          },
          { label: t('아니요', 'No'), primary: true }
        ]
      });
      return false;
    }

    if (existing) {
      fs.write(existing.id, text);
      bind(existing.id, existing.name);
    } else {
      const file = fs.create(fileName, text);
      bind(file.id, file.name);
    }
    finishSave();
  }

  function finishSave() {
    const after = afterSave;
    afterSave = undefined;
    after?.();
  }

  /** Run then() right away when nothing would be lost, otherwise ask what to do with the changes first. */
  function confirmDiscard(reason: string, then: () => void) {
    if (!dirty) {
      then();
      return;
    }
    wm.dialog({
      key: 'discard-' + reason + ':' + win.id,
      owner: win.id,
      title: t('메모장', 'Notepad'),
      kind: 'question',
      message: t('변경 내용을 ' + name + '에 저장하시겠습니까?', 'Do you want to save changes to ' + name + '?'),
      buttons: [
        { label: t('저장', 'Save'), primary: true, action: () => save(then) },
        { label: t('저장 안 함', 'Don’t Save'), action: then },
        { label: t('취소', 'Cancel') }
      ]
    });
  }

  function newDocument() {
    confirmDiscard('new', () => {
      fileId = null;
      name = UNTITLED;
      text = '';
      saved = '';
      caret = { line: 1, column: 1 };
      wm.patch(win.id, { key: newNoteKey() });
      area.focus();
    });
  }

  function updateCaret() {
    const before = area.value.slice(0, area.selectionStart);
    caret = { line: before.split('\n').length, column: before.length - before.lastIndexOf('\n') };
  }

  const stampFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' });

  function insertTime() {
    area.focus();
    area.setRangeText(stampFormat.format(new Date()), area.selectionStart, area.selectionEnd, 'end');
    text = area.value;
    updateCaret();
  }

  function selectAll() {
    area.focus();
    area.select();
  }

  function keydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (event.shiftKey) saveAs();
      else save();
    }
  }

  const menus = $derived<Menu[]>([
    {
      label: t('파일', 'File'),
      items: [
        { label: t('새로 만들기', 'New'), action: newDocument },
        { label: t('저장', 'Save'), shortcut: 'Ctrl+S', action: () => save() },
        { label: t('다른 이름으로 저장...', 'Save As...'), shortcut: 'Ctrl+Shift+S', action: () => saveAs() },
        { separator: true },
        { label: t('끝내기', 'Exit'), action: () => wm.requestClose(win.id) }
      ]
    },
    {
      label: t('편집', 'Edit'),
      items: [
        { label: t('모두 선택', 'Select All'), action: selectAll },
        { label: t('시간/날짜', 'Time/Date'), action: insertTime }
      ]
    },
    {
      label: t('서식', 'Format'),
      items: [{ label: t('자동 줄 바꿈', 'Word Wrap'), checked: wrap, action: () => (wrap = !wrap) }]
    },
    {
      label: t('도움말', 'Help'),
      items: [
        {
          label: t('메모장 정보', 'About Notepad'),
          action: () => {
            wm.dialog({
              key: 'about:' + win.id,
              owner: win.id,
              title: t('메모장 정보', 'About Notepad'),
              kind: 'info',
              message: t(
                '메모장\nHaYeon OS S19 (Build 20070801)\n\n쓴 글은 지금 쓰는 기기에만 저장됩니다.',
                'Notepad\nHaYeon OS S19 (Build 20070801)\n\nWhat you write is saved only on this device.'
              )
            });
          }
        }
      ]
    }
  ]);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="notepad" onkeydown={keydown}>
  <MenuBar {menus} />
  <textarea
    bind:this={area}
    bind:value={text}
    class:nowrap={!wrap}
    wrap={wrap ? 'soft' : 'off'}
    spellcheck="false"
    aria-label={t('문서 내용', 'Document')}
    oninput={updateCaret}
    onkeyup={updateCaret}
    onclick={updateCaret}
    onselect={updateCaret}
  ></textarea>
  <div class="statusbar">
    <span>{dirty ? t('수정됨', 'Modified') : ''}</span>
    <span>{t('줄', 'Ln')} {caret.line}, {t('열', 'Col')} {caret.column}</span>
  </div>
</div>

<style>
  .notepad {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  textarea {
    flex: 1;
    min-height: 0;
    width: 100%;
    padding: 6px 8px;
    border: 0;
    outline: none;
    resize: none;
    background: #fff;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: keep-all;
    overflow-wrap: anywhere;
    overflow: auto;
  }

  textarea.nowrap {
    white-space: pre;
    overflow-wrap: normal;
  }

  @media (max-width: 639px) {
    /* Anything smaller makes iOS zoom the page in when the field gets focus. */
    textarea {
      font-size: 16px;
    }
  }
</style>
