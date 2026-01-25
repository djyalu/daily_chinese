export function renderEmail({ subscriber, script }) {
  const { title, intro, vocab, dialog, questions } = script;

  const vocabHtml = vocab.map((v) => `<li>${v}</li>`).join("");
  const dialogHtml = dialog.map((line) => `<p>${line}</p>`).join("");
  const questionHtml = questions.map((q) => `<li>${q}</li>`).join("");

  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>${title}</h2>
    <p>${intro}</p>

    <h3>Vocabulary</h3>
    <ul>${vocabHtml}</ul>

    <h3>Dialogue</h3>
    ${dialogHtml}

    <h3>Questions</h3>
    <ul>${questionHtml}</ul>

    <hr />
    <p style="font-size: 12px; color: #666;">You are receiving this email because you subscribed with ${subscriber.email}.</p>
  </div>
  `;
}