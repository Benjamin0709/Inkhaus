import express from "express";
import { auth } from "../middleware/auth.js";
import Appointment from "../models/Appointment.model.js";
import Payment from "../models/Payment.model.js";
import { getWebpayTransaction } from "../config/webpay.js";
import { calcularabono } from "../services/abono.js";
import { sendPaymentConfirmedEmail } from "../services/email.service.js";

const router = express.Router();

const FRONTEND = () => process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8080}`;

// buyOrder: máx. 26 caracteres alfanuméricos
const newBuyOrder = () =>
  `IH${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase().slice(0, 26);

// ── Crear transacción (cliente dueño de la cita) ─────────────────────
router.post("/payments/create", auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.body.appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: "Cita no encontrada" });
    if (appointment.cliente.toString() !== req.auth.id) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }
    if (["cancelada", "completada"].includes(appointment.estado)) {
      return res.status(400).json({ success: false, message: "Esta cita ya no admite pago" });
    }
    if (appointment.abono_pagada) {
      return res.status(400).json({ success: false, message: "La seña de esta cita ya fue pagada" });
    }

    const amount =
      appointment.abono_monto || calcularabono({ tipo: appointment.tipo, cotizacion: appointment.cotizacion });
    const buyOrder = newBuyOrder();
    const sessionId = appointment._id.toString();
    const returnUrl = `${BACKEND()}/api/payments/return`;

    const { token, url } = await getWebpayTransaction().create(buyOrder, sessionId, amount, returnUrl);

    await Payment.create({
      appointment: appointment._id,
      cliente: req.auth.id,
      buyOrder,
      sessionId,
      token,
      amount,
    });

    res.json({ success: true, info: { url, token, amount } });
  } catch (e) {
    console.error("payments/create:", e.message);
    res.status(500).json({ success: false, message: "No se pudo iniciar el pago" });
  }
});

// ── Retorno desde Webpay (redirección del navegador) ─────────────────
// Transbank puede volver por GET o POST, y con token_ws (pagó o rechazó)
// o con TBK_TOKEN (el cliente anuló o se agotó el tiempo).
router.all("/payments/return", async (req, res) => {
  const params = { ...req.query, ...req.body };
  const { token_ws, TBK_TOKEN, TBK_ORDEN_COMPRA } = params;
  const goTo = (status, order) =>
    res.redirect(`${FRONTEND()}/pago/resultado?status=${status}&order=${encodeURIComponent(order || "")}`);

  try {
    if (TBK_TOKEN) {
      const p = await Payment.findOne({ token: TBK_TOKEN });
      if (p && p.status === "iniciado") {
        p.status = "anulado";
        await p.save();
      }
      return goTo("anulado", p?.buyOrder || TBK_ORDEN_COMPRA);
    }
    if (!token_ws) return goTo("error", "");

    const payment = await Payment.findOne({ token: token_ws });
    if (!payment) return goTo("error", "");

    // Idempotencia: si se recarga la URL de retorno, no se confirma dos veces
    if (payment.status !== "iniciado") {
      return goTo(payment.status === "aprobado" ? "ok" : "rechazado", payment.buyOrder);
    }

    const result = await getWebpayTransaction().commit(token_ws);
    const aprobado = result.status === "AUTHORIZED" && result.response_code === 0;

    payment.status = aprobado ? "aprobado" : "rechazado";
    payment.responseCode = result.response_code;
    payment.authorizationCode = result.authorization_code;
    payment.paymentTypeCode = result.payment_type_code;
    payment.installments = result.installments_number;
    payment.cardLast4 = result.card_detail?.card_number;
    payment.transactionDate = result.transaction_date ? new Date(result.transaction_date) : new Date();
    await payment.save();

    if (aprobado) {
      const appointment = await Appointment.findById(payment.appointment)
        .populate("cliente", "name email")
        .populate("artista", "nombre_artistico");
      if (appointment) {
        appointment.abono_pagada = true;
        appointment.abono_monto = payment.amount;
        if (appointment.estado === "pendiente") appointment.estado = "confirmada";
        await appointment.save();

        const f = appointment.fecha_hora;
        sendPaymentConfirmedEmail(appointment.cliente.email, {
          clientName: appointment.cliente.name,
          artistName: appointment.artista?.nombre_artistico || "tu artista",
          monto: payment.amount,
          fecha: f.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }),
          hora: f.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
          numeroOrden: payment.buyOrder,
        }).catch(() => {});
      }
    }

    return goTo(aprobado ? "ok" : "rechazado", payment.buyOrder);
  } catch (e) {
    console.error("payments/return:", e.message);
    return goTo("error", "");
  }
});

// ── Detalle de un pago por orden (para la página de resultado) ───────
router.get("/payments/order/:buyOrder", auth, async (req, res) => {
  try {
    const payment = await Payment.findOne({ buyOrder: req.params.buyOrder, cliente: req.auth.id }).populate({
      path: "appointment",
      select: "fecha_hora tipo abono_pagada artista",
      populate: { path: "artista", select: "nombre_artistico" },
    });
    if (!payment) return res.status(404).json({ success: false, message: "Pago no encontrado" });
    res.json({ success: true, info: payment });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;