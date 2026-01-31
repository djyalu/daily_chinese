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
  const raw = fs.readFileSync(filePath, "utf8");
  const cleaned = raw.replace(/^\uFEFF/, "");
  const parsed = JSON.parse(cleaned);
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
  const topicVocab = loadJson("topic_vocab.json");
  const templates = loadJson("script_templates.json");
  // build index from vocabList for enrichment (term -> {term,pinyin,meaning,...})
  const vocabIndex = new Map((vocabList || []).map((v) => [v.term, v]));
  // Prefer vocab from data/topic_vocab.json: byId -> byCategory -> default[level]
  let vocabPool = [];
  try {
    const byId = topicVocab.byId || {};
    const byCategory = topicVocab.byCategory || {};
    const defaults = topicVocab.default || {};

    const normalize = (t) => {
      if (!t) return null;
      if (typeof t === "string") {
        const found = vocabIndex.get(t);
        return found ? found : { term: t, pinyin: "", meaning: "" };
      }
      if (typeof t === "object") {
        // already structured {term,pinyin,meaning} or similar
        return {
          term: t.term || t.text || "",
          pinyin: t.pinyin || "",
          meaning: t.meaning || "",
          category: t.category,
          level: t.level,
        };
      }
      return null;
    };

    if (byId[topic.id] && Array.isArray(byId[topic.id][level])) {
      vocabPool = byId[topic.id][level].map(normalize).filter(Boolean);
    } else if (byCategory[topic.category] && Array.isArray(byCategory[topic.category][level])) {
      vocabPool = byCategory[topic.category][level].map(normalize).filter(Boolean);
    } else if (Array.isArray(defaults[level])) {
      vocabPool = defaults[level].map(normalize).filter(Boolean);
    }
  } catch (e) {
    vocabPool = [];
  }

  // Fallback to legacy structured vocab.json if topic_vocab didn't provide usable items
  if (!vocabPool || vocabPool.length === 0) {
    vocabPool = pickByCategoryAndLevel(vocabList, topic.category, level);
  }
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

function buildGeminiPrompt({ topic, level, local, counts, language }) {
  const langMap = {
    "zh-CN": "Mandarin Chinese",
    "ja-JP": "Japanese",
    "es-ES": "Spanish",
  };
  const targetLang = langMap[language] || "Mandarin Chinese";

  const pronunciationLabel = language === "ja-JP" ? "Reading/Furigana" : (language === "zh-CN" ? "Pinyin" : "Pronunciation (if applicable)");

  const topicPrompt = topic.prompt_template
    ? `Topic prompt: ${topic.prompt_template}`
    : "Topic prompt: (none)";

  const promptLines = [
    `You are a expert ${targetLang} language teacher and lesson generator.`,
    "Return ONLY valid JSON with the exact following structure:",
    "{",
    '  "title": "Topic in target language",',
    '  "intro": "1-2 sentence introduction in English",',
    '  "level": "beginner|intermediate|advanced",',
    '  "vocab": [{ "term": "word", "pinyin": "pronunciation", "meaning": "translation" }],',
    '  "expressions": [{ "text": "phrase", "pinyin": "pronunciation", "meaning": "translation" }],',
    '  "dialog": ["Speaker A: ...", "Speaker B: ..."],',
    '  "questions": ["Question 1", "Question 2"],',
    '  "tips": ["Grammar/Culture Tip 1", "Tip 2"]',
    "}",
    `The 'title' must be in ${targetLang} only.`,
    `The 'dialog' must be exactly ${counts.minDialog} lines with A:/B: prefixes, written in ${targetLang}.`,
    `Vocab must be exactly ${counts.vocab} items.`,
    `Expressions must be exactly ${counts.expressions} items.`,
    `Questions must be exactly ${counts.questions} items (in English, about the content).`,
    `Tips must be exactly ${counts.tips} items (in English, about ${targetLang}).`,
    `In the 'pinyin' field, provide the ${pronunciationLabel}.`,
  ];

  if (language === "es-ES") {
    promptLines.push("For Spanish, 'pinyin' should be a phonetic transcription or pronunciation guide if the word's pronunciation is not obvious from its spelling.");
  }

  promptLines.push(
    `Topic (EN): ${topic.title}`,
    `Topic (Target Content): ${topic.title} in ${targetLang}`,
    `Category: ${topic.category}`,
    `Level: ${level}`,
    topicPrompt,
  );

  if (language === "zh-CN") {
    promptLines.push(`Preferred vocab: ${local.vocab.map((v) => v.term).join(", ")}`);
    promptLines.push(`Preferred expressions: ${local.expressions.map((p) => p.text).join(", ")}`);
  }

  return promptLines.join("\n");
}

async function generateWithGemini({ topic, level, local, counts, language }, retryCount = 0) {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    return null;
  }

  const prompt = buildGeminiPrompt({ topic, level, local, counts, language });
  try {
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
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (response.status === 429 && retryCount < 3) {
      const waitTime = (retryCount + 1) * 5000;
      console.warn(`Rate limit hit (429). Retrying in ${waitTime / 1000}s... (Attempt ${retryCount + 1})`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return generateWithGemini({ topic, level, local, counts, language }, retryCount + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn("Gemini API response did not contain text content.");
      return null;
    }

    return JSON.parse(text);
  } catch (err) {
    console.error("Error during Gemini generation or JSON parsing:", err);
    return null;
  }
}

export async function generateConversation({ topic, level, language = "zh-CN" }) {
  const counts = getCounts(level);

  // Local fallback works primarily for Chinese for now.
  // For other languages, we rely on Gemini first, or a minimal empty structure if fails.
  const local = language === "zh-CN" ? buildLocalScript({ topic, level }) : {
    title: topic.title,
    intro: `A lesson about ${topic.title}.`,
    level,
    vocab: [],
    expressions: [],
    dialog: [],
    questions: [],
    tips: []
  };

  let llmScript = await generateWithGemini({ topic, level, local, counts, language });

  // Basic validation
  if (llmScript && isValidScript(llmScript, counts)) {
    return { topic, script: llmScript };
  }

  console.warn(`LLM failed for ${language}, falling back to ${language === "zh-CN" ? "local" : "minimal"} script`);
  return { topic, script: (language === "zh-CN" ? local : llmScript || local) };
}
