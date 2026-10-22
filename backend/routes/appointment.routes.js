import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Appointment from "../models/Appointment.model.js";
import Artist from "../models/Artist.model.js";
import { calcularAbono, sanitizeCotizacion } from "../services/abono.js";
import { resolveQuote } from "../services/quote.js";
import {
  sendAppointmentBookedEmail,
  sendAppointmentCancelledEmail,
  sendAppointmentRescheduledEmail,
  sendArtistNewAppointmentEmail,
} from "../services/email.service.js";
import User from "../models/User.model.js";

const router = express.Router();

const DURACION_POR_TIPO = { ajuste: 30, sesion: 90 };
const SLOT_STEP_MIN = 60;

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// ── Disponibilidad de un artista en una fecha (público) ────────────────
router.get("/appointments/availability/:artistId", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Falta el parámetro date",
      });
    }

    const artist = await Artist.findById(req.params.artistId);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artista no encontrado",
      });
    }

    const targetDate = new Date(`${date}T00:00:00`);
    const diaSemana = DIAS[targetDate.getDay()];

    const bloques = (artist.horarios || []).filter(
      (h) => h.dia === diaSemana
    );

    if (bloques.length === 0) {
      return res.json({ success: true, info: [] });
    }

    // Citas activas de ese artista ese día, para excluir horas ocupadas.
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const citasDelDia = await Appointment.find({
      artista: artist._id,
      estado: { $in: ["pendiente", "confirmada"] },
      fecha_hora: { $gte: startOfDay, $lte: endOfDay },
    });

    const ocupados = citasDelDia.map((c) => {
      const start =
        c.fecha_hora.getHours() * 60 + c.fecha_hora.getMinutes();

      return {
        start,
        end: start + (c.duracion_min || 60),
      };
    });

    const ahora = new Date();
    const esHoy = targetDate.toDateString() === ahora.toDateString();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

    const slots = [];

    for (const b of bloques) {
      const inicio = toMinutes(b.desde);
      const fin = toMinutes(b.hasta);

      for (
        let t = inicio;
        t + SLOT_STEP_MIN <= fin;
        t += SLOT_STEP_MIN
      ) {
        if (esHoy && t <= minutosAhora) continue;

        const solapa = ocupados.some(
          (o) => t < o.end && t + SLOT_STEP_MIN > o.start
        );

        if (!solapa) slots.push(toHHMM(t));
      }
    }

    res.json({ success: true, info: slots });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
});

// ── Crear cita ────────────────────────────────────────────────────────
router.post("/appointments", auth, async (req, res) => {
  try {
    const { artista, tipo, date, time, notas } = req.body;

    if (!artista || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Artista, fecha y hora son obligatorios",
      });
    }

    const artistDoc = await Artist.findById(artista);

    if (!artistDoc || !artistDoc.activo) {
      return res.status(404).json({
        success: false,
        message: "Artista no disponible",
      });
    }

    if (tipo && !Object.hasOwn(DURACION_POR_TIPO, tipo)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de cita no válido",
      });
    }

    const tipoFinal = tipo || "sesion";
    const duracion_min = DURACION_POR_TIPO[tipoFinal];
    const fecha_hora = new Date(`${date}T${time}:00`);

    if (isNaN(fecha_hora.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Fecha u hora inválida",
      });
    }

    if (fecha_hora < new Date()) {
      return res.status(400).json({
        success: false,
        message: "No se puede agendar en el pasado",
      });
    }

    // Revalida el cupo por si otro usuario lo tomó mientras
    // el cliente elegía.
    const finNueva = new Date(
      fecha_hora.getTime() + duracion_min * 60000
    );

    const conflicto = await Appointment.findOne({
      artista,
      estado: { $in: ["pendiente", "confirmada"] },
      fecha_hora: { $lt: finNueva },
      $expr: {
        $gt: [
          {
            $add: [
              "$fecha_hora",
              { $multiply: ["$duracion_min", 60000] },
            ],
          },
          fecha_hora,
        ],
      },
    });

    if (conflicto) {
      return res.status(409).json({
        success: false,
        message: "Ese horario se acaba de ocupar. Elige otro.",
      });
    }

     // Cotización del chatbot (opcional). El cliente solo indica zona y tamaño;
    // el precio lo resuelve el servidor con la tabla del artista de ESTA cita.
    let cotizacion;
    const pedida = sanitizeCotizacion(req.body.cotizacion);
    if (pedida) {
      const precio = await resolveQuote({ artistId: artista, zona: pedida.zona, tamanio: pedida.tamanio });
      if (precio) {
        cotizacion = {
          zona: pedida.zona,
          tamanio: pedida.tamanio,
          estilo: pedida.estilo,
          min: precio.min,
          max: precio.max,
          fuente: precio.fuente,
        };
      }
    }

    // Crear cita con cotización y cálculo del abono.
    const appointment = new Appointment({
      cliente: req.auth.id,
      artista,
      tipo: tipoFinal,
      fecha_hora,
      duracion_min,
      notas: notas || "",
      cotizacion,
      precio_cotizado: cotizacion?.min,
      abono_monto: calcularAbono({
        tipo: tipoFinal,
        cotizacion,
      }),
    });

    await appointment.save();

    // Correos: confirmación al cliente + notificación al artista.
    const clienteDoc = await User.findById(req.auth.id);
    const artistaDoc = await artistDoc.populate("user", "email name");

    const fechaFmt = fecha_hora.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const horaFmt = fecha_hora.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    sendAppointmentBookedEmail(clienteDoc.email, {
      clientName: clienteDoc.name,
      artistName: artistaDoc.nombre_artistico,
      fecha: fechaFmt,
      hora: horaFmt,
      tipo: tipoFinal,
      notas: notas || "",
    }).catch(() => {});

    sendArtistNewAppointmentEmail(artistaDoc.user?.email, {
      artistName: artistaDoc.nombre_artistico,
      clientName: clienteDoc.name,
      fecha: fechaFmt,
      hora: horaFmt,
      tipo: tipoFinal,
      notas: notas || "",
    }).catch(() => {});

    const populated = await appointment.populate(
      "artista",
      "nombre_artistico"
    );

    res.status(201).json({
      success: true,
      info: populated,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
});

// ── Mis citas ─────────────────────────────────────────────────────────
router.get("/appointments/me", auth, async (req, res) => {
  try {
    const citas = await Appointment.find({ cliente: req.auth.id })
      .populate("artista", "nombre_artistico foto_url")
      .sort({ fecha_hora: 1 });

    res.json({ success: true, info: citas });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
});

// ── Todas las citas (admin) o las del propio artista ──────────────────
router.get(
  "/appointments",
  auth,
  authorizeRoles("admin", "artista"),
  async (req, res) => {
    try {
      const filter = {};

      if (
        req.auth.roles.includes("artista") &&
        !req.auth.roles.includes("admin")
      ) {
        const myArtist = await Artist.findOne({
          user: req.auth.id,
        });

        if (!myArtist) {
          return res.json({ success: true, info: [] });
        }

        filter.artista = myArtist._id;
      }

      const citas = await Appointment.find(filter)
        .populate("cliente", "name email phone")
        .populate("artista", "nombre_artistico")
        .sort({ fecha_hora: 1 });

      res.json({ success: true, info: citas });
    } catch (e) {
      res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  }
);

// ── Actualizar cita: cancelar, confirmar o reagendar ──────────────────
router.put("/appointments/:id", auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada",
      });
    }

    const esAdmin = req.auth.roles.includes("admin");
    const esCliente =
      appointment.cliente.toString() === req.auth.id;

    let esArtistaDueño = false;

    if (req.auth.roles.includes("artista")) {
      const myArtist = await Artist.findOne({
        user: req.auth.id,
      });

      esArtistaDueño =
        myArtist &&
        myArtist._id.toString() === appointment.artista.toString();
    }

    if (!esAdmin && !esCliente && !esArtistaDueño) {
      return res.status(403).json({
        success: false,
        message: "No autorizado para modificar esta cita",
      });
    }

    // El cliente solo puede cancelar su propia cita.
    if (esCliente && !esAdmin && !esArtistaDueño) {
      if (req.body.estado !== "cancelada") {
        return res.status(403).json({
          success: false,
          message: "Solo puedes cancelar tu cita",
        });
      }

      appointment.estado = "cancelada";
      appointment.canceladaPor = "cliente";

      await appointment.save();

      return res.json({
        success: true,
        info: appointment,
      });
    }

    // Artista dueño o admin: puede cambiar estado,
    // fecha/hora y notas.
    const { estado, date, time, notas } = req.body;

    const fechaAnteriorObj = appointment.fecha_hora;
    const estabaCancelada = appointment.estado === "cancelada";

    let seReagendo = false;

    if (estado) {
      appointment.estado = estado;

      if (estado === "cancelada") {
        appointment.canceladaPor = esAdmin ? "admin" : "artista";
      }
    }

    if (date && time) {
      const nueva = new Date(`${date}T${time}:00`);

      if (isNaN(nueva.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Fecha u hora inválida",
        });
      }

      seReagendo =
        nueva.getTime() !== fechaAnteriorObj.getTime();

      appointment.fecha_hora = nueva;
    }

    if (notas !== undefined) {
      appointment.notas = notas;
    }

    await appointment.save();

    const populated = await appointment.populate([
      { path: "cliente", select: "name email" },
      { path: "artista", select: "nombre_artistico" },
    ]);

    // Correos según qué cambió (fire-and-forget).
    if (estado === "cancelada" && !estabaCancelada) {
      sendAppointmentCancelledEmail(populated.cliente.email, {
        clientName: populated.cliente.name,
        artistName: populated.artista.nombre_artistico,
        fecha: fechaAnteriorObj.toLocaleDateString("es-CL", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        hora: fechaAnteriorObj.toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        canceladaPor: appointment.canceladaPor,
      }).catch(() => {});
    } else if (seReagendo) {
      sendAppointmentRescheduledEmail(populated.cliente.email, {
        clientName: populated.cliente.name,
        artistName: populated.artista.nombre_artistico,
        fechaAnterior: fechaAnteriorObj.toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
        }),
        horaAnterior: fechaAnteriorObj.toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        fechaNueva: appointment.fecha_hora.toLocaleDateString("es-CL", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        horaNueva: appointment.fecha_hora.toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }).catch(() => {});
    }

    res.json({
      success: true,
      info: populated,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
});

export default router;
