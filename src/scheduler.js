import cron from "node-cron";
import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schedule = process.env.SCHEDULE_CRON || "30 7 * * *";

export function startScheduler() {
  const task = cron.schedule(
    schedule,
    () => {
      const child = spawn(process.execPath, [path.join(__dirname, "send_daily.js")], {
        stdio: "inherit",
      });
      child.on("close", (code) => {
        if (code !== 0) console.error(`send_daily exited with code ${code}`);
      });
    },
    { timezone: process.env.CRON_TZ || "Asia/Seoul" }
  );

  task.start();
  console.log(`Scheduler started: ${schedule} (${process.env.CRON_TZ || "Asia/Seoul"})`);
}