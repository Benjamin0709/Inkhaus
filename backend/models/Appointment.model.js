import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    artista: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true },
    style: { type: mongoose.Schema.Types.ObjectId, ref: "Style" },
    zona_corporal: { type: String, required: true },
    tamanio: { type: String, required: true },
    fecha_hora: { type: Date, required: true },
    precio_cotizado: { type: Number },
    sena_pagada: { type: Boolean, default: false },
    estado: {
      type: String,
      enum: ["pendiente", "confirmada", "cancelada", "completada"],
      default: "pendiente",
    },
    notas: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
