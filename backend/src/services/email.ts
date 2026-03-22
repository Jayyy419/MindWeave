import nodemailer, { SendMailOptions, Transporter } from "nodemailer";
import { createHash } from "crypto";

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

let cachedTransporter: Transporter | null = null;
let smtpVerified = false;

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "MindWeave <no-reply@mindweave.app>";

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing (SMTP_HOST, SMTP_USER, SMTP_PASS)");
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid positive integer");
  }

  return { host, port, user, pass, from };
}

function getTransporter(): Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getSmtpConfig();
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
}

function maskRecipient(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 12);
}

export async function verifySmtpConnection(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    smtpVerified = true;
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown SMTP verification error";
    smtpVerified = false;
    return { ok: false, reason };
  }
}

export function getSmtpStatus(): { configured: boolean; verified: boolean } {
  try {
    getSmtpConfig();
    return { configured: true, verified: smtpVerified };
  } catch {
    return { configured: false, verified: false };
  }
}

export async function sendTrackedEmail(
  payload: Omit<SendMailOptions, "from"> & { to: string },
  context: { purpose: "password-reset" | "email-otp" }
): Promise<void> {
  const config = getSmtpConfig();
  const transporter = getTransporter();
  const recipientFingerprint = maskRecipient(payload.to);

  const info = await transporter.sendMail({
    ...payload,
    from: config.from,
  });

  console.log("[email] delivery", {
    purpose: context.purpose,
    recipient: recipientFingerprint,
    messageId: info.messageId,
    accepted: info.accepted.length,
    rejected: info.rejected.length,
    response: info.response,
  });
}
