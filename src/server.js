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
    <html lang="ko">
    <head>
      <title>학습 내용 복사</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100vh; 
          margin: 0; 
          background: #f8fafc; 
        }
        .card { 
          background: white; 
          padding: 2.5rem; 
          border-radius: 20px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.05); 
          text-align: center; 
          max-width: 450px; 
          width: 90%; 
          border: 1px solid #e2e8f0;
        }
        .icon { font-size: 3rem; margin-bottom: 1rem; }
        h3 { color: #1e293b; margin-bottom: 0.5rem; font-size: 1.5rem; }
        p { color: #64748b; margin-bottom: 2rem; line-height: 1.6; }
        .copy-btn { 
          background: #3b82f6; 
          color: white; 
          border: none; 
          padding: 16px 32px; 
          border-radius: 12px; 
          font-size: 18px; 
          font-weight: 700; 
          cursor: pointer; 
          transition: all 0.2s; 
          width: 100%;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
        }
        .copy-btn:hover { background: #2563eb; transform: translateY(-2px); }
        .copy-btn:active { transform: translateY(0); }
        .status { 
          margin-top: 1.5rem; 
          color: #10b981; 
          font-weight: 600; 
          display: none; 
          padding: 10px;
          background: #ecfdf5;
          border-radius: 8px;
        }
        pre { display: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">📋</div>
        <h3>복사 준비 완료</h3>
        <p>버튼을 클릭하면 전체 학습 내용이<br>클립보드에 즉시 복사됩니다.</p>
        <button id="copyBtn" class="copy-btn" onclick="copy()">클릭하여 복사하기</button>
        <div id="status" class="status">✅ 클립보드에 복사되었습니다!</div>
        <pre id="content">${content}</pre>
      </div>
      <script>
        const btn = document.getElementById('copyBtn');
        const status = document.getElementById('status');
        const content = document.getElementById('content');

        function copy() {
          const text = content.innerText;
          navigator.clipboard.writeText(text).then(() => {
            status.style.display = 'block';
            btn.style.background = '#10b981';
            btn.innerText = '복사 완료';
            
            // 1.5초 후 자동으로 창을 닫으려고 시도 (일부 브라우저 제한 있음)
            setTimeout(() => {
              if (window.opener || window.history.length === 1) {
                window.close();
              }
            }, 1500);
          }).catch(err => {
            alert('복사에 실패했습니다. 수동으로 복사해 주세요.');
          });
        }

        // 브라우저가 사용자 상호작용 없이 복사를 허용하는 경우 자동 복사 시도
        window.onload = () => {
          // 일부 브라우저에서는 사용자 제스처(클릭)가 필요하므로 
          // 자동 복사가 실패할 수 있음을 인지하고 버튼을 크게 배치함
          copy(); 
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