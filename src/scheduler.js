import cron from "node-cron";
import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schedules = [
  { lang: "zh-CN", cron: process.env.SCHEDULE_CRON_ZH || "30 7 * * *" },
  { lang: "ja-JP", cron: process.env.SCHEDULE_CRON_JA || "0 7 * * *" },
  { lang: "es-ES", cron: process.env.SCHEDULE_CRON_ES || "0 8 * * *" },
];

export function startScheduler() {
  const timezone = process.env.CRON_TZ || "Asia/Seoul";

  for (const { lang, cron: cronStr } of schedules) {
    cron.schedule(
      cronStr,
      () => {
        console.log(`Running daily send for ${lang}...`);
        const child = spawn(process.execPath, [path.join(__dirname, "send_daily.js"), lang], {
          stdio: "inherit",
        });
        child.on("close", (code) => {
          if (code !== 0) console.error(`send_daily (${lang}) exited with code ${code}`);
        });
      },
      { timezone }
    );
    console.log(`Scheduler registered: ${lang} at ${cronStr} (${timezone})`);
  }
}