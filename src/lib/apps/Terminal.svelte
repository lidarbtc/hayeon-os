<script lang="ts">
  import { REPO_URL } from '../os/about';
  import { BUILD_TIME, DOCUMENTS, displayPath, drives, staticFolder } from '../os/disk';
  import { fileSize, fs } from '../os/fs.svelte';
  import { usesMouse } from '../os/pointer';
  import { settings } from '../os/settings.svelte';
  import { shortcuts, type Shortcut } from '../os/shell';
  import { wm, type Win } from '../os/wm.svelte';

  let { win }: { win: Win } = $props();

  interface Line {
    text: string;
    error?: boolean;
  }

  const VERSION = 'HaYeon OS [Version 19.0.20070801]';
  const MAX_LINES = 400;

  let lines = $state<Line[]>([
    { text: VERSION },
    { text: 'hayeon.eth에 설치됨. 서버 없음.' },
    { text: '' },
    { text: 'help 를 입력하면 명령어 목록이 나옵니다.' },
    { text: '' }
  ]);
  /** The current folder, as an internal path such as "C:" or "C:/HaYeon OS". */
  let cwd = $state('C:');
  let input = $state('');
  let screen: HTMLElement;
  let field: HTMLInputElement;

  const past: string[] = [];
  let cursor = 0;

  const prompt = $derived(displayPath(cwd) + (cwd.length === 2 ? '\\' : '') + '>');

  $effect(() => {
    void lines.length;
    screen.scrollTop = screen.scrollHeight;
  });

  $effect(() => {
    // On touch screens focusing would only pop the keyboard up before anyone asked.
    if (usesMouse()) field.focus();
  });

  function print(text: string, error = false) {
    for (const part of text.split('\n')) lines.push({ text: part, error });
    if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
  }

  function fail(text: string) {
    print(text, true);
  }

  /** Turn what was typed into a folder that exists, matching names without regard to case. */
  function locate(arg: string): { path: string } | { error: string } {
    let rest = arg.replace(/^"|"$/g, '').replaceAll('\\', '/');
    let drive = cwd.slice(0, 2);
    let parts = cwd.split('/').slice(1);
    const absolute = /^([a-z]):(.*)$/i.exec(rest);
    if (absolute) {
      drive = absolute[1].toUpperCase() + ':';
      parts = [];
      rest = absolute[2];
    } else if (rest.startsWith('/')) {
      parts = [];
    }
    const info = drives.find((item) => item.letter + ':' === drive);
    if (!info) return { error: '시스템이 지정된 드라이브를 찾을 수 없습니다.' };
    if (info.type !== 'disk') return { error: '장치가 준비되지 않았습니다.' };
    for (const part of rest.split('/')) {
      if (part === '' || part === '.') continue;
      if (part === '..') {
        parts.pop();
        continue;
      }
      const here = [drive, ...parts].join('/');
      const match = staticFolder(here)?.folders.find((name) => name.toLowerCase() === part.toLowerCase());
      if (!match) return { error: '지정된 경로를 찾을 수 없습니다.' };
      parts.push(match);
    }
    return { path: [drive, ...parts].join('/') };
  }

  const stampFormat = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  function dir(arg: string) {
    const target = arg ? locate(arg) : { path: cwd };
    if ('error' in target) return fail(target.error);
    const folder = staticFolder(target.path);
    const drive = drives.find((item) => item.letter + ':' === target.path.slice(0, 2));
    const built = stampFormat.format(BUILD_TIME);
    const rows: string[] = [];
    for (const name of folder?.folders ?? []) rows.push(built + '    <DIR>          ' + name);
    let files = folder?.files.length ?? 0;
    for (const file of folder?.files ?? []) rows.push(built + '    ' + file.size.padStart(14) + ' ' + file.name);
    if (target.path === DOCUMENTS) {
      for (const file of fs.documents) {
        rows.push(stampFormat.format(file.modified) + '    ' + fileSize(file.content).padStart(14) + ' ' + file.name);
        files++;
      }
    }
    print(
      [
        ' ' + target.path[0] + ' 드라이브의 볼륨: ' + (drive?.label ?? ''),
        ' ' + displayPath(target.path) + (target.path.length === 2 ? '\\' : '') + ' 디렉터리',
        '',
        ...rows,
        '               ' + files + '개 파일',
        '               ' + (folder?.folders.length ?? 0) + '개 디렉터리',
        ''
      ].join('\n')
    );
  }

  function cd(arg: string) {
    if (!arg) return print(displayPath(cwd) + (cwd.length === 2 ? '\\' : ''));
    const target = locate(arg);
    if ('error' in target) return fail(target.error);
    cwd = target.path;
  }

  function type(arg: string) {
    if (!arg) return fail('명령 구문이 올바르지 않습니다.');
    const raw = arg.replace(/^"|"$/g, '').replaceAll('\\', '/');
    const slash = raw.lastIndexOf('/');
    const name = raw.slice(slash + 1).toLowerCase();
    const where = slash < 0 ? { path: cwd } : locate(raw.slice(0, slash) || '/');
    if ('error' in where) return fail(where.error);
    const shipped = staticFolder(where.path)?.files.find((file) => file.name.toLowerCase() === name);
    if (shipped) {
      if (shipped.content === undefined) return fail('액세스가 거부되었습니다.');
      return print(shipped.content);
    }
    const written = where.path === DOCUMENTS ? fs.byName(name) : undefined;
    if (!written) return fail('지정된 파일을 찾을 수 없습니다.');
    print(written.content);
  }

  const programs: [string[], Shortcut][] = [
    [['notepad', '메모장'], shortcuts.notepad],
    [['photos', '사진', '내 사진'], shortcuts.photos],
    [['profile', '프로필'], shortcuts.profile],
    [['hedgehog', '고슴도치', '고슴도치 찾기'], shortcuts.hedgehog],
    [['player', '미디어', '미디어 플레이어'], shortcuts.player],
    [['control', '제어판'], shortcuts.control],
    [['explorer', '내 컴퓨터'], shortcuts.computer],
    [['bin', '휴지통'], shortcuts.bin],
    [['system', '시스템', '시스템 속성'], shortcuts.system]
  ];

  function start(arg: string) {
    const wanted = arg.toLowerCase();
    const program = programs.find(([names]) => names.includes(wanted));
    if (!program) {
      return fail(
        (arg ? "'" + arg + "'을(를) 찾을 수 없습니다. " : '') +
          '열 수 있는 프로그램: ' +
          programs.map(([names]) => names[0]).join(', ')
      );
    }
    program[1].open();
  }

  function theme(arg: string) {
    const wanted = arg.toLowerCase();
    if (wanted === 'aero' || wanted === 'luna') settings.setTheme(wanted);
    else if (wanted) return fail('쓸 수 있는 테마: aero, luna');
    print('테마: ' + settings.theme);
  }

  function gravity(arg: string) {
    const wanted = arg.toLowerCase();
    if (wanted === 'on' || wanted === 'off') settings.gravity = wanted === 'on';
    else if (wanted) return fail('사용법: gravity on 또는 gravity off');
    print('중력: ' + (settings.gravity ? '켜짐' : '꺼짐'));
  }

  const HELP = [
    '명령어 목록',
    '  HELP      이 목록을 보여 줍니다.',
    '  DIR       파일과 폴더 목록을 보여 줍니다.',
    '  CD        폴더를 옮깁니다. 예: cd HaYeon OS, cd ..',
    '  TYPE      텍스트 파일의 내용을 보여 줍니다. 예: type HaYeon OS\\boot.ini',
    '  START     프로그램을 엽니다. 예: start notepad',
    '  ECHO      받은 글자를 그대로 씁니다.',
    '  WHOAMI    지금 사용자를 알려 줍니다.',
    '  HOSTNAME  컴퓨터 이름을 알려 줍니다.',
    '  VER       버전을 알려 줍니다.',
    '  DATE      오늘 날짜를 알려 줍니다.',
    '  TIME      지금 시각을 알려 줍니다.',
    '  THEME     테마를 바꿉니다. 예: theme luna',
    '  GRAVITY   중력을 켜고 끕니다. 예: gravity on',
    '  SOURCE    소스 코드가 있는 곳을 알려 줍니다.',
    '  CLS       화면을 지웁니다.',
    '  EXIT      터미널을 닫습니다.',
    ''
  ].join('\n');

  const commands: Record<string, (arg: string) => void> = {
    help: () => print(HELP),
    dir,
    ls: dir,
    cd,
    chdir: cd,
    pwd: () => cd(''),
    type,
    cat: type,
    start,
    echo: (arg) => print(arg),
    whoami: () => print('hayeon.eth\\s19'),
    hostname: () => print('hayeon.eth'),
    ver: () => print('\n' + VERSION + '\n'),
    date: () => print(new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full' }).format(new Date())),
    time: () => print(new Intl.DateTimeFormat('ko-KR', { timeStyle: 'medium' }).format(new Date())),
    theme,
    gravity,
    source: () => print(REPO_URL),
    cls: () => (lines = []),
    clear: () => (lines = []),
    exit: () => wm.requestClose(win.id),
    sudo: () => fail('이 컴퓨터에는 관리자가 없습니다. 고슴도치만 있습니다.')
  };

  function run(raw: string) {
    print(prompt + raw);
    // "cd.." and "cd\" work without a space, as they do in cmd.
    const text = raw.trim().replace(/^(cd|chdir)(?=[.\\/])/i, '$1 ');
    if (!text) return;
    past.push(text);
    cursor = past.length;
    if (/^[a-z]:$/i.test(text)) return cd(text);
    const space = text.search(/\s/);
    const name = (space < 0 ? text : text.slice(0, space)).toLowerCase();
    const arg = space < 0 ? '' : text.slice(space + 1).trim();
    const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
    if (command) command(arg);
    else fail("'" + name + "'은(는) 내부 또는 외부 명령, 실행할 수 있는 프로그램, 또는\n배치 파일이 아닙니다.");
  }

  function keydown(event: KeyboardEvent) {
    // Enter also confirms a Hangul syllable that is still being composed.
    if (event.isComposing) return;
    if (event.key === 'Enter') {
      const raw = input;
      input = '';
      run(raw);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      cursor = Math.max(0, Math.min(past.length, cursor + (event.key === 'ArrowUp' ? -1 : 1)));
      input = past[cursor] ?? '';
    } else if (event.key.toLowerCase() === 'l' && event.ctrlKey) {
      event.preventDefault();
      lines = [];
    }
  }

  function focus() {
    // Leave a drag-selection alone so output can be copied.
    if (!getSelection()?.toString()) field.focus();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="terminal" bind:this={screen} onclick={focus}>
  {#each lines as line, index (index)}
    <div class="line" class:error={line.error}>{line.text || ' '}</div>
  {/each}
  <label class="entry">
    <span>{prompt}</span>
    <input
      bind:this={field}
      bind:value={input}
      aria-label="명령어"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      onkeydown={keydown}
    />
  </label>
</div>

<style>
  .terminal {
    height: 100%;
    padding: 6px 8px;
    overflow-y: auto;
    background: #03161c;
    color: #c9fff2;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.5;
    cursor: text;
    user-select: text;
    -webkit-user-select: text;
  }

  .line {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .line.error {
    color: #ffb3a8;
  }

  .entry {
    display: flex;
    gap: 0;
  }

  .entry span {
    flex: none;
    white-space: pre;
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: none;
    color: #fff;
    caret-color: var(--hy-turquoise);
  }

  @media (max-width: 639px) {
    /* Anything smaller makes iOS zoom the page in when the field gets focus. */
    .terminal {
      font-size: 16px;
    }
  }
</style>
