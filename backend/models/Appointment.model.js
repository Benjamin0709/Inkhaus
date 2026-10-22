import mongoose from "mongoose";

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
    // Campos preparados para cuando el chatbot alimente la cita con una
    // cotización real (TS-4 Webpay). Por ahora quedan opcionales.
    precio_cotizado: { type: Number },
    abono_pagada: { type: Boolean, default: false },
    recordatorio_enviado: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);