# HaYeon OS

hayeon.eth에 설치된 작은 운영체제. tripleS S19 정하연의 색(Medium Turquoise)으로 칠한
Windows XP / 7 풍 바탕화면을 서버 없이 정적 페이지 하나로 띄운다.

팬이 만든 비공식 작품이다.

## 개발

~~~bash
pnpm install
pnpm dev      # 개발 서버
pnpm check    # 타입 검사
pnpm build    # dist/ 에 정적 파일 생성
~~~

빌드 결과는 모든 경로가 상대경로라서 IPFS 게이트웨이의 하위 경로(/ipfs/CID/)에서도 그대로 열린다.

## 구조

- src/lib/os — 세션 단계(부팅, 환영 화면, 바탕화면, 종료), 창 관리, 파일 저장소, 설정,
  고슴도치 찾기 규칙, 미디어 플레이어의 곡과 합성기
- src/lib/shell — 바탕화면, 창, 작업표시줄, 시작 메뉴
- src/lib/screens — 부팅, 환영, 종료 화면
- src/lib/apps — 창 안에 들어가는 프로그램(메모장, 내 컴퓨터, 휴지통, 시스템 속성, 고슴도치 찾기,
  미디어 플레이어, 터미널, 제어판, 대화상자).
  새 프로그램은 src/lib/os/apps.ts 에 등록하고, 바로가기는 src/lib/os/shell.ts 에 추가한다
- src/lib/ui — 아이콘, 로고, 배경화면(전부 직접 그린 SVG)과 메뉴 표시줄, 파일 목록

## 파일

메모장으로 저장한 글은 C:\내 문서에 들어가고 브라우저의 localStorage(hayeon-os:files:v1)에만 남는다.
지운 파일은 휴지통으로 가며, 휴지통을 비우면 완전히 사라진다. 드라이브와 시스템 폴더는
src/lib/os/disk.ts 에 적힌 읽기 전용 구조다.

## 설정과 기록

제어판에서 고른 테마(에어로, 루나)와 배경 화면은 hayeon-os:settings:v1 에, 고슴도치 찾기의
최고 기록은 hayeon-os:hog:v1 에 남는다. 둘 다 localStorage 라서 브라우저마다 따로다.
중력은 저장하지 않아서 새로 들어오면 꺼져 있다.

미디어 플레이어의 곡은 음원 파일 없이 WebAudio 로 그 자리에서 합성한다.

## 배포

빌드에는 Node 20.19 이상이 필요하다(Vite 8). 4EVERLAND 같은 빌더에서는 Node 버전을 20 이상으로,
빌드 명령을 npm run build, 출력 폴더를 dist 로 맞춘다.
