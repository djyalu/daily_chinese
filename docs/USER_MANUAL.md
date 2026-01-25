# User Manual

## Overview
This project sends a daily Chinese learning email. Content is generated from local templates and vocab data, with optional Gemini enrichment when configured.

## Key Files
- data/topics.json: Topic list (id, category, title, zh_title, prompt_template).
- data/topic_vocab.json: Topic and category vocab lists. Use term/pinyin/meaning objects.
- data/script_templates.json: Dialogue templates for beginner/intermediate/advanced.
- data/vocab.json / data/phrases.json: Legacy vocab and expressions used as fallback.

## Configuration
Set these repository secrets or variables for GitHub Actions:
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: SMTP credentials.
- MAIL_FROM: From address for outbound mail.
- SUBSCRIBERS_JSON (Actions variable): JSON array of subscribers.

Example SUBSCRIBERS_JSON:
[
  { "email": "you@example.com", "level": "beginner", "topics": "daily,travel", "timezone": "Asia/Seoul", "active": true }
]

## Running Locally
1) Install dependencies:
   npm install
2) Initialize DB:
   npm run db:init
3) Send once:
   npm run send:daily

If SMTP is not configured, emails print to the console.

## Adding Topics
1) Add entries to data/topics.json.
2) (Optional) Add topic-specific vocab to data/topic_vocab.json under byId.
3) Run npm run db:init to seed the DB.

## Editing Vocab
- Prefer data/topic_vocab.json for topic-specific terms.
- Keep files in UTF-8 without BOM.
- Ensure terms match when relying on data/vocab.json enrichment.

## Troubleshooting
- If no emails are sent, verify SUBSCRIBERS_JSON is populated and active is true.
- If content looks broken, check JSON validity and file encoding.
- If Actions logs show "Seeded 0 subscribers", your variable is empty or not attached to the run.
