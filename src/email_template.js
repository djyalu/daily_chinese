export function renderEmail({ subscriber, script }) {
  const { title, intro, vocab, expressions, dialog, questions, tips } = script;

  const vocabHtml = (vocab || [])
    .map((v) => {
      if (!v) return "";
      if (typeof v === "string") return `<li>${v}</li>`;
      const term = v.term || "";
      const pinyin = v.pinyin ? ` (${v.pinyin})` : "";
      const meaning = v.meaning ? ` — ${v.meaning}` : "";
      return `<li><strong>${term}</strong>${pinyin}${meaning}</li>`;
    })
    .join("");
  const expressionHtml = (expressions || [])
    .map((p) => {
      if (!p) return "";
      const text = p.text || p;
      const pinyin = p.pinyin ? ` (${p.pinyin})` : "";
      const meaning = p.meaning ? ` — ${p.meaning}` : "";
      return `<li><strong>${text}</strong>${pinyin}${meaning}</li>`;
    })
    .join("");
  const dialogHtml = dialog.map((line) => `<p>${line}</p>`).join("");
  const questionHtml = questions.map((q) => `<li>${q}</li>`).join("");
  const tipsHtml = (tips || []).map((t) => `<li>${t}</li>`).join("");

  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>${title}</h2>
    <p>${intro}</p>

    <h3>Vocabulary</h3>
    <ul>${vocabHtml}</ul>

    ${expressionHtml ? `<h3>Expressions</h3><ul>${expressionHtml}</ul>` : ""}

    <h3>Dialogue</h3>
    ${dialogHtml}

    <h3>Questions</h3>
    <ul>${questionHtml}</ul>

    ${tipsHtml ? `<h3>Tips</h3><ul>${tipsHtml}</ul>` : ""}

    <hr />
    <p style="font-size: 12px; color: #666;">You are receiving this email because you subscribed with ${subscriber.email}.</p>
  </div>
  `;
}
