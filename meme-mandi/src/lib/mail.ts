import nodemailer from "nodemailer";
import { ApiError } from "./http";
export async function sendCode(
  email: string,
  code: string,
  purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
) {
  const subject =
    purpose === "VERIFY_EMAIL" ? "Your memeT verification code" : "Reset your memeT password";
  const text = `${subject}\n\nYour code is ${code}. It expires in 10 minutes. Never share it.\n\nIf you didn't request this, you can ignore this email.\nmemeT`;
  const from = process.env.MAIL_FROM;
  const provider = process.env.MAIL_PROVIDER;
  if (provider === "local" && process.env.NODE_ENV !== "production") {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { randomUUID } = await import("node:crypto");
    const directory = join(process.cwd(), ".local-mail");
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, `${Date.now()}-${randomUUID()}.json`),
      JSON.stringify({ to: email, subject, text, code, purpose }, null, 2),
    );
    return;
  }
  if (!from)
    throw new ApiError(503, "Email delivery is not configured yet. Please try again later.");
  if (provider === "resend" && process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [email], subject, text }),
    });
    if (!response.ok)
      throw new ApiError(503, "Email delivery is temporarily unavailable. Please try again later.");
    return;
  }
  if (provider === "smtp" && process.env.SMTP_HOST && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT || 465);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 15000,
      socketTimeout: 15000,
    });
    try {
      await transport.sendMail({ from, to: email, subject, text });
    } catch {
      throw new ApiError(503, "Email delivery is temporarily unavailable. Please try again later.");
    }
    return;
  }
  throw new ApiError(503, "Email delivery is not configured yet. Please try again later.");
}
