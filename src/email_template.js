export function renderEmail({ subscriber, script, logId }) {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const copyUrl = `${baseUrl}/copy/${logId}`;
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

  const copyText = `
${title}
${intro}

[Vocabulary]
${(vocab || []).map((v) => `${v.term}${v.pinyin ? ` (${v.pinyin})` : ""} - ${v.meaning || ""}`).join("\n")}

${expressionHtml ? `[Expressions]\n${(expressions || []).map((p) => `${p.text || p}${p.pinyin ? ` (${p.pinyin})` : ""} - ${p.meaning || ""}`).join("\n")}` : ""}

[Dialogue]
${dialog.join("\n")}

[Questions]
${questions.join("\n")}

${tipsHtml ? `[Tips]\n${(tips || []).join("\n")}` : ""}
`.trim();

  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px;">${title}</h2>
    <p style="font-style: italic; color: #555;">${intro}</p>

    <h3 style="background: #f8f9fa; padding: 5px 10px; border-left: 4px solid #3498db;">Vocabulary</h3>
    <ul style="list-style: none; padding-left: 0;">${vocabHtml}</ul>

    ${expressionHtml ? `<h3 style="background: #f8f9fa; padding: 5px 10px; border-left: 4px solid #e67e22;">Expressions</h3><ul style="list-style: none; padding-left: 0;">${expressionHtml}</ul>` : ""}

    <h3 style="background: #f8f9fa; padding: 5px 10px; border-left: 4px solid #2ecc71;">Dialogue</h3>
    <div style="background: #fdfdfd; padding: 10px; border: 1px solid #eee; border-radius: 5px;">${dialogHtml}</div>

    <h3 style="background: #f8f9fa; padding: 5px 10px; border-left: 4px solid #9b59b6;">Questions</h3>
    <ul>${questionHtml}</ul>

    ${tipsHtml ? `<h3 style="background: #f8f9fa; padding: 5px 10px; border-left: 4px solid #f1c40f;">Tips</h3><ul>${tipsHtml}</ul>` : ""}

    <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
      <div style="margin-bottom: 25px;">
        <a href="${copyUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 30px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block;">📋 전체 학습내용 복사하기</a>
        <p style="font-size: 11px; color: #999; margin-top: 8px;">(클릭 시 브라우저에서 자동으로 클립보드에 복사됩니다)</p>
      </div>

      <p style="font-size: 14px; color: #666; margin-bottom: 15px;">🤖 Continue studying with AI:</p>
      <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
        <a href="https://www.perplexity.ai/search?q=${encodeURIComponent(`Please analyze this lesson and give me more practice sentences:\n\n${copyText}`)}" 
           style="background-color: #20b2aa; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-size: 13px; font-weight: bold; margin: 5px;">Perplexity</a>
        
        <a href="https://chatgpt.com/?q=${encodeURIComponent(`I just learned this lesson. Can we practice a similar dialogue?\n\n${copyText}`)}" 
           style="background-color: #10a37f; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-size: 13px; font-weight: bold; margin: 5px;">ChatGPT</a>
        
        <a href="https://gemini.google.com/app?q=${encodeURIComponent(`Explain the grammar points in this lesson in detail:\n\n${copyText}`)}" 
           style="background-color: #4285f4; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-size: 13px; font-weight: bold; margin: 5px;">Gemini</a>
      </div>
    </div>

    <div style="margin-top: 40px; padding: 20px; background-color: #f8f9fa; border: 1px solid #e1e4e8; border-radius: 8px;">
      <h4 style="margin-top: 0; color: #2c3e50; font-size: 14px; border-bottom: 1px solid #e1e4e8; padding-bottom: 8px;">📑 학습 텍스트 (수동 복사용)</h4>
      <div style="
        -webkit-user-select: all; 
        -moz-user-select: all; 
        -ms-user-select: all; 
        user-select: all; 
        white-space: pre-wrap; 
        font-family: 'Courier New', Courier, monospace; 
        font-size: 13px; 
        color: #444; 
        background: white; 
        padding: 15px; 
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
      ">${copyText}</div>
    </div>

    <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;" />
    <p style="font-size: 12px; color: #999; text-align: center;">You are receiving this email because you subscribed with ${subscriber.email}.</p>
  </div>
  `;
}
