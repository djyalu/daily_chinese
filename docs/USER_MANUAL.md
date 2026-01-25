# 사용자 매뉴얼

## 1. 개요
daily_chinese는 매일 중국어 학습 이메일을 자동 발송하는 프로젝트입니다.
콘텐츠는 로컬 템플릿과 어휘 데이터로 생성되며, 설정 시 Gemini를 이용해 더 풍부한 내용을 생성할 수 있습니다.

## 2. 핵심 폴더/파일 구조
- `data/topics.json`
  주제 목록. 필드: `id`, `category`, `title`, `zh_title`, `prompt_template`
- `data/topic_vocab.json`
  주제별/카테고리별 어휘 목록. `term/pinyin/meaning` 구조 사용 권장
- `data/script_templates.json`
  대화/질문/팁 템플릿 (beginner/intermediate/advanced)
- `data/vocab.json`, `data/phrases.json`
  레거시 어휘/표현 데이터 (fallback용)
- `src/generator.js`
  콘텐츠 생성 로직
- `src/send_daily.js`
  구독자별 이메일 발송 로직
- `.github/workflows/daily-email.yml`
  GitHub Actions 워크플로우

## 3. 사전 준비사항
- Node.js 20+
- Git
- SMTP 계정 (메일 발송용)
- (선택) Gemini API Key

## 4. 로컬 실행 방법
### 4.1 설치
```
npm install
```

### 4.2 DB 초기화
```
npm run db:init
```
`data/db.json` 파일이 생성되며, topics가 시드됩니다.

### 4.3 로컬 실행 (서버)
```
npm start
```
서버가 실행되며 스케줄러가 함께 동작합니다.

### 4.4 로컬에서 한번만 발송
```
npm run send:daily
```
SMTP 설정이 없으면 콘솔에 이메일 HTML이 출력됩니다.

## 5. GitHub Actions 설정
### 5.1 필수 설정 (Repository Variables)
GitHub → Settings → Secrets and variables → Actions → Variables

필수 변수:
- `SUBSCRIBERS_JSON`
  구독자 JSON 배열

예시:
```json
[
  {
    "email": "you@example.com",
    "level": "beginner",
    "topics": "daily,travel",
    "timezone": "Asia/Seoul",
    "active": true
  }
]
```

### 5.2 필수 설정 (Repository Secrets)
GitHub → Settings → Secrets and variables → Actions → Secrets

필수 시크릿:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

선택 시크릿:
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

### 5.3 워크플로우 실행
GitHub → Actions → Daily Chinese Email → Run workflow
브랜치 `main` 선택 후 실행

### 5.4 정상 로그 예시
- `Seeded X subscribers.`
- `Subscriber count: X`
- `Sent to you@example.com`

## 6. 주제/어휘 관리
### 6.1 주제 추가
1) `data/topics.json`에 항목 추가
2) `data/topic_vocab.json`에 주제별 어휘 추가 (byId)
3) `npm run db:init` 실행

### 6.2 topic_vocab.json 구조
```json
{
  "byId": {
    "hobby_music": {
      "beginner": [
        { "term": "音乐", "pinyin": "yin1 yue4", "meaning": "music" }
      ]
    }
  },
  "byCategory": {
    "daily": {
      "beginner": [
        { "term": "起床", "pinyin": "qi3 chuang2", "meaning": "get up" }
      ]
    }
  },
  "default": {
    "beginner": [
      { "term": "你好", "pinyin": "ni3 hao3", "meaning": "hello" }
    ]
  }
}
```

### 6.3 어휘/표현 인코딩 규칙
- UTF-8 without BOM 권장
- 문자열이 깨지면 반드시 원문을 복구 후 저장

## 7. 템플릿 관리
`data/script_templates.json`은 beginner/intermediate/advanced 구조를 유지해야 합니다.
필수 키: `intro`, `dialogue`, `questions`, `tips`
`dialogue_fallback`은 선택입니다.

## 8. 품질 개선 팁
- 주제별 어휘(byId) 추가가 가장 효과적
- 대화 길이와 질문 수를 늘리면 학습 효과 상승
- Gemini API 사용 시 prompt_template 활용

## 9. 문제 해결
### 9.1 메일이 안 오는 경우
- `SUBSCRIBERS_JSON`에 구독자가 있는지 확인
- 구독자의 `active`가 true인지 확인
- SMTP 설정이 맞는지 확인

### 9.2 로그에 “Seeded 0 subscribers”가 나오는 경우
- `SUBSCRIBERS_JSON`이 빈 값이거나, Variables에 저장되지 않은 상태

### 9.3 중국어가 깨져 나오는 경우
- 관련 JSON 파일 인코딩 확인 (UTF-8 without BOM)

## 10. 추천 운영 흐름
1) topics/vocab 업데이트
2) 로컬 테스트 (`npm run send:daily`)
3) GitHub Actions 실행 확인
4) 매일 스케줄링 발송 확인
