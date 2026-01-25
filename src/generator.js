import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const cache = new Map();

const COUNTS = {
  beginner: { vocab: 5, expressions: 3, questions: 3, tips: 2, minDialog: 6 },
  intermediate: { vocab: 6, expressions: 3, questions: 3, tips: 2, minDialog: 6 },
  advanced: { vocab: 6, expressions: 4, questions: 3, tips: 2, minDialog: 6 },
};

function loadJson(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const filePath = path.join(dataDir, filename);
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  cache.set(filename, parsed);
  return parsed;
}

function randomPick(list) {
  if (!list.length) return null;
  const idx = crypto.randomInt(0, list.length);
  return list[idx];
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickMany(list, count) {
  if (!list.length) return [];
  return shuffle(list).slice(0, Math.min(count, list.length));
}

function pickByCategoryAndLevel(list, category, level) {
  const exact = list.filter((item) => item.category === category && item.level === level);
  if (exact.length) return exact;
  const byCategory = list.filter((item) => item.category === category);
  if (byCategory.length) return byCategory;
  const byLevel = list.filter((item) => item.level === level);
  if (byLevel.length) return byLevel;
  return list;
}

function fillTemplate(template, replacements) {
  return template.replace(/\{(\w+)\}/g, (_match, key) => replacements[key] ?? "");
}

function getCounts(level) {
  return COUNTS[level] || COUNTS.beginner;
}

function buildLocalScript({ topic, level }) {
  const vocabList = loadJson("vocab.json");
  const phraseList = loadJson("phrases.json");
  const templates = loadJson("script_templates.json");
  const vocabPool = pickByCategoryAndLevel(vocabList, topic.category, level);
  const phrasePool = pickByCategoryAndLevel(phraseList, topic.category, level);
  const counts = getCounts(level);

  const vocab = pickMany(vocabPool, counts.vocab);
  const phrases = pickMany(phrasePool, counts.expressions);
  const topicTitle = topic.zh_title || topic.title;
  const templateSet = templates[level] || templates.beginner;

  const replacements = {
    topic_en: topic.title,
    topic_zh: topicTitle,
    word1: vocab[0]?.term || "",
    word2: vocab[1]?.term || "",
    word3: vocab[2]?.term || "",
    word4: vocab[3]?.term || "",
    word5: vocab[4]?.term || "",
    word6: vocab[5]?.term || "",
    phrase1: phrases[0]?.text || "",
    phrase2: phrases[1]?.text || "",
    phrase3: phrases[2]?.text || "",
    phrase4: phrases[3]?.text || "",
  };

  const intro = fillTemplate(randomPick(templateSet.intro), replacements);
  const dialogTemplate = randomPick(templateSet.dialogue) || [];
  let dialog = dialogTemplate.map((line) => fillTemplate(line, replacements)).filter(Boolean);

  if (dialog.length < counts.minDialog && Array.isArray(templateSet.dialogue_fallback)) {
    const extra = pickMany(templateSet.dialogue_fallback, counts.minDialog - dialog.length);
    dialog = dialog.concat(extra.map((line) => fillTemplate(line, replacements)));
  }

  const questions = pickMany(templateSet.questions || [], counts.questions).map((q) =>
    fillTemplate(q, replacements)
  );
  const tips = pickMany(templateSet.tips || [], counts.tips).map((tip) =>
    fillTemplate(tip, replacements)
  );

  return {
    title: topicTitle,
    intro,
    level,
    vocab,
    expressions: phrases,
    dialog,
    questions,
    tips,
  };
}

function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  };
}

function isValidScript(script, counts) {
  return (
    script &&
    typeof script.title === "string" &&
    typeof script.intro === "string" &&
    Array.isArray(script.vocab) &&
    Array.isArray(script.expressions) &&
    Array.isArray(script.dialog) &&
    Array.isArray(script.questions) &&
    Array.isArray(script.tips) &&
    script.dialog.length >= counts.minDialog &&
    script.questions.length >= counts.questions
  );
}

function buildGeminiPrompt({ topic, level, local, counts }) {
  const topicPrompt = topic.prompt_template
    ? `Topic prompt: ${topic.prompt_template}`
    : "Topic prompt: (none)";

  return [
    "You are a Mandarin Chinese lesson generator.",
    "Return ONLY valid JSON with keys: title, intro, level, vocab, expressions, dialog, questions, tips.",
    "Title should be Chinese only.",
    "Intro should be 1-2 sentences.",
    `Dialog must be ${counts.minDialog}-8 lines with A:/B: prefixes.`,
    `Vocab must be ${counts.vocab}-${counts.vocab + 2} items.`,
    `Expressions must be ${counts.expressions}-${counts.expressions + 1} items.`,
    `Questions must be ${counts.questions} items.`,
    `Tips must be ${counts.tips} items.`,
    'Each vocab item must be { "term": "...", "pinyin": "...", "meaning": "..." }.',
    'Each expression item must be { "text": "...", "pinyin": "...", "meaning": "..." }.',
    "Use natural, topic-relevant vocabulary. Avoid irrelevant pricing/shopping phrases unless the topic demands it.",
    `Topic (EN): ${topic.title}`,
    `Topic (ZH): ${topic.zh_title || topic.title}`,
    `Category: ${topic.category}`,
    `Level: ${level}`,
    topicPrompt,
    `Preferred vocab (use if relevant): ${local.vocab.map((v) => v.term).join(", ")}`,
    `Preferred expressions (use if relevant): ${local.expressions.map((p) => p.text).join(", ")}`,
  ].join("\n");
}

async function generateWithGemini({ topic, level, local, counts }) {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) return null;

  const prompt = buildGeminiPrompt({ topic, level, local, counts });
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    return null;
  }
}

export async function generateConversation({ topic, level }) {
  const counts = getCounts(level);
  const local = buildLocalScript({ topic, level });
  const llmScript = await generateWithGemini({ topic, level, local, counts });
  const script = isValidScript(llmScript, counts) ? llmScript : local;
  return { topic, script };
}
