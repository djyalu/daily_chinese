import "dotenv/config";
import express from "express";
import { withDb } from "./db.js";
import { startScheduler } from "./scheduler.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/topics", async (_req, res) => {
  const topics = await withDb((db) => db.topics || []);
  res.json(topics);
});

app.post("/subscribe", async (req, res) => {
  const { email, level = "beginner", topics = "daily", timezone = "Asia/Seoul", language = "zh-CN" } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });

  await withDb((db) => {
    const existing = db.subscribers.find((s) => s.email === email);
    if (existing) {
      existing.level = level;
      existing.topics = topics;
      existing.timezone = timezone;
      existing.language = language;
      existing.active = true;
      return;
    }

    db.subscribers.push({
      id: db.subscribers.length + 1,
      email,
      level,
      topics,
      timezone,
      language,
      active: true,
      created_at: new Date().toISOString(),
    });
  });

  res.json({ ok: true });
});

app.post("/unsubscribe", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });

  await withDb((db) => {
    const existing = db.subscribers.find((s) => s.email === email);
    if (existing) existing.active = false;
  });

  res.json({ ok: true });
});

app.get("/copy/:id", async (req, res) => {
  const log = await withDb((db) => db.email_logs.find((l) => l.id === parseInt(req.params.id)));
  if (!log || !log.script) return res.status(404).send("Content not found");

  const { title, intro, vocab, expressions, dialog, questions, tips } = log.script;
  const content = `
${title}
${intro}

[Vocabulary]
${(vocab || []).map((v) => `${v.term}${v.pinyin ? ` (${v.pinyin})` : ""} - ${v.meaning || ""}`).join("\n")}

${expressions?.length ? `[Expressions]\n${(expressions || []).map((p) => `${p.text || p}${p.pinyin ? ` (${p.pinyin})` : ""} - ${p.meaning || ""}`).join("\n")}` : ""}

[Dialogue]
${dialog.join("\n")}

[Questions]
${questions.join("\n")}

${tips?.length ? `[Tips]\n${(tips || []).join("\n")}` : ""}
`.trim();

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Copy Lesson Content</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f2f5; }
        .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
        button { background: #3498db; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #2980b9; }
        .status { margin-top: 1rem; color: #27ae60; font-weight: bold; display: none; }
        pre { display: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <h3>Daily Lesson Content</h3>
        <p>Click below to copy the entire lesson to your clipboard.</p>
        <button onclick="copy()">Copy to Clipboard</button>
        <div id="status" class="status">✅ Copied to clipboard!</div>
        <pre id="content">${content}</pre>
      </div>
      <script>
        function copy() {
          const text = document.getElementById('content').innerText;
          navigator.clipboard.writeText(text).then(() => {
            document.getElementById('status').style.display = 'block';
            setTimeout(() => window.close(), 1500);
          });
        }
        // Auto-copy on load if possible
        window.onload = () => {
          if (navigator.clipboard) copy();
        };
      </script>
    </body>
    </html>
  `);
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
  startScheduler();
});