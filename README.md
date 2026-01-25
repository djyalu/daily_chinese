# daily_chinese

Daily 7:30 China-study reminder email with rotating conversation topics.

## Quick start

1) Install deps

```bash
npm install
```

2) Configure env

```bash
copy .env.example .env
```

3) Init DB (JSON file under `data/db.json`)

```bash
npm run db:init
```

4) Run server (starts scheduler)

```bash
npm start
```

## Subscribe example

```bash
curl -X POST http://localhost:3000/subscribe \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"you@example.com\",\"level\":\"beginner\",\"topics\":\"daily,travel\",\"timezone\":\"Asia/Seoul\"}"
```

## Dev notes
- Scheduler uses `CRON_TZ` + `SCHEDULE_CRON` to send daily emails.
- If SMTP isn't configured, email output is printed to the console.
- Use `npm run send:daily` to run the daily send once.
