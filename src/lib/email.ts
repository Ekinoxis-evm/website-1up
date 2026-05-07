import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "1UP Gaming Tower <noreply@1upesports.org>";
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? "";

// ── Token purchase ──────────────────────────────────────────────

export async function sendTokenOrderEmails(opts: {
  userEmail: string;
  userName: string;
  orderId: number;
  copAmount: number;
  tokenAmount: number;
  walletAddress: string;
  bankName: string;
}) {
  if (!ADMIN_EMAIL || !process.env.RESEND_API_KEY) return;

  const { userEmail, userName, orderId, copAmount, tokenAmount, walletAddress, bankName } = opts;
  const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(copAmount);

  await Promise.allSettled([
    // User
    resend.emails.send({
      from: FROM,
      to: userEmail,
      subject: `✅ Orden de compra $1UP #${orderId} recibida`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <div style="background:#e91e8c;height:4px"></div>
          <div style="padding:32px 24px">
            <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;margin:0 0 8px">
              Orden #${orderId} recibida
            </h1>
            <p style="color:#666;margin:0 0 24px">Hola ${userName}, recibimos tu comprobante de pago.</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Tokens</td>
                  <td style="padding:8px 0;font-weight:700;text-align:right">${tokenAmount.toLocaleString()} $1UP</td></tr>
              <tr><td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Monto COP</td>
                  <td style="padding:8px 0;font-weight:700;text-align:right">${cop}</td></tr>
              <tr><td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Banco</td>
                  <td style="padding:8px 0;text-align:right">${bankName}</td></tr>
              <tr><td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Wallet</td>
                  <td style="padding:8px 0;font-mono;font-size:11px;text-align:right">${walletAddress.slice(0,10)}…${walletAddress.slice(-6)}</td></tr>
            </table>
            <p style="color:#999;font-size:12px;margin-top:24px">
              El equipo revisará tu comprobante y enviará los tokens a tu wallet en máx. 24 horas hábiles.
            </p>
          </div>
          <div style="background:#111;padding:16px 24px">
            <p style="color:#666;font-size:11px;margin:0">1UP Gaming Tower · Colombia · 1upesports.org</p>
          </div>
        </div>
      `,
    }),
    // Admin
    resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `[Admin] Nueva orden $1UP #${orderId} — ${cop}`,
      html: `
        <p><strong>Orden #${orderId}</strong> de <strong>${userName}</strong> (${userEmail})</p>
        <p>${tokenAmount.toLocaleString()} $1UP · ${cop} · Banco: ${bankName}</p>
        <p>Wallet: <code>${walletAddress}</code></p>
        <p><a href="https://admin.1upesports.org/token-orders">Ver en admin →</a></p>
      `,
    }),
  ]);
}

// ── Pass purchase (token) ───────────────────────────────────────

export async function sendPassTokenEmails(opts: {
  userEmail: string;
  userName: string;
  orderId: number;
  tokenAmount: number;
  durationDays: number;
  expiresAt: string;
  txHash: string;
}) {
  if (!ADMIN_EMAIL || !process.env.RESEND_API_KEY) return;

  const { userEmail, userName, orderId, tokenAmount, durationDays, expiresAt, txHash } = opts;
  const expDate = new Date(expiresAt).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

  await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: userEmail,
      subject: `🎮 ¡Tu 1UP Pass está activo! Orden #${orderId}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <div style="background:#e91e8c;height:4px"></div>
          <div style="padding:32px 24px">
            <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;margin:0 0 8px">
              ¡1UP Pass Activado!
            </h1>
            <p style="color:#666;margin:0 0 24px">Hola ${userName}, tu pass está activo.</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Pagado</td>
                  <td style="padding:8px 0;font-weight:700;text-align:right">${tokenAmount.toLocaleString()} $1UP</td></tr>
              <tr><td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Duración</td>
                  <td style="padding:8px 0;text-align:right">${durationDays} días</td></tr>
              <tr><td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Vence</td>
                  <td style="padding:8px 0;font-weight:700;text-align:right">${expDate}</td></tr>
              <tr><td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">TX</td>
                  <td style="padding:8px 0;font-size:11px;text-align:right">
                    <a href="https://basescan.org/tx/${txHash}">${txHash.slice(0,10)}…${txHash.slice(-6)}</a>
                  </td></tr>
            </table>
          </div>
          <div style="background:#111;padding:16px 24px">
            <p style="color:#666;font-size:11px;margin:0">1UP Gaming Tower · Colombia · 1upesports.org</p>
          </div>
        </div>
      `,
    }),
    resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `[Admin] 1UP Pass vendido (token) #${orderId} — ${userName}`,
      html: `
        <p><strong>Pass #${orderId}</strong> comprado con $1UP por <strong>${userName}</strong> (${userEmail})</p>
        <p>${tokenAmount.toLocaleString()} $1UP · ${durationDays} días · vence ${expDate}</p>
        <p>TX: <a href="https://basescan.org/tx/${txHash}">${txHash}</a></p>
      `,
    }),
  ]);
}

// ── Pass purchase (bank transfer) ───────────────────────────────

export async function sendPassBankEmails(opts: {
  userEmail: string;
  userName: string;
  orderId: number;
  tokenAmount: number;
  durationDays: number;
  bankName: string;
}) {
  if (!ADMIN_EMAIL || !process.env.RESEND_API_KEY) return;

  const { userEmail, userName, orderId, tokenAmount, durationDays, bankName } = opts;

  await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: userEmail,
      subject: `⏳ Solicitud de 1UP Pass #${orderId} recibida`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <div style="background:#e91e8c;height:4px"></div>
          <div style="padding:32px 24px">
            <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;margin:0 0 8px">
              Solicitud recibida
            </h1>
            <p style="color:#666;margin:0 0 24px">Hola ${userName}, recibimos tu comprobante de transferencia.</p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Pass</td>
                  <td style="padding:8px 0;font-weight:700;text-align:right">${tokenAmount.toLocaleString()} $1UP · ${durationDays} días</td></tr>
              <tr><td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Banco</td>
                  <td style="padding:8px 0;text-align:right">${bankName}</td></tr>
            </table>
            <p style="color:#999;font-size:12px;margin-top:24px">
              El equipo revisará tu comprobante y activará tu pass en máx. 24 horas hábiles.
              Recibirás un correo de confirmación cuando esté activo.
            </p>
          </div>
          <div style="background:#111;padding:16px 24px">
            <p style="color:#666;font-size:11px;margin:0">1UP Gaming Tower · Colombia · 1upesports.org</p>
          </div>
        </div>
      `,
    }),
    resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `[Admin] Solicitud Pass (banco) #${orderId} — ${userName}`,
      html: `
        <p><strong>Pass #${orderId}</strong> solicitado vía banco por <strong>${userName}</strong> (${userEmail})</p>
        <p>${tokenAmount.toLocaleString()} $1UP · ${durationDays} días · Banco: ${bankName}</p>
        <p><a href="https://admin.1upesports.org/pass-bank-orders">Revisar en admin →</a></p>
      `,
    }),
  ]);
}
