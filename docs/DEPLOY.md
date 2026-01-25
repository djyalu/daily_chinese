# Deploying `daily_chinese` to lovable.dev — Notes

## 요약

이 문서는 `daily_chinese`를 lovable.dev에 배포할 때 고려할 점, 필요한 변경사항, 그리고 예시 아티팩트(Dockerfile, 환경 변수, CI 스니펫)를 제공합니다. lovable.dev의 세부 동작(장기 프로세스, 영속적 파일시스템, 스케줄링 제공 여부)에 따라 적용 방식이 달라집니다.

## 플랫폼 호환성 체크리스트

- 런타임: 플랫폼이 장기 실행 Node 프로세스(Express + node-cron)를 허용하는가?
- 파일 영속성: 컨테이너 혹은 인스턴스 재시작 후에도 `data/db.json`이 유지되는가?
- 스케줄링: 플랫폼 자체 크론/스케줄러가 있거나 장기 프로세스에서 `node-cron`을 허용하는가?
- 네트워크: 외부 SMTP(예: 포트 587)로의 아웃바운드 연결이 허용되는가?
- 배포 방식: Docker 이미지로 배포하거나 GitHub 연동/CLI로 배포 가능한가?

## 권장 아키텍처 (플랫폼 기능별)

- 플랫폼이 장기 프로세스 + 영속 스토리지를 지원한다면
  - 현재 코드를 거의 변경 없이 배포 가능.
  - 환경변수로 `SCHEDULE_CRON`, `CRON_TZ`, `SMTP_*` 등을 설정.

- 플랫폼이 장기 프로세스를 지원하지만 파일시스템이 휘발성이라면
  - `data/db.json`를 외부 저장소로 대체해야 함(예: S3, object storage, managed DB).
  - 간단한 해결: S3에 JSON 파일을 저장/불러오는 `withDb` 래퍼 구현.

- 플랫폼이 서버리스(요청 트리거) 기반이고 스케줄러가 없다면
  - 스케줄을 GitHub Actions(또는 플랫폼의 예약 작업)로 옮기고 `npm run send:daily`를 실행하도록 트리거.
  - 또는 플랫폼의 작업 스케줄러를 사용해 컨테이너를 주기 실행.

## 환경 변수 (설정해야 할 항목)

- `PORT` — Express 포트 (기본 3000)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — SMTP 설정
- `MAIL_FROM` — 발신자 기본값
- `SCHEDULE_CRON` — cron 표현식 (기본 `30 7 * * *`)
- `CRON_TZ` — 스케줄 타임존 (예: `Asia/Seoul`)

## 예시: 간단한 `Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
```

설명: 이 이미지로 컨테이너를 빌드해 lovable.dev에 배포하면, 컨테이너가 시작되며 `src/server.js`가 Express 서버와 스케줄러를 시작합니다. 단, 컨테이너 재시작 시 `data/db.json`의 보존 여부는 플랫폼 설정에 따릅니다.

## 예시: GitHub Actions로 이미지 빌드 후 레지스트리에 푸시

작업 흐름은 플랫폼이 이미지 배포를 지원하는 경우 유용합니다. (lovable.dev가 레지스트리 기반 배포를 지원해야 함.)

```yaml
name: Build and Push
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t ghcr.io/<OWNER>/daily_chinese:${{ github.sha }} .
      - name: Push image
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/<OWNER>/daily_chinese:${{ github.sha }}
```

## 스토리지 마이그레이션(옵션)

- S3를 사용해 `withDb`를 교체하는 간단한 방법:
  - 기존 `src/db.js`를 유지하되, 읽기/쓰기를 S3에 위임하는 새 모듈을 작성.
  - 단일 JSON 파일로 동작하는 현재 구조는 동시성 문제가 있을 수 있으므로 트랜잭션 가능성을 고려.

## 스케줄링 대안

- 플랫폼 스케줄러가 없으면 GitHub Actions의 `workflow_dispatch`와 `schedule`을 사용해 정기적으로 `npm run send:daily`를 실행할 수 있습니다.
- 또는 플랫폼의 작업 스케줄링 기능(있다면)을 이용해 컨테이너의 특정 엔트리포인트를 실행.

## 보안 및 운영

- SMTP 자격증명 및 기타 비밀은 플랫폼의 시크릿/환경변수 저장소에 넣으세요.
- 전송 로그(`email_logs`)는 외부 DB에 저장하는 것이 더 안정적입니다.

## 권장 다음 단계

1. lovable.dev의 플랫폼 문서에서 다음을 확인하세요: 장기 프로세스 지원 여부, 파일 영속성, 예약 작업, 레지스트리/이미지 배포 방식.
2. 플랫폼이 파일 영속성을 제공하지 않으면 S3/managed DB로 `withDb` 교체를 계획하세요.
3. CI에서 이미지 빌드/푸시 방법을 설정하거나, 플랫폼 전용 배포 스텝을 구현하세요.

---

문서 업데이트나 `Dockerfile`/`withDb` 코드 변경을 원하시면 다음 작업을 진행하겠습니다.
