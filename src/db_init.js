import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDb, saveDb } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const topicsPath = path.join(__dirname, "..", "data", "topics.json");

const db = loadDb();
const topics = JSON.parse(fs.readFileSync(topicsPath, "utf8"));

if (!db.topics || db.topics.length === 0) {
  db.topics = topics;
  console.log(`Seeded ${topics.length} topics.`);
} else {
  const byId = new Map(topics.map((t) => [t.id, t]));
  db.topics = db.topics.map((t) => ({ ...t, ...byId.get(t.id) }));
  console.log("Topics updated.");
}

if (!db.subscribers) db.subscribers = [];
if (!db.email_logs) db.email_logs = [];

saveDb(db);
console.log("DB init complete.");
