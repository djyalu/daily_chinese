# Language Expansion Plan (Japanese / Spanish)

## Goal
Extend the current daily_chinese system to support Japanese and Spanish learning emails while keeping the same delivery pipeline and automation.

## Guiding Principles
- Reuse the existing generation pipeline as much as possible.
- Keep data schemas consistent across languages.
- Make language selection subscriber-driven.
- Preserve GitHub Actions workflow with minimal changes.

## Proposed Data Layout
Create language-specific data folders:
- data/zh/
- data/ja/
- data/es/

Each folder should contain:
- topics.json
- topic_vocab.json
- script_templates.json
- vocab.json
- phrases.json

## Schema Consistency
Keep identical JSON schemas across all languages so generator logic can stay uniform:
- topics.json: id, category, title, zh_title (or language-specific title), prompt_template
- topic_vocab.json: byId / byCategory / default
- script_templates.json: beginner / intermediate / advanced

## Subscriber Changes
Add `language` to subscribers:
- zh (default)
- ja
- es

Example:
{
  "email": "you@example.com",
  "level": "beginner",
  "topics": "daily,travel",
  "timezone": "Asia/Seoul",
  "language": "ja",
  "active": true
}

## Code Changes (High Level)
1) `src/generator.js`
   - Accept language parameter
   - Resolve data path based on language
   - Use language-specific templates/vocab

2) `src/send_daily.js`
   - Pass subscriber.language into generator

3) `src/db.js` / `data/db.json`
   - Persist language field
   - Default to `zh` for older subscribers

## Workflow / Automation
- GitHub Actions stays the same.
- `send:daily` runs once; generator selects language per subscriber.

## Content Creation Plan
- Start with 10-15 topics per language.
- Build topic_vocab for high-frequency topics first.
- Expand category vocab gradually.

## Encoding / Quality Rules
- Always UTF-8 without BOM.
- Avoid mojibake by enforcing encoding checks before commits.
- Validate JSON with a simple CI step if needed.

## Optional Enhancements
- Language-specific email subject templates
- Locale-specific date formatting
- Per-language tone/style guidelines

## Milestones
1) Add language-aware data directories
2) Add subscriber.language and default handling
3) Implement generator path switching
4) Seed Japanese and Spanish starter data
5) Validate end-to-end Actions run

---

This plan is forward-compatible with the current daily_chinese architecture and requires minimal workflow changes.
