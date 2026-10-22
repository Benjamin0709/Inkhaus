import cron from "node-cron";
import Appointment from "../models/Appointment.model.js";
import { sendAppointmentReminderEmail } from "./email.service.js";

/**
 * Envía el recordatorio a las citas confirmadas que ocurren dentro de 3 días y aún no lo recibieron.
 * Es idempotente (marca recordatorio_enviado): puede ejecutarse varias veces al día sin duplicar correos.
 * Devuelve cuántos recordatorios se enviaron.
 */
export async function enviarRecordatorios() {
  const hoy = new Date();
  const en3Dias = new Date(hoy);
  en3Dias.setDate(hoy.getDate() + 3);

  const inicio = new Date(en3Dias);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(en3Dias);
  fin.setHours(23, 59, 59, 999);

  const citas = await Appointment.find({
    estado: "confirmada",
    recordatorio_enviado: false,
    fecha_hora: { $gte: inicio, $lte: fin },
  })
    .populate("cliente", "name email")
    .populate("artista", "nombre_artistico");

  let enviados = 0;
  for (const cita of citas) {
    if (!cita.cliente?.email) continue;
    const ok = await sendAppointmentReminderEmail(cita.cliente.email, {
      clientName: cita.cliente.name,
      artistName: cita.artista?.nombre_artistico || "tu artista",
      fecha: cita.fecha_hora.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }),
      hora: cita.fecha_hora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    });
    // Solo se marca como enviado si el correo realmente salió; si falló, se reintenta en la próxima ejecución.
    if (!ok) continue;
    cita.recordatorio_enviado = true;
    await cita.save();
    enviados++;
  }
  return enviados;
}

export function startReminderCron() {
  if (process.env.ENABLE_CRON === "false") {
    console.log("Cron de recordatorios desactivado (ENABLE_CRON=false)");
    return;
  }
  cron.schedule(
    "0 9 * * *",
    async () => {
      try {
        const enviados = await enviarRecordatorios();
        if (enviados > 0) console.log(`Recordatorios enviados: ${enviados}`);
      } catch (err) {
        console.error("Error en el cron de recordatorios:", err.message);
      }
    },
    { timezone: "America/Santiago" }
  );
  console.log("Cron de recordatorios de citas programado (09:00 diario, hora de Chile)");
}