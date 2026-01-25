# AGENTS — Runtime agents and responsibilities

This document describes the distinct "agents" (processes/services) that make up `daily_chinese`, their responsibilities, and operational notes for deployment.

## Server Agent
- Location: `src/server.js`
- Role: Express HTTP server exposing API endpoints (`/health`, `/topics`, `/subscribe`, `/unsubscribe`) and starting the Scheduler Agent on boot.
- Notes: Must run as a long-lived Node process. If the platform restarts containers, ensure scheduler behavior is acceptable (idempotency).

## Scheduler Agent
- Location: `src/scheduler.js` (node-cron)
- Role: Runs a cron job (default `30 7 * * *`) and spawns `src/send_daily.js` as a child process.
- Alternatives: If the platform does not support long-running processes or node-cron, use an external scheduler (GitHub Actions `schedule` or platform scheduled jobs) to invoke `npm run send:daily`.

## Sender Agent
- Location: `src/mailer.js` and `src/send_daily.js`
- Role: Renders email HTML and sends messages via SMTP. Falls back to console printing when SMTP is not configured.
- Notes: Requires outbound SMTP access; credentials must be stored securely in environment/secret storage.

## Generator Agent
- Location: `src/generator.js`
- Role: Creates the conversation script (vocab, dialog, questions) per topic/level. Stateless and safe to run in parallel.

## DB Agent
- Location: `src/db.js` (uses `data/db.json`)
- Role: Provides simple load/save (`loadDb`, `saveDb`, `withDb`) for subscribers, topics, and email_logs.
- Operational concern: `data/db.json` is file-based and not safe for concurrent writers or ephemeral filesystems. For cloud deployment prefer migrating to:
  - Managed DB (Postgres, MySQL) or
  - Object storage (S3) with careful read/write locking, or
  - Lightweight hosted DB (SQLite on a persistent volume)

## CI / Automation Agent
- Location: `.github/workflows/` (example workflows)
- Role: Test, build, and optionally schedule `send_daily` if platform scheduler is unavailable. Also used to build and push Docker images for deployment.

## Deployment Agent
- Role: Platform that runs containers or server processes (e.g., lovable.dev, Docker host, or PaaS). Responsible for environment variable injection, secret management, networking, and persistent volumes.

## Operational recommendations
- Secrets: Store SMTP and other secrets in the platform's secrets manager.
- Persistence: If the platform's filesystem is ephemeral, migrate DB storage before production deployment.
- Concurrency: Replace naive `withDb` writes with a transactional store when multiple writer agents may run concurrently.
- Monitoring: Add basic health checks (`/health`) to the platform and alerting for failed email sends (scan `email_logs`).
- Backoff & retries: Implement retry/backoff for transient SMTP failures if needed.

## Quick mapping (summary)
- Server Agent — `src/server.js`
- Scheduler Agent — `src/scheduler.js` → spawns `src/send_daily.js`
- Sender Agent — `src/mailer.js`
- Generator Agent — `src/generator.js`
- DB Agent — `src/db.js` (`data/db.json`)
- CI Agent — `.github/workflows/*`
- Deployment Agent — platform / Docker image

---

If you'd like, I can commit this file and push it to `test-github-actions` or another branch, or expand any section (e.g., provide an S3-backed `src/db.js` implementation). 
