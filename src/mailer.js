import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
}

export async function sendMail({ to, subject, html }) {
  const from = process.env.MAIL_FROM || "Daily Chinese <no-reply@example.com>";
  const transport = getTransport();

  if (!transport) {
    console.log("[MAIL] No SMTP configured. Printing email instead:");
    console.log({ to, from, subject });
    console.log(html);
    return { status: "printed" };
  }

  await transport.sendMail({ from, to, subject, html });
  return { status: "sent" };
}