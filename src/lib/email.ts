import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM ?? "Product Team <noreply@flavidairysolution.com>";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function getAppBaseUrl() {
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(payload: EmailPayload) {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY is not configured. Email would have been sent:",
      payload
    );
    return;
  }

  try {
    await resend.emails.send({
      from: emailFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
  } catch (error) {
    console.error("[email] Failed to send email via Resend:", {
      payload,
      error,
    });
    throw error;
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${getAppBaseUrl()}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your email address",
    html: `
      <h2>Verify your account</h2>
      <p>Click the button below to verify your email.</p>
      <p><a href="${verificationUrl}">Verify email</a></p>
      <p>If the button above does not work, copy and paste this URL into your browser:</p>
      <p>${verificationUrl}</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your password",
    html: `
      <h2>Reset your password</h2>
      <p>We received a request to reset the password on your account.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>${resetUrl}</p>
    `,
  });
}

