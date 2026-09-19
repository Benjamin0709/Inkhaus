import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    artista: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true },
    quote: { type: mongoose.Schema.Types.ObjectId, ref: "Quote", default: null },
    tipo: { type: String, enum: ["ajuste", "sesion"], required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    time: { type: String, required: true }, // "HH:mm"
    notas: { type: String, default: "" },
    estado: { type: String, enum: ["pendiente", "confirmada", "cancelada", "completada"], default: "pendiente" },
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);