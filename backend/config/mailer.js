import dotenv from "dotenv";
dotenv.config();

// EMAIL_DRIVER: "smtp" (por defecto, Gmail con Nodemailer) | "resend" | "brevo"
// Render (plan gratuito) y Railway (Free/Trial/Hobby) bloquean el SMTP: en producción usa una API HTTPS.
const driver = (process.env.EMAIL_DRIVER || "smtp").toLowerCase();

// '"Nombre" <correo@dominio>' → { name, email }
function parseFrom(from) {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from || "");
  return m ? { name: m[1].trim(), email: m[2].trim() } : { name: "", email: String(from || "").trim() };
}

const toArray = (v) => (Array.isArray(v) ? v : [v]);

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detalle = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`${driver} respondió ${res.status}: ${detalle}`);
  }
  return res.json().catch(() => ({}));
}

let transporter;

if (driver === "resend") {
  if (!process.env.RESEND_API_KEY) console.error("EMAIL_DRIVER=resend requiere RESEND_API_KEY.");
  else console.log("Correo: Resend (API HTTPS)");
  transporter = {
    sendMail: ({ from, to, subject, html, replyTo }) => {
      const { name, email } = parseFrom(from);
      return postJson(
        "https://api.resend.com/emails",
        { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        {
          from: name ? `${name} <${email}>` : email,
          to: toArray(to),
          subject,
          html,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }
      );
    },
  };
} else if (driver === "brevo") {
  if (!process.env.BREVO_API_KEY) console.error("EMAIL_DRIVER=brevo requiere BREVO_API_KEY.");
  else console.log("Correo: Brevo (API HTTPS)");
  transporter = {
    sendMail: ({ from, to, subject, html, replyTo }) => {
      const { name, email } = parseFrom(from);
      return postJson(
        "https://api.brevo.com/v3/smtp/email",
        { "api-key": process.env.BREVO_API_KEY },
        {
          sender: { ...(name ? { name } : {}), email },
          to: toArray(to).map((correo) => ({ email: correo })),
          subject,
          htmlContent: html,
          ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        }
      );
    },
  };
} else {
  const { default: nodemailer } = await import("nodemailer");
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  // No bloquea el arranque: el sitio debe funcionar aunque el correo esté mal configurado.
  transporter.verify((err) => {
    if (err) console.error("Nodemailer no pudo conectar:", err.message);
    else console.log("Servidor de correo listo (Nodemailer)");
  });
}

export default transporter;