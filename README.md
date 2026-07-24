# wilson-game

사과게임 방식의 웹 퍼즐 게임. 지정된 디스코드 서버의 멤버 중 학적 인증 역할을 가진 사용자만 로그인해 플레이할 수 있고, 점수는 디스코드 계정 기준으로 랭킹에 집계된다.

## 게임 규칙

가로 17칸, 세로 10칸 격자에 1부터 9까지의 사과가 무작위로 배치된다. 드래그로 사각형 영역을 선택해 합이 정확히 10이 되면 사과가 제거되고 제거한 개수만큼 점수를 얻는다. 제한 시간은 120초다.

## 기능

- 디스코드 OAuth 로그인과 서버 멤버십, 학적 인증 역할 검증
- 디스코드 계정 기준 최고 점수 기록, 동점이면 먼저 달성한 기록이 우선
- 상위 10명 랭킹, 조회할 때마다 디스코드에서 닉네임과 아바타를 최신화
- 관리자 전용 랭킹 새로고침, 점수 수정 API
- 라이트, 다크 테마와 배경음악 볼륨 조절

## 동작 방식

게임 보드는 HTML5 Canvas와 requestAnimationFrame 루프로 그린다. 로그인 시 봇 토큰으로 디스코드 API를 호출해 서버 멤버십과 학적 인증 역할을 확인하고, 둘 중 하나라도 없으면 로그인을 차단한다. 기록은 JSON으로 저장하며 `BLOB_READ_WRITE_TOKEN`이 있으면 Blob 저장소에, 없으면 로컬 파일 `data/records.json`에 쓴다.

## 실행

의존성을 설치한다.

```bash
npm install
```

아래 설정 표의 환경변수를 `.env` 파일에 준비한 뒤 개발 서버를 실행한다.

```bash
npm run dev
```

프로덕션 빌드와 실행.

```bash
npm run build
npm start
```

## 설정

| 키 | 설명 |
| --- | --- |
| `DISCORD_CLIENT_ID` | 디스코드 OAuth 앱 클라이언트 ID |
| `DISCORD_CLIENT_SECRET` | 디스코드 OAuth 앱 클라이언트 시크릿 |
| `DISCORD_BOT_TOKEN` | 멤버십과 역할 조회에 쓰는 디스코드 봇 토큰 |
| `DISCORD_GUILD_ID` | 대상 디스코드 서버 ID, 미설정 시 코드의 기본값 사용 |
| `NEXTAUTH_SECRET` | NextAuth 세션 서명 키 |
| `NEXTAUTH_URL` | 사이트 URL, 프로덕션에서만 필수 |
| `BLOB_READ_WRITE_TOKEN` | 기록 저장용 Blob 저장소 토큰, 미설정 시 로컬 파일에 저장 |
| `NEXT_PUBLIC_DISCORD_INVITE_URL` | 서버 미가입 안내에 표시할 디스코드 초대 링크 |
