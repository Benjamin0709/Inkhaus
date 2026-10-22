import cron from "node-cron";
import Appointment from "../models/Appointment.model.js";
import { sendAppointmentReminderEmail } from "./email.service.js";

/**
 * Corre todos los días a las 09:00 (hora del servidor). Busca citas
 * confirmadas cuya fecha_hora caiga exactamente 3 días después de hoy,
 * y que no hayan recibido ya el recordatorio (evita duplicados si el
 * cron corre más de una vez el mismo día por un reinicio del server).
 */
export function startReminderCron() {
  cron.schedule("0 9 * * *", async () => {
    try {
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

      for (const cita of citas) {
        if (!cita.cliente?.email) continue;
        await sendAppointmentReminderEmail(cita.cliente.email, {
          clientName: cita.cliente.name,
          artistName: cita.artista?.nombre_artistico || "tu artista",
          fecha: cita.fecha_hora.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }),
          hora: cita.fecha_hora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
        });
        cita.recordatorio_enviado = true;
        await cita.save();
      }

      if (citas.length > 0) console.log(`Recordatorios enviados: ${citas.length}`);
    } catch (err) {
      console.error("Error en el cron de recordatorios:", err.message);
    }
  });
  console.log("Cron de recordatorios de citas programado (09:00 diario)");
}