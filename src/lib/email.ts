import { Resend } from "resend";
import { buildIcsContent } from "@/lib/calendar";

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

// ── Tournament registration ─────────────────────────────────────

type TournamentPrizeRow = {
  position:      number;
  prize_type:    string;
  amount_tokens: number | null;
  amount_cop:    number | null;
};

function formatPrizeText(p: TournamentPrizeRow): string {
  if (p.prize_type === "tokens" && p.amount_tokens)
    return `${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`;
  if (p.prize_type === "cop" && p.amount_cop)
    return `$${p.amount_cop.toLocaleString("es-CO")} COP`;
  if (p.prize_type === "both") {
    const parts: string[] = [];
    if (p.amount_tokens) parts.push(`${Number(p.amount_tokens).toLocaleString("es-CO")} $1UP`);
    if (p.amount_cop)    parts.push(`$${p.amount_cop.toLocaleString("es-CO")} COP`);
    return parts.join(" + ");
  }
  return "";
}

const PRIZE_MEDAL = ["", "🥇", "🥈", "🥉"];
const PRIZE_LABEL = ["", "1er lugar", "2do lugar", "3er lugar"];

export async function sendTournamentRegistrationEmail(opts: {
  userEmail:         string;
  userName:          string;
  tournamentName:    string;
  tournamentDate:    string | null;
  locationType:      string;
  googleCalendarUrl: string;
  gameName?:         string | null;
  description?:      string | null;
  prizes?:           TournamentPrizeRow[];
  tournamentUrl?:    string;
  registrantEmail?:  string;
  registrantName?:   string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const {
    userEmail, userName, tournamentName, tournamentDate, locationType,
    googleCalendarUrl, gameName, description, prizes = [], tournamentUrl,
  } = opts;

  const dateStr = tournamentDate
    ? new Date(tournamentDate).toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    : "Por confirmar";
  const timeStr = tournamentDate
    ? new Date(tournamentDate).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    : "";

  const locLabel: Record<string, string> = { presencial: "Presencial — 1UP Gaming Tower, Cali", online: "Online", mixto: "Mixto (presencial + online)" };

  const sortedPrizes = [...prizes].sort((a, b) => a.position - b.position);

  const prizesHtml = sortedPrizes.length > 0
    ? `
      <div style="margin-top:24px">
        <p style="color:#999;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px">Premios</p>
        <table style="width:100%;border-collapse:collapse">
          ${sortedPrizes.map((p) => `
            <tr>
              <td style="padding:6px 0;font-size:20px;width:32px">${PRIZE_MEDAL[p.position] ?? p.position}</td>
              <td style="padding:6px 0;color:#999;font-size:12px;text-transform:uppercase">${PRIZE_LABEL[p.position] ?? `Posición ${p.position}`}</td>
              <td style="padding:6px 0;font-weight:700;text-align:right;font-size:14px">${formatPrizeText(p)}</td>
            </tr>
          `).join("")}
        </table>
      </div>`
    : "";

  const descriptionHtml = description
    ? `<div style="margin-top:20px;padding:16px;background:#f5f5f5">
        <p style="color:#999;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px">Sobre el torneo</p>
        <p style="color:#444;font-size:13px;line-height:1.6;margin:0;white-space:pre-line">${description}</p>
       </div>`
    : "";

  // Build ICS attachment so every email client shows "Add to Calendar"
  const icsAttachment = tournamentDate ? [{
    filename: `${tournamentName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.ics`,
    content:  Buffer.from(buildIcsContent({
      name:        tournamentName,
      date:        tournamentDate,
      location:    locationType === "online" ? "Online" : "1UP Gaming Tower, Cali, Colombia",
      description: description ?? `Torneo ${tournamentName} — 1UP Gaming Tower`,
    })),
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
  }] : [];

  await Promise.allSettled([
    // ── User confirmation
    resend.emails.send({
      from:        FROM,
      to:          userEmail,
      subject:     `✅ Inscripción confirmada — ${tournamentName}`,
      attachments: icsAttachment,
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:0 auto">
          <div style="background:#e91e8c;height:4px"></div>
          <div style="padding:32px 24px">
            <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;margin:0 0 4px">¡Estás inscrito!</h1>
            <p style="color:#666;margin:0 0 24px">Hola ${userName}, tu inscripción ha sido confirmada.</p>

            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase;width:40%">Torneo</td>
                <td style="padding:8px 0;font-weight:700;text-align:right">${tournamentName}</td>
              </tr>
              ${gameName ? `<tr>
                <td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Juego</td>
                <td style="padding:8px 0;text-align:right">${gameName}</td>
              </tr>` : ""}
              <tr>
                <td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Fecha</td>
                <td style="padding:8px 0;text-align:right">${dateStr}${timeStr ? ` · ${timeStr}` : ""}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#999;font-size:12px;text-transform:uppercase">Modalidad</td>
                <td style="padding:8px 0;text-align:right">${locLabel[locationType] ?? locationType}</td>
              </tr>
            </table>

            ${prizesHtml}
            ${descriptionHtml}

            <div style="margin-top:28px;display:flex;gap:12px;flex-wrap:wrap">
              ${tournamentUrl ? `<a href="${tournamentUrl}"
                style="display:inline-block;background:#111;color:#fff;font-weight:900;text-transform:uppercase;padding:12px 20px;text-decoration:none;font-size:12px;letter-spacing:1px;margin-right:10px">
                VER TORNEO →
              </a>` : ""}
              ${googleCalendarUrl ? `<a href="${googleCalendarUrl}"
                style="display:inline-block;background:#e91e8c;color:#fff;font-weight:900;text-transform:uppercase;padding:12px 20px;text-decoration:none;font-size:12px;letter-spacing:1px">
                + GOOGLE CALENDAR
              </a>` : ""}
            </div>

            <p style="color:#999;font-size:12px;margin-top:28px">
              Estaremos en contacto con los detalles finales del torneo. ¡Mucha suerte!
            </p>
          </div>
          <div style="background:#111;padding:16px 24px">
            <p style="color:#666;font-size:11px;margin:0">1UP Gaming Tower · Colombia · 1upesports.org</p>
          </div>
        </div>
      `,
    }),

    // ── Admin notification
    ...(ADMIN_EMAIL ? [resend.emails.send({
      from:    FROM,
      to:      ADMIN_EMAIL,
      subject: `[Torneo] Nueva inscripción: ${tournamentName} — ${userName}`,
      html: `
        <p><strong>${userName}</strong> (${userEmail}) se inscribió en <strong>${tournamentName}</strong>.</p>
        <p>Fecha: ${dateStr}${timeStr ? ` ${timeStr}` : ""}${gameName ? ` · Juego: ${gameName}` : ""}</p>
        <p><a href="https://admin.1upesports.org/tournament-registrations">Ver inscripciones →</a></p>
      `,
    })] : []),
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
