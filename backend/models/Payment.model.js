import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    buyOrder: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true },
    token: { type: String, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["iniciado", "aprobado", "rechazado", "anulado"], default: "iniciado" },
    // Datos que devuelve Transbank al confirmar
    responseCode: Number,
    authorizationCode: String,
    paymentTypeCode: String,
    installments: Number,
    cardLast4: String,
    transactionDate: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);