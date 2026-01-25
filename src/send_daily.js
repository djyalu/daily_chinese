import "dotenv/config";
import { withDb } from "./db.js";
import { generateConversation } from "./generator.js";
import { renderEmail } from "./email_template.js";
import { sendMail } from "./mailer.js";

function getCandidateTopics(allTopics, subscriber) {
  const topicCategories = subscriber.topics
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (topicCategories.length === 0) return [];
  return allTopics.filter((t) => topicCategories.includes(t.category));
}

function pickFallbackTopic(emailLogs, subscriber, topics) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = emailLogs
    .filter(
      (log) =>
        log.subscriber_id === subscriber.id && new Date(log.sent_at).getTime() >= thirtyDaysAgo
    )
    .map((r) => r.topic_id);

  const fresh = topics.filter((t) => !recent.includes(t.id));
  const pool = fresh.length ? fresh : topics;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function sendForSubscriber(db, subscriber) {
  const topics = getCandidateTopics(db.topics, subscriber);
  if (topics.length === 0) throw new Error("No matching topics for subscriber");

  const fallbackTopic = pickFallbackTopic(db.email_logs, subscriber, topics);
  if (!fallbackTopic) throw new Error("No topics available for subscriber");

  const { topic, script } = await generateConversation({
    topic: fallbackTopic,
    level: subscriber.level,
  });

  const html = renderEmail({ subscriber, script });

  const subject = `Daily Chinese: ${script.title}`;
  await sendMail({ to: subscriber.email, subject, html });

  db.email_logs.push({
    id: db.email_logs.length + 1,
    subscriber_id: subscriber.id,
    topic_id: topic.id,
    sent_at: new Date().toISOString(),
    status: "sent",
  });
}

async function main() {
  await withDb(async (db) => {
    const subscribers = db.subscribers.filter((s) => s.active === true);

    for (const subscriber of subscribers) {
      try {
        await sendForSubscriber(db, subscriber);
        console.log(`Sent to ${subscriber.email}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        db.email_logs.push({
          id: db.email_logs.length + 1,
          subscriber_id: subscriber.id,
          topic_id: "unknown",
          sent_at: new Date().toISOString(),
          status: "failed",
          error: message,
        });
        console.error(`Failed for ${subscriber.email}: ${message}`);
      }
    }
  });
}

await main();
