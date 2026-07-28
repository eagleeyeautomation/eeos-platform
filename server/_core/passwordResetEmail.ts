import { Resend } from "resend";

export type PasswordResetEmailInput = {
  recipientEmail: string;
  resetUrl: string;
};

export type PasswordResetEmailResult =
  | {
      delivered: true;
      providerMessageId?: string;
    }
  | {
      delivered: false;
      reason: "configuration" | "provider";
    };

const SUBJECT = "Reset your EEOS password";

function configuredApplicationOrigin(): string | null {
  const configured = process.env.EEOS_APP_BASE_URL?.trim();
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.search
      || url.hash
      || (url.pathname !== "/" && url.pathname !== "")
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function buildPasswordResetUrl(rawToken: string): string | null {
  const origin = configuredApplicationOrigin();
  if (!origin || !rawToken) return null;

  const resetUrl = new URL("/reset-password", origin);
  resetUrl.searchParams.set("token", rawToken);
  return resetUrl.toString();
}

function isConfiguredResetUrl(value: string): boolean {
  const origin = configuredApplicationOrigin();
  if (!origin) return false;

  try {
    const url = new URL(value);
    return (
      url.origin === origin
      && url.pathname === "/reset-password"
      && url.hash === ""
      && url.searchParams.size === 1
      && Boolean(url.searchParams.get("token"))
    );
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function htmlContent(resetUrl: string): string {
  const safeResetUrl = escapeHtml(resetUrl);
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0B0B0B;color:#FFFFFF;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
      <div style="border:1px solid rgba(201,162,39,.35);border-radius:16px;background:#111827;padding:32px;">
        <p style="margin:0 0 12px;color:#C9A227;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">EEOS Secure Access</p>
        <h1 style="margin:0 0 20px;color:#FFFFFF;font-size:26px;">Reset your EEOS password</h1>
        <p style="margin:0 0 20px;color:#D1D5DB;line-height:1.6;">A password-reset request was received for your EEOS account.</p>
        <p style="margin:0 0 24px;">
          <a href="${safeResetUrl}" style="display:inline-block;border-radius:10px;background:#C9A227;color:#0B0B0B;padding:13px 20px;font-weight:700;text-decoration:none;">Reset EEOS Password</a>
        </p>
        <p style="margin:0 0 12px;color:#D1D5DB;line-height:1.6;">This secure link expires in one hour and can be used only once.</p>
        <p style="margin:0;color:#9CA3AF;line-height:1.6;">If you did not request this reset, you can safely ignore this email.</p>
      </div>
    </div>
  </body>
</html>`;
}

function textContent(resetUrl: string): string {
  return [
    "Reset your EEOS password",
    "",
    "A password-reset request was received for your EEOS account.",
    "",
    `Secure reset link: ${resetUrl}`,
    "",
    "This link expires in one hour and can be used only once.",
    "If you did not request this reset, you can safely ignore this email.",
  ].join("\n");
}

export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput,
): Promise<PasswordResetEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EEOS_PASSWORD_RESET_FROM?.trim();
  if (!apiKey || !from || !input.recipientEmail || !isConfiguredResetUrl(input.resetUrl)) {
    return { delivered: false, reason: "configuration" };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.recipientEmail,
      subject: SUBJECT,
      html: htmlContent(input.resetUrl),
      text: textContent(input.resetUrl),
    });

    if (error) return { delivered: false, reason: "provider" };
    return {
      delivered: true,
      ...(data?.id ? { providerMessageId: data.id } : {}),
    };
  } catch {
    return { delivered: false, reason: "provider" };
  }
}
