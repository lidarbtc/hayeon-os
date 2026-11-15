<script lang="ts">
  import { colors, guestbook, MAX_NAME, MAX_TEXT, type Note, type NoteColor } from '../os/guestbook.svelte';
  import { wm, type Win } from '../os/wm.svelte';

  let { win }: { win: Win } = $props();

  let text = $state('');
  let color = $state<NoteColor>('mint');
  let message = $state('');
  let now = $state(Date.now());

  const colorNames: Record<NoteColor, string> = { mint: '민트', lemon: '레몬', pink: '분홍', sky: '하늘', lilac: '연보라' };
  const length = $derived([...text].length);

  $effect(() => {
    guestbook.start();
    const timer = setInterval(() => (now = Date.now()), 30_000);
    return () => clearInterval(timer);
  });

  // What happened to the last note stays in the status bar for a moment.
  $effect(() => {
    if (!message) return;
    const timer = setTimeout(() => (message = ''), 5000);
    return () => clearTimeout(timer);
  });

  const status = $derived.by(() => {
    if (message) return message;
    if (guestbook.busy) return '쪽지를 접는 중…';
    if (guestbook.relays) return '쪽지 ' + guestbook.notes.length + '장';
    return guestbook.settled ? '연결하지 못했습니다. 계속 시도하는 중…' : '연결하는 중…';
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (guestbook.busy) return;
    message = '';
    const problem = await guestbook.post(text, color);
    if (problem) {
      message = problem;
      return;
    }
    text = '';
    message = '붙였습니다.';
  }

  function remove(note: Note) {
    wm.dialog({
      key: 'remove:' + note.key,
      owner: win.id,
      title: '쪽지 떼기',
      kind: 'question',
      message: '이 쪽지를 뗄까요?\n\n“' + note.text + '”',
      buttons: [{ label: '떼기', primary: true, action: () => void guestbook.remove(note) }, { label: '취소' }]
    });
  }

  function ago(at: number) {
    const minutes = Math.floor((now - at) / 60_000);
    if (minutes < 1) return '방금';
    if (minutes < 60) return minutes + '분 전';
    if (minutes < 60 * 24) return Math.floor(minutes / 60) + '시간 전';
    if (minutes < 60 * 24 * 7) return Math.floor(minutes / (60 * 24)) + '일 전';
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(at);
  }
</script>

<div class="guestbook">
  <form onsubmit={submit}>
    <textarea
      bind:value={text}
      rows="2"
      maxlength={MAX_TEXT}
      placeholder="하연에게, 또는 다녀간 흔적 한마디"
      aria-label="쪽지 내용"
    ></textarea>
    <div class="tools">
      <input bind:value={guestbook.name} maxlength={MAX_NAME} placeholder="닉네임" aria-label="닉네임" />
      <div class="swatches" role="radiogroup" aria-label="쪽지 색">
        {#each colors as item (item)}
          <button
            type="button"
            class="swatch {item}"
            role="radio"
            aria-checked={color === item}
            aria-label={colorNames[item]}
            title={colorNames[item]}
            onclick={() => (color = item)}
          ></button>
        {/each}
      </div>
      <span class="send">
        <span class="count">{length}/{MAX_TEXT}</span>
        <button class="btn primary" disabled={guestbook.busy || !text.trim()}>붙이기</button>
      </span>
    </div>
  </form>

  <div class="wall">
    {#if guestbook.notes.length}
      <ol>
        {#each guestbook.notes as note (note.key)}
          <li class="note {note.color}">
            <p>{note.text}</p>
            <footer>
              <strong>{note.name}</strong>
              <time title={note.id}>{ago(note.at)}</time>
              {#if note.pubkey === guestbook.me}
                <button class="peel" onclick={() => remove(note)}>떼기</button>
              {/if}
            </footer>
          </li>
        {/each}
      </ol>
    {:else if guestbook.relays}
      <p class="empty">아직 쪽지가 없습니다. 첫 쪽지를 붙여 보세요.</p>
    {/if}
  </div>

  <div class="statusbar" role="status">
    <span>{status}</span>
    <span>지금 {guestbook.online}명 접속 중</span>
  </div>
</div>

<style>
  .guestbook {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f1f6f6;
  }

  form {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 9px 10px;
    border-bottom: 1px solid #c9d8d8;
    background: linear-gradient(180deg, #fbfdfd, #e6f0f0);
  }

  textarea,
  input {
    border: 1px solid #8ea5aa;
    border-radius: 2px;
    background: #fff;
    box-shadow: inset 0 1px 2px rgba(4, 60, 70, 0.14);
  }

  textarea {
    display: block;
    width: 100%;
    padding: 6px 8px;
    resize: none;
    line-height: 1.45;
  }

  textarea:focus,
  input:focus {
    outline: none;
    border-color: #1f9c8a;
    box-shadow:
      inset 0 1px 2px rgba(4, 60, 70, 0.14),
      0 0 0 1px rgba(82, 217, 187, 0.6);
  }

  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
  }

  input {
    flex: 1 1 96px;
    min-width: 0;
    max-width: 150px;
    height: 26px;
    padding: 0 8px;
  }

  .swatches {
    display: flex;
    gap: 4px;
  }

  .swatch {
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid rgba(4, 60, 70, 0.45);
    border-radius: 50%;
    background: var(--paper);
  }

  @media (pointer: coarse) {
    .swatch {
      width: 28px;
      height: 28px;
    }
  }

  .swatch[aria-checked='true'] {
    box-shadow:
      0 0 0 2px #fff,
      0 0 0 3px #0f8fa8;
  }

  .swatch:focus-visible {
    outline: 2px solid #075a70;
    outline-offset: 2px;
  }

  /* Kept together so they move to the next line as a pair on narrow screens. */
  .send {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .count {
    font-size: 12px;
    color: #5c7f88;
    font-variant-numeric: tabular-nums;
  }

  .btn:disabled {
    color: #9fb0b5;
  }

  .wall {
    flex: 1;
    min-height: 0;
    padding: 12px;
    overflow-y: auto;
    background:
      radial-gradient(120% 60% at 50% 0%, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 70%),
      #dfeceb;
  }

  ol {
    columns: 180px;
    column-gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .mint {
    --paper: #c9f7ea;
    --edge: #8fdcc8;
  }

  .lemon {
    --paper: #fbf3ae;
    --edge: #e3d67a;
  }

  .pink {
    --paper: #ffd9e2;
    --edge: #f0a9ba;
  }

  .sky {
    --paper: #cfe9fb;
    --edge: #9ccbec;
  }

  .lilac {
    --paper: #e4dcfb;
    --edge: #bcaeea;
  }

  .note {
    break-inside: avoid;
    margin: 0 0 12px;
    padding: 10px 11px 8px;
    border: 1px solid var(--edge);
    border-radius: 1px 1px 12px 1px;
    background: linear-gradient(170deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0) 45%), var(--paper);
    box-shadow: 0 3px 6px rgba(4, 60, 70, 0.18);
    user-select: text;
    -webkit-user-select: text;
  }

  .note:nth-child(3n + 1) {
    transform: rotate(-0.8deg);
  }

  .note:nth-child(3n + 2) {
    transform: rotate(0.6deg);
  }

  .note p {
    margin: 0;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  footer {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 7px;
    margin-top: 7px;
    font-size: 12px;
    color: #4a666c;
  }

  footer strong {
    font-weight: 600;
    color: #04222a;
    overflow-wrap: anywhere;
  }

  .peel {
    margin-left: auto;
    padding: 0 4px;
    border: 0;
    background: none;
    color: #0b6f7d;
    text-decoration: underline;
  }

  .empty {
    margin: 40px 0 0;
    text-align: center;
    color: #5c7f88;
  }
</style>
