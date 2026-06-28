import nodemailer from "nodemailer";

// Alert email delivery. Two transports, picked automatically:
//   1. Resend HTTP API when RESEND_API_KEY is set
//   2. Plain SMTP via nodemailer when SMTP_HOST + SMTP_USER + SMTP_PASS are set
// Failures log and return null so the caller can still record the AlertEvent.

export type EmailProvider = "resend" | "smtp";

export function activeEmailProvider(): EmailProvider | null {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  return null;
}

function fromAddress() {
  return process.env.ALERT_EMAIL_FROM ?? process.env.SMTP_USER ?? "Fasmetri <alerts@fasmetri.ge>";
}

export async function sendAlertEmail(to: string, subject: string, html: string): Promise<EmailProvider | null> {
  const provider = activeEmailProvider();
  if (!provider) return null;
  const sent = provider === "resend" ? await sendViaResend(to, subject, html) : await sendViaSmtp(to, subject, html);
  return sent ? provider : null;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to: [to], subject, html }),
    });
    if (!response.ok) {
      console.error(`[alerts] Resend send failed (${response.status}): ${(await response.text().catch(() => "")).slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[alerts] Resend send failed:", error);
    return false;
  }
}

async function sendViaSmtp(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: fromAddress(), to, subject, html });
    return true;
  } catch (error) {
    console.error("[alerts] SMTP send failed:", error);
    return false;
  }
}

export function priceDropEmailHtml(params: {
  productName: string;
  productUrl: string;
  shopName: string;
  oldPrice: number;
  newPrice: number;
  savingPercent: number;
  unsubscribeUrl: string;
}) {
  const { productName, productUrl, shopName, oldPrice, newPrice, savingPercent, unsubscribeUrl } = params;
  const name = escapeHtml(productName);
  const shop = escapeHtml(shopName);
  return `<!doctype html>
<html lang="ka">
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
          <tr>
            <td style="background:#0a0a0a;padding:20px 28px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;">ფასმეტრი</span>
              <span style="color:#94a3b8;font-size:13px;margin-left:8px;">ფასის შეტყობინება</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 8px;font-size:20px;color:#0a0a0a;">ფასი დაიკლო 🎉</h1>
              <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.5;">${name}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                <tr>
                  <td style="font-size:16px;color:#94a3b8;text-decoration:line-through;padding-right:12px;">${oldPrice.toFixed(2)} ₾</td>
                  <td style="font-size:24px;font-weight:700;color:#0a0a0a;padding-right:12px;">${newPrice.toFixed(2)} ₾</td>
                  <td><span style="display:inline-block;background:#0a0a0a;color:#ffffff;font-size:13px;font-weight:600;border-radius:999px;padding:4px 10px;">-${savingPercent.toFixed(0)}%</span></td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:14px;color:#64748b;">საუკეთესო ფასი ამჟამად: <strong style="color:#0a0a0a;">${shop}</strong></p>
              <a href="${productUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;padding:12px 24px;">ფასების შედარება ფასმეტრზე</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                ეს შეტყობინება მოგივიდა, რადგან ამ პროდუქტზე ფასის შეტყობინება გაქვს გამოწერილი.
                <a href="${unsubscribeUrl}" style="color:#64748b;">გამოწერის გაუქმება</a>
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
