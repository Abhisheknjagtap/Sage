import { Resend } from "resend";

// Lazy-initialized so missing env vars don't crash the build
function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://companion.app";
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "companion <noreply@companion.app>";

export async function sendNudgeEmail(
  email: string,
  name: string,
  message: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A quiet check-in</title>
</head>
<body style="margin:0;padding:0;background-color:#F9F6F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="480" style="max-width:480px;width:100%;" cellspacing="0" cellpadding="0" border="0">

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:16px;padding:40px 36px;">

              <!-- Wordmark -->
              <p style="margin:0 0 32px;font-size:13px;font-weight:500;letter-spacing:0.04em;color:#8C8680;text-transform:lowercase;">
                companion
              </p>

              <!-- Message -->
              <p style="margin:0 0 32px;font-size:16px;line-height:1.65;color:#2A2825;">
                ${escapeHtml(message)}
              </p>

              <!-- CTA -->
              <a
                href="${APP_URL}/dashboard"
                style="display:inline-block;padding:11px 22px;background-color:#C9915A;color:#FFFFFF;text-decoration:none;border-radius:10px;font-size:14px;font-weight:500;"
              >
                Open the app &rarr;
              </a>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 4px 0;">
              <p style="margin:0;font-size:12px;color:#8C8680;line-height:1.5;">
                You can turn these off in your
                <a href="${APP_URL}/profile" style="color:#8C8680;text-decoration:underline;">settings</a>
                anytime.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `${name}, a quiet check-in`,
    html,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
