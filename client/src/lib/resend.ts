import { Resend } from "resend";

export const resend = new Resend(process.env.AUTH_RESEND_KEY);

export async function sendOTPEmail(to: string, code: string) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    to,
    subject: "Your Keyring sign-in code",
    html: `
      <div style="font-family: monospace; background: #07070d; color: #f0ede8; padding: 40px; border-radius: 12px; max-width: 420px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 28px;">
          <span style="font-size: 20px;">🔑</span>
          <span style="font-size: 18px; font-weight: 700; color: #f0ede8;">Keyring</span>
        </div>
        <p style="color: #7a7985; margin: 0 0 16px;">Your sign-in code:</p>
        <div style="letter-spacing: 0.4em; font-size: 36px; font-weight: 800; color: #e8a835; margin: 0 0 24px;">${code}</div>
        <p style="color: #7a7985; font-size: 13px; margin: 0;">
          Expires in <strong style="color: #f0ede8;">10 minutes</strong>.
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}
