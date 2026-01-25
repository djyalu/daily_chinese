import "dotenv/config";
import express from "express";
import { withDb } from "./db.js";
import { startScheduler } from "./scheduler.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/topics", (_req, res) => {
  const topics = withDb((db) => db.topics || []);
  res.json(topics);
});

app.post("/subscribe", (req, res) => {
  const { email, level = "beginner", topics = "daily", timezone = "Asia/Seoul" } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });

  withDb((db) => {
    const existing = db.subscribers.find((s) => s.email === email);
    if (existing) {
      existing.level = level;
      existing.topics = topics;
      existing.timezone = timezone;
      existing.active = true;
      return;
    }

    db.subscribers.push({
      id: db.subscribers.length + 1,
      email,
      level,
      topics,
      timezone,
      active: true,
      created_at: new Date().toISOString(),
    });
  });

  res.json({ ok: true });
});

app.post("/unsubscribe", (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });

  withDb((db) => {
    const existing = db.subscribers.find((s) => s.email === email);
    if (existing) existing.active = false;
  });

  res.json({ ok: true });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
  startScheduler();
});