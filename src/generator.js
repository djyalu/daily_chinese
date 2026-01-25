import crypto from "node:crypto";
import OpenAI from "openai";

function pickFrom(list, seed) {
  const idx = seed % list.length;
  return list[idx];
}

function buildLocalScript({ topic, level }) {
  const vocab = {
    beginner: ["你好", "谢谢", "请", "可以", "多少钱"],
    intermediate: ["安排", "方便", "建议", "如果", "因为"],
    advanced: ["优先", "调整", "讨论", "确认", "期待"],
  };

  const seed = crypto.createHash("md5").update(topic.id + level).digest()[0];
  const words = vocab[level] || vocab.beginner;

  const word1 = pickFrom(words, seed);
  const word2 = pickFrom(words, seed + 2);
  const word3 = pickFrom(words, seed + 4);

  const dialog = [
    `A: ${word1}！${topic.title}，你有时间吗？`,
    "B: 有的。我们可以先聊一下。",
    `A: ${word2}，我想了解一下具体情况。`,
    `B: 好的，${word3}。`,
  ];

  return {
    title: topic.title,
    intro: `Today's topic: ${topic.title}`,
    vocab: [word1, word2, word3],
    dialog,
    questions: ["你会怎么回答A的问题？", "你能用今天的词汇造句吗？"],
  };
}

function toTopicList(topics) {
  return topics.map((t) => ({
    id: t.id,
    category: t.category,
    title: t.title,
  }));
}

async function generateWithOpenAI({ topics, level, recentTopicIds }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const prompt = [
    "You are generating a daily Chinese learning email.",
    "Pick ONE topic from the provided list (by id) and write the script.",
    "Return JSON that matches the schema exactly.",
    "",
    `Level: ${level}`,
    `Recent topic ids (avoid if possible): ${recentTopicIds.join(", ") || "none"}`,
    "Available topics:",
    JSON.stringify(toTopicList(topics), null, 2),
  ].join("\n");

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: "Return JSON only. Follow the schema strictly.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "daily_chinese_script",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["topic_id", "title", "intro", "vocab", "dialog", "questions"],
          properties: {
            topic_id: { type: "string" },
            title: { type: "string" },
            intro: { type: "string" },
            vocab: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 6,
            },
            dialog: {
              type: "array",
              items: { type: "string" },
              minItems: 4,
              maxItems: 8,
            },
            questions: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              maxItems: 3,
            },
          },
        },
      },
    },
  });

  const text = response.output_text;
  if (!text) throw new Error("Empty response from OpenAI");

  return JSON.parse(text);
}

export async function generateConversation({ topics, level, recentTopicIds, fallbackTopic }) {
  if (!process.env.OPENAI_API_KEY) {
    return { topic: fallbackTopic, script: buildLocalScript({ topic: fallbackTopic, level }) };
  }

  try {
    const data = await generateWithOpenAI({ topics, level, recentTopicIds });
    const selected = topics.find((t) => t.id === data.topic_id) || fallbackTopic;
    const script = {
      title: data.title || selected.title,
      intro: data.intro || `Today's topic: ${selected.title}`,
      vocab: Array.isArray(data.vocab) ? data.vocab : [],
      dialog: Array.isArray(data.dialog) ? data.dialog : [],
      questions: Array.isArray(data.questions) ? data.questions : [],
    };
    return { topic: selected, script };
  } catch (err) {
    console.error("[OpenAI] Falling back to local generator:", err?.message || err);
    return { topic: fallbackTopic, script: buildLocalScript({ topic: fallbackTopic, level }) };
  }
}