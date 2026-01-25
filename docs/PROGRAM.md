# Daily Chinese — Program Summary

## 개요

`daily_chinese`는 구독자에게 매일 회화 주제와 예시 대화를 이메일로 발송하는 간단한 서비스입니다. 스케줄러가 설정된 시간에 `send_daily.js`를 실행하여 활성 구독자에게 이메일을 보냅니다.

## 빠른 시작

- 의존성 설치:

```bash
npm install
```

- 환경 설정:

```powershell
copy .env.example .env
```

- DB 초기화 (`data/db.json` 생성):

```bash
npm run db:init
```

- 서버 실행 (스케줄러 포함):

```bash
npm start
```

- 하루 전송을 수동으로 실행하려면:

```bash
npm run send:daily
```

## 주요 엔드포인트

- `GET /health` : 상태 확인
- `GET /topics` : 사용 가능한 주제 목록 반환
- `POST /subscribe` : 구독 추가/업데이트. JSON 바디: `email`, `level`, `topics`, `timezone`
- `POST /unsubscribe` : 구독 비활성화. JSON 바디: `email`

## 주요 파일 설명

- `src/server.js` — Express 서버와 API 엔드포인트, 애플리케이션 진입점 (서버 시작 시 `startScheduler()` 호출).
- `src/scheduler.js` — `node-cron`으로 스케줄을 등록, 지정 시간에 `send_daily.js`를 자식 프로세스로 실행.
- `src/send_daily.js` — DB에서 활성 구독자를 불러와 각 구독자에게 주제 선택, 스크립트 생성, 이메일 렌더링 및 전송을 수행.
- `src/generator.js` — 주제와 레벨을 바탕으로 회화 스크립트(어휘, 대화, 질문)를 생성.
- `src/email_template.js` — `renderEmail()`로 HTML 이메일을 생성.
- `src/mailer.js` — SMTP가 구성되어 있으면 실제 전송, 미구성 시 콘솔에 출력.
- `src/db.js` — 간단한 JSON 파일 기반 DB 유틸리티(`loadDb`, `saveDb`, `withDb`). DB 파일은 `data/db.json`.
- `src/db_init.js` — 초기 데이터 생성(구독자/주제/로그 기본값).

## 환경 변수

- `PORT` — 서버 포트 (기본: `3000`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — SMTP 설정
- `MAIL_FROM` — 발신자 기본값
- `SCHEDULE_CRON` — cron 표현식 (기본 `30 7 * * *`)
- `CRON_TZ` 또는 `CRON_TZ`로 타임존 설정 (예: `Asia/Seoul`)

## 동작 요약

- 구독자 선택: `subscriber.topics` (쉼표로 구분된 카테고리)에 맞는 주제 목록에서, 최근 30일에 보내지지 않은 주제를 우선 선택.
- 스크립트 생성: `src/generator.js`가 단어 목록과 간단한 시드 로직으로 대화문을 생성.
- 이메일 전송: `src/mailer.js`가 SMTP 설정을 검사하여 실제 전송하거나 콘솔 출력.
- 전송 로그: 전송 결과는 `data/db.json`의 `email_logs`에 기록.

## 테스트 및 개발 도움말

- 로컬에서 스케줄러 없이 바로 전송을 확인하려면 `npm run send:daily` 실행.
- API 테스트는 curl 또는 Postman으로 `POST /subscribe` 호출.

## CI / GitHub Actions

- 수동으로 실행 가능한 테스트 워크플로우가 추가되어 있습니다: `.github/workflows/test.yml` (워크스페이스 파일).

## 추가 작업(선택)

- 문서화에 이상이 없으면 이 파일을 커밋하여 원격에 푸시할 수 있습니다.
