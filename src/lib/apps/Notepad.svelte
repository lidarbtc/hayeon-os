<script lang="ts">
  import { untrack } from 'svelte';
  import { DOCUMENTS, displayPath, staticFile } from '../os/disk';
  import { fs } from '../os/fs.svelte';
  import { usesMouse } from '../os/pointer';
  import { newNoteKey } from '../os/shell';
  import type { FileRef, Menu } from '../os/types';
  import { wm, type Win } from '../os/wm.svelte';
  import MenuBar from '../ui/MenuBar.svelte';

  let { win, source }: { win: Win; source?: FileRef } = $props();

  const UNTITLED = '제목 없음';

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
    const title = name + ' - 메모장';
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
      title: '다른 이름으로 저장',
      icon: 'notepad',
      message: '저장 위치: ' + displayPath(DOCUMENTS),
      input: { label: '파일 이름:', value: name === UNTITLED ? UNTITLED + '.txt' : name },
      buttons: [
        { label: '저장', primary: true, action: (value) => commit(value, dialogId) },
        { label: '취소' }
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
        title: '다른 이름으로 저장',
        kind: 'error',
        message: '파일 이름에는 다음 문자를 쓸 수 없습니다.\n\\ / : * ? " < > |'
      });
      return false;
    }
    if (!fileName.toLowerCase().endsWith('.txt')) fileName += '.txt';

    const existing = fs.byName(fileName);
    if (existing && existing.id !== fileId) {
      wm.dialog({
        key: 'overwrite:' + win.id,
        owner: win.id,
        title: '다른 이름으로 저장',
        kind: 'question',
        message: existing.name + '은(는) 이미 있습니다.\n바꾸시겠습니까?',
        buttons: [
          {
            label: '예',
            action: () => {
              fs.write(existing.id, text);
              bind(existing.id, existing.name);
              wm.close(dialogId);
              finishSave();
            }
          },
          { label: '아니요', primary: true }
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
      title: '메모장',
      kind: 'question',
      message: '변경 내용을 ' + name + '에 저장하시겠습니까?',
      buttons: [
        { label: '저장', primary: true, action: () => save(then) },
        { label: '저장 안 함', action: then },
        { label: '취소' }
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

  const stampFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' });

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
      label: '파일',
      items: [
        { label: '새로 만들기', action: newDocument },
        { label: '저장', shortcut: 'Ctrl+S', action: () => save() },
        { label: '다른 이름으로 저장...', shortcut: 'Ctrl+Shift+S', action: () => saveAs() },
        { separator: true },
        { label: '끝내기', action: () => wm.requestClose(win.id) }
      ]
    },
    {
      label: '편집',
      items: [
        { label: '모두 선택', action: selectAll },
        { label: '시간/날짜', action: insertTime }
      ]
    },
    {
      label: '서식',
      items: [{ label: '자동 줄 바꿈', checked: wrap, action: () => (wrap = !wrap) }]
    },
    {
      label: '도움말',
      items: [
        {
          label: '메모장 정보',
          action: () => {
            wm.dialog({
              key: 'about:' + win.id,
              owner: win.id,
              title: '메모장 정보',
              kind: 'info',
              message: '메모장\nHaYeon OS S19 (Build 20070801)\n\n저장한 글은 이 브라우저 안에만 남습니다.'
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
    aria-label="문서 내용"
    oninput={updateCaret}
    onkeyup={updateCaret}
    onclick={updateCaret}
    onselect={updateCaret}
  ></textarea>
  <div class="statusbar">
    <span>{dirty ? '수정됨' : ''}</span>
    <span>줄 {caret.line}, 열 {caret.column}</span>
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
