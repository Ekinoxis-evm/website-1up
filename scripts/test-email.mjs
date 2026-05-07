// Quick smoke test — run with: node scripts/test-email.mjs
// Requires RESEND_API_KEY and ADMIN_NOTIFICATION_EMAIL in .env.local

import { readFileSync } from "fs";
import { resolve } from "path";

// Parse .env.local manually
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const RESEND_API_KEY = env.RESEND_API_KEY;
const ADMIN_EMAIL    = env.ADMIN_NOTIFICATION_EMAIL;

if (!RESEND_API_KEY || RESEND_API_KEY.includes("PASTE")) {
  console.error("❌  RESEND_API_KEY not set in .env.local");
  process.exit(1);
}

console.log(`Sending test email to: ${ADMIN_EMAIL}`);

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "1UP Gaming Tower <noreply@1upesports.org>",
    to: ADMIN_EMAIL,
    subject: "[TEST] Email de notificaciones 1UP Gaming Tower ✅",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:#e91e8c;height:4px"></div>
        <div style="padding:32px 24px">
          <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;margin:0 0 8px">
            ✅ Email funcionando
          </h1>
          <p style="color:#666">
            Las notificaciones de 1UP Gaming Tower están configuradas correctamente.<br/>
            Este correo llegará a <strong>${ADMIN_EMAIL}</strong> cada vez que:<br/>
          </p>
          <ul style="color:#444;margin-top:12px">
            <li>Un usuario crea una orden de compra de $1UP tokens</li>
            <li>Un usuario compra un 1UP Pass con tokens</li>
            <li>Un usuario solicita un 1UP Pass vía transferencia bancaria</li>
          </ul>
        </div>
        <div style="background:#111;padding:16px 24px">
          <p style="color:#666;font-size:11px;margin:0">1UP Gaming Tower · Colombia · 1upesports.org</p>
        </div>
      </div>
    `,
  }),
});

const data = await res.json();

if (res.ok) {
  console.log("✅  Email enviado! ID:", data.id);
  console.log("    Revisa la bandeja de:", ADMIN_EMAIL);
} else {
  console.error("❌  Error:", data);
  if (data.statusCode === 403 || data.message?.includes("domain")) {
    console.error("\n⚠️   El dominio '1upesports.org' probablemente no está verificado en Resend.");
    console.error("    Dashboard: https://resend.com/domains");
  }
}
