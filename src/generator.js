import crypto from "node:crypto";

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

export async function generateConversation({ topic, level }) {
  // Local fallback generator (no external API required).
  return buildLocalScript({ topic, level });
}