import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "data", "db.json");

export function loadDb() {
  if (!fs.existsSync(dbPath)) {
    return { subscribers: [], topics: [], email_logs: [] };
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

export function saveDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function withDb(mutator) {
  const data = loadDb();
  const result = mutator(data);
  saveDb(data);
  return result;
}

export function getDbPath() {
  return dbPath;
}