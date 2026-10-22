import mongoose from "mongoose";

// Cotización que el cliente obtuvo con el chatbot y llevó a la reserva.
const cotizacionSchema = new mongoose.Schema(
  {
    zona: { type: String, trim: true, default: "" },
    tamanio: { type: String, trim: true, default: "" },
    estilo: { type: String, trim: true, default: "" },
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    artista: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true },
    tipo: { type: String, enum: ["ajuste", "sesion"], default: "sesion" },
    fecha_hora: { type: Date, required: true },
    duracion_min: { type: Number, default: 60 },
    estado: {
      type: String,
      enum: ["pendiente", "confirmada", "cancelada", "completada"],
      default: "pendiente",
    },
    canceladaPor: { type: String, enum: ["cliente", "artista", "admin"], default: undefined },
    notas: { type: String, default: "" },

    // Cotización del chatbot (opcional) y precio mínimo cotizado.
    cotizacion: { type: cotizacionSchema, default: undefined },
    precio_cotizado: { type: Number },
    fuente: { type: String, enum: ["artista", "estudio", "estimado"], default: "estimado" },

    // Abono: el monto lo calcula el servidor al crear la cita (services/abono.js).
    abono_monto: { type: Number, min: 0 },
    abono_pagada: { type: Boolean, default: false },

    recordatorio_enviado: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
