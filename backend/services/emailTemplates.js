// ─────────────────────────────────────────────────────────────────────────
// Plantillas HTML de correo para Ink Haus. Usan tablas y estilos inline
// porque los clientes de correo (Gmail, Outlook) no soportan CSS externo
// ni flexbox/grid de forma confiable.
// ─────────────────────────────────────────────────────────────────────────

const COLOR = {
  ink: "#0a0908",
  ink2: "#141312",
  paper: "#f2ede8",
  muted: "#8a8580",
  red: "#c0392b",
  gold: "#c9a84c",
};

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/** Envuelve el contenido de cada correo en el layout con marca de Ink Haus. */
function wrapEmail({ title, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:${COLOR.ink};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.ink};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:${COLOR.ink2};border:1px solid #2a2826;">
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #2a2826;">
              <span style="font-size:22px;letter-spacing:2px;color:${COLOR.paper};font-weight:bold;">
                INK<span style="color:${COLOR.red};">HAUS</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:${COLOR.paper};font-weight:600;">${title}</h1>
              <div style="font-size:14px;line-height:1.7;color:${COLOR.muted};">
                ${bodyHtml}
              </div>
              ${ctaUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td style="background:${COLOR.red};">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #2a2826;">
              <p style="margin:0;font-size:11px;color:${COLOR.muted};line-height:1.6;">
                ${footerNote || "Ink Haus · Santiago, Chile"}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── 1. Bienvenida — correo de creación exitosa de usuario ────────────
export function welcomeEmailTemplate(name) {
  return {
    subject: "¡Bienvenido/a a Ink Haus!",
    html: wrapEmail({
      title: `¡Hola, ${name}!`,
      bodyHtml: `
        <p>Tu cuenta en Ink Haus fue creada con éxito. Ya puedes explorar el portafolio de nuestros artistas, chatear con nuestro asistente para cotizar tu próximo tatuaje, y agendar tu cita cuando quieras.</p>
        <p>Si tú no creaste esta cuenta, por favor responde este correo para que podamos ayudarte.</p>
      `,
      ctaLabel: "Explorar el portafolio",
      ctaUrl: `${FRONTEND_URL}/portfolio`,
    }),
  };
}

// ─── 2. Recuperación de contraseña ─────────────────────────────────────
export function passwordResetEmailTemplate(name, resetUrl) {
  return {
    subject: "Recupera tu contraseña — Ink Haus",
    html: wrapEmail({
      title: "Recuperación de contraseña",
      bodyHtml: `
        <p>Hola ${name || ""}, recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Este enlace es válido por <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña seguirá siendo la misma.</p>
      `,
      ctaLabel: "Restablecer contraseña",
      ctaUrl: resetUrl,
      footerNote: "Por seguridad, este enlace expira en 1 hora y solo puede usarse una vez.",
    }),
  };
}

// ─── 3. Confirmación de cambio de contraseña ───────────────────────────
export function passwordChangedEmailTemplate(name) {
  return {
    subject: "Tu contraseña fue actualizada — Ink Haus",
    html: wrapEmail({
      title: "Contraseña actualizada",
      bodyHtml: `
        <p>Hola ${name || ""}, te confirmamos que la contraseña de tu cuenta en Ink Haus fue cambiada exitosamente.</p>
        <p style="color:${COLOR.red};font-weight:600;">¿No fuiste tú quien hizo este cambio?</p>
        <p>Responde directamente a este correo lo antes posible y nuestro equipo revisará tu cuenta de inmediato.</p>
      `,
    }),
  };
}

// ─── 4. Se agendó una cita (cliente) ───────────────────────────────────
export function appointmentBookedEmailTemplate({ clientName, artistName, fecha, hora, tipo, notas }) {
  return {
    subject: "Tu cita en Ink Haus fue agendada",
    html: wrapEmail({
      title: "¡Tu cita quedó agendada!",
      bodyHtml: `
        <p>Hola ${clientName}, confirmamos tu solicitud de cita con <strong>${artistName}</strong>.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #2a2826;">
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;">Fecha</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;">${fecha}</td></tr>
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;border-top:1px solid #2a2826;">Hora</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;border-top:1px solid #2a2826;">${hora}</td></tr>
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;border-top:1px solid #2a2826;">Tipo</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;border-top:1px solid #2a2826;">${tipo === "ajuste" ? "Ajuste de diseño" : "Sesión de tatuaje"}</td></tr>
        </table>
        ${notas ? `<p><em>Notas: "${notas}"</em></p>` : ""}
        <p>Recibirás un correo de recordatorio 3 días antes de tu cita.</p>
      `,
      ctaLabel: "Ver mis citas",
      ctaUrl: `${FRONTEND_URL}/mi-cuenta`,
    }),
  };
}

// ─── 5. Recordatorio 3 días antes ──────────────────────────────────────
export function appointmentReminderEmailTemplate({ clientName, artistName, fecha, hora }) {
  return {
    subject: "Recordatorio: tu cita en Ink Haus es en 3 días",
    html: wrapEmail({
      title: "Tu cita se acerca",
      bodyHtml: `
        <p>Hola ${clientName}, te recordamos que en <strong>3 días</strong> tienes cita con <strong>${artistName}</strong>.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #2a2826;">
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;">Fecha</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;">${fecha}</td></tr>
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;border-top:1px solid #2a2826;">Hora</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;border-top:1px solid #2a2826;">${hora}</td></tr>
        </table>
        <p>Recuerda llegar descansado/a, haber comido antes de la sesión, y evitar alcohol las 24 horas previas.</p>
      `,
      ctaLabel: "Ver detalles de mi cita",
      ctaUrl: `${FRONTEND_URL}/mi-cuenta`,
    }),
  };
}

// ─── 6. Cancelación de cita ─────────────────────────────────────────────
export function appointmentCancelledEmailTemplate({ clientName, artistName, fecha, hora, canceladaPor }) {
  const quien = canceladaPor === "cliente" ? "Cancelaste tu cita" : "Tu cita fue cancelada por el estudio";
  return {
    subject: "Tu cita en Ink Haus fue cancelada",
    html: wrapEmail({
      title: "Cita cancelada",
      bodyHtml: `
        <p>Hola ${clientName}, ${quien.toLowerCase()} con <strong>${artistName}</strong>, programada para el ${fecha} a las ${hora}.</p>
        <p>Si fue un error o quieres agendar una nueva hora, puedes hacerlo cuando quieras desde tu cuenta.</p>
      `,
      ctaLabel: "Agendar otra cita",
      ctaUrl: `${FRONTEND_URL}/artists`,
    }),
  };
}

// ─── 7. Cambio de hora/día de la cita ──────────────────────────────────
export function appointmentRescheduledEmailTemplate({ clientName, artistName, fechaAnterior, horaAnterior, fechaNueva, horaNueva }) {
  return {
    subject: "Tu cita en Ink Haus cambió de horario",
    html: wrapEmail({
      title: "Tu cita fue reagendada",
      bodyHtml: `
        <p>Hola ${clientName}, tu cita con <strong>${artistName}</strong> fue reagendada.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #2a2826;">
          <tr><td style="padding:10px 14px;color:${COLOR.muted};font-size:13px;text-decoration:line-through;">Antes</td><td style="padding:10px 14px;color:${COLOR.muted};font-size:13px;text-align:right;text-decoration:line-through;">${fechaAnterior} · ${horaAnterior}</td></tr>
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;border-top:1px solid #2a2826;font-weight:600;">Ahora</td><td style="padding:10px 14px;color:${COLOR.gold};font-size:13px;text-align:right;border-top:1px solid #2a2826;font-weight:600;">${fechaNueva} · ${horaNueva}</td></tr>
        </table>
      `,
      ctaLabel: "Ver mis citas",
      ctaUrl: `${FRONTEND_URL}/mi-cuenta`,
    }),
  };
}

// ─── 8. Notificación al artista: nueva cita agendada ───────────────────
export function artistNewAppointmentEmailTemplate({ artistName, clientName, fecha, hora, tipo, notas }) {
  return {
    subject: "Nueva cita agendada — Ink Haus",
    html: wrapEmail({
      title: `Tienes una nueva cita, ${artistName}`,
      bodyHtml: `
        <p><strong>${clientName}</strong> agendó una cita contigo.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #2a2826;">
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;">Fecha</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;">${fecha}</td></tr>
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;border-top:1px solid #2a2826;">Hora</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;border-top:1px solid #2a2826;">${hora}</td></tr>
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;border-top:1px solid #2a2826;">Tipo</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;border-top:1px solid #2a2826;">${tipo === "ajuste" ? "Ajuste de diseño" : "Sesión de tatuaje"}</td></tr>
        </table>
        ${notas ? `<p><em>Notas del cliente: "${notas}"</em></p>` : ""}
      `,
      ctaLabel: "Ver mi agenda",
      ctaUrl: `${FRONTEND_URL}/artista/citas`,
    }),
  };
}

// ─── Notificación al estudio: nuevo mensaje de contacto ────────────────
export function contactNotificationEmailTemplate({ nombre, email, telefono, mensaje }) {
  return {
    subject: `Nuevo mensaje de contacto — ${nombre}`,
    html: wrapEmail({
      title: "Nuevo mensaje desde el sitio web",
      bodyHtml: `
        <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;border:1px solid #2a2826;">
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;">Nombre</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;">${nombre}</td></tr>
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;border-top:1px solid #2a2826;">Correo</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;border-top:1px solid #2a2826;">${email}</td></tr>
          ${telefono ? `<tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;border-top:1px solid #2a2826;">Teléfono</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;border-top:1px solid #2a2826;">${telefono}</td></tr>` : ""}
        </table>
        <p style="white-space:pre-wrap;">${mensaje}</p>
      `,
    }),
  };
}

// ─── Confirmación al visitante: recibimos su mensaje de contacto ───────
export function contactConfirmationEmailTemplate({ nombre, mensaje }) {
  return {
    subject: "Recibimos tu mensaje — Ink Haus",
    html: wrapEmail({
      title: `¡Gracias por escribirnos, ${nombre}!`,
      bodyHtml: `
        <p>Recibimos tu mensaje y nuestro equipo te responderá a la brevedad.</p>
        ${mensaje ? `
        <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #2a2826;">
          <tr><td style="padding:10px 14px;color:${COLOR.muted};font-size:12px;">Tu mensaje</td></tr>
          <tr><td style="padding:0 14px 10px;color:${COLOR.paper};font-size:13px;white-space:pre-wrap;">${mensaje}</td></tr>
        </table>` : ""}
        <p>Mientras tanto, puedes explorar el portafolio de nuestros artistas o conversar con nuestro chatbot para cotizar tu próximo tatuaje.</p>
      `,
      ctaLabel: "Explorar el portafolio",
      ctaUrl: `${FRONTEND_URL}/portfolio`,
    }),
  };
}

// ─── 9. Confirmación de pago (TS-4 — Webpay) ───────────────────────────
// Comentado hasta que se implemente la integración de pagos. Se deja la
// plantilla lista para no tener que rediseñarla después: cuando Webpay
// esté integrado, solo hay que descomentar esta función y llamarla desde
// el webhook/callback de confirmación de transacción.

export function paymentConfirmedEmailTemplate({ clientName, artistName, monto, fecha, hora, numeroOrden }) {
  return {
    subject: "Pago confirmado — Ink Haus",
    html: wrapEmail({
      title: "¡Pago recibido!",
      bodyHtml: `
        <p>Hola ${clientName}, confirmamos el pago de tu abono para la cita con <strong>${artistName}</strong> el ${fecha} a las ${hora}. Tu cita quedó confirmada.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #2a2826;">
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;">N.° de orden</td><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;text-align:right;">${numeroOrden}</td></tr>
          <tr><td style="padding:10px 14px;color:${COLOR.paper};font-size:13px;border-top:1px solid #2a2826;">Monto pagado</td><td style="padding:10px 14px;color:${COLOR.gold};font-size:13px;text-align:right;border-top:1px solid #2a2826;font-weight:600;">$${Number(monto).toLocaleString("es-CL")} CLP</td></tr>
        </table>
        <p>Guarda este correo como comprobante de tu pago.</p>
      `,
      ctaLabel: "Ver mi cita",
      ctaUrl: `${FRONTEND_URL}/mi-cuenta`,
    }),
  };
}
