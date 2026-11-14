<script lang="ts">
  const text = [
    'HaYeon OS S19에 오신 것을 환영합니다.',
    '',
    '이 컴퓨터는 hayeon.eth에 설치되어 있습니다.',
    '서버 없이 IPFS 위에서 혼자 부팅됩니다.',
    '',
    '[지금 할 수 있는 것]',
    '- 제목 표시줄을 끌어서 창 옮기기',
    '- 가장자리를 잡고 창 크기 바꾸기',
    '- 제목 표시줄을 두 번 눌러 최대화하기',
    '- 시작 메뉴에서 로그오프, 다시 시작, 종료',
    '',
    '[설치 예정]',
    '- 메모장, 내 컴퓨터, 휴지통',
    '- 고슴도치 찾기',
    '- 미디어 플레이어, 터미널, 제어판',
    '',
    'Build 20070801'
  ].join('\n');
</script>

<pre>{text}</pre>

<style>
  pre {
    height: 100%;
    margin: 0;
    padding: 10px 12px;
    overflow: auto;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: keep-all;
    user-select: text;
    -webkit-user-select: text;
    cursor: text;
  }
</style>
