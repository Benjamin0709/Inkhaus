import transporter from "../config/mailer.js";
import {
  welcomeEmailTemplate,
  passwordResetEmailTemplate,
  passwordChangedEmailTemplate,
  appointmentBookedEmailTemplate,
  appointmentReminderEmailTemplate,
  appointmentCancelledEmailTemplate,
  appointmentRescheduledEmailTemplate,
  artistNewAppointmentEmailTemplate,
  contactNotificationEmailTemplate,
  contactConfirmationEmailTemplate,
  paymentConfirmedEmailTemplate,
  
} from "./emailTemplates.js";

const FROM = process.env.EMAIL_FROM || `"${process.env.EMAIL_FROM_NAME || "Ink Haus"}" <${process.env.EMAIL_USER}>`;
const STUDIO_EMAIL = "inkhausweb@gmail.com";

async function send(to, { subject, html }, replyTo) {
  if (!to) return false;
  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    return true;
  } catch (err) {
    console.error(`Error enviando correo "${subject}" a ${to}:`, err.message);
    return false;
  }
}

export const sendContactNotificationEmail = (data) =>
  send(STUDIO_EMAIL, contactNotificationEmailTemplate(data), data.email);

export const sendContactConfirmationEmail = (data) =>
  send(data.email, contactConfirmationEmailTemplate(data));

export const sendWelcomeEmail = (to, name) =>
  send(to, welcomeEmailTemplate(name));

export const sendPasswordResetEmail = (to, name, resetUrl) =>
  send(to, passwordResetEmailTemplate(name, resetUrl));

// replyTo: si el usuario contesta "no fui yo", la respuesta debe llegar
// al correo del estudio para que el equipo la vea, no perderse en un
// buzón automático.
export const sendPasswordChangedEmail = (to, name) =>
  send(to, passwordChangedEmailTemplate(name), process.env.EMAIL_USER);

export const sendAppointmentBookedEmail = (to, data) =>
  send(to, appointmentBookedEmailTemplate(data));

export const sendAppointmentReminderEmail = (to, data) =>
  send(to, appointmentReminderEmailTemplate(data));

export const sendAppointmentCancelledEmail = (to, data) =>
  send(to, appointmentCancelledEmailTemplate(data));

export const sendAppointmentRescheduledEmail = (to, data) =>
  send(to, appointmentRescheduledEmailTemplate(data));

export const sendArtistNewAppointmentEmail = (to, data) =>
  send(to, artistNewAppointmentEmailTemplate(data));

export const sendPaymentConfirmedEmail = (to, data) =>
  send(to, paymentConfirmedEmailTemplate(data));