import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDb, saveDb } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const topicsPath = path.join(__dirname, "..", "data", "topics.json");

const db = loadDb();

if (!db.topics || db.topics.length === 0) {
  const topics = JSON.parse(fs.readFileSync(topicsPath, "utf8"));
  db.topics = topics;
  console.log(`Seeded ${topics.length} topics.`);
} else {
  console.log("Topics already seeded.");
}

if (!db.subscribers) db.subscribers = [];
if (!db.email_logs) db.email_logs = [];

saveDb(db);
console.log("DB init complete.");