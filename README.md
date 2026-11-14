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

- src/lib/os — 세션 단계(부팅, 환영 화면, 바탕화면, 종료)와 창 관리 상태
- src/lib/shell — 바탕화면, 창, 작업표시줄, 시작 메뉴
- src/lib/screens — 부팅, 환영, 종료 화면
- src/lib/apps — 창 안에 들어가는 프로그램. 새 프로그램은 src/lib/os/apps.ts 에 등록한다
- src/lib/ui — 아이콘, 로고, 배경화면 (전부 직접 그린 SVG)
