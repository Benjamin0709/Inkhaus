import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPaymentByOrderAPI, createPaymentAPI } from "../../api/payment.api";
import { redirectToWebpay } from "../../utils/webpay";
import { formatCLP } from "../../constants/pricing";

const COPY = {
  ok: {
    title: "PAGO", accent: "APROBADO",
    text: "Recibimos tu abono y tu cita quedó confirmada. Te enviamos el comprobante a tu correo.",
  },
  rechazado: {
    title: "PAGO", accent: "RECHAZADO",
    text: "Tu banco rechazó la transacción. Tu cita sigue reservada, pero queda pendiente hasta que se pague la abono. Puedes reintentar con otra tarjeta.",
  },
  anulado: {
    title: "PAGO", accent: "CANCELADO",
    text: "Cancelaste el pago o se agotó el tiempo del formulario. Tu cita sigue pendiente: puedes pagar la abono cuando quieras desde Mi cuenta.",
  },
  error: {
    title: "ALGO", accent: "SALIÓ MAL",
    text: "No pudimos confirmar el estado de tu pago. Si te cobraron, escríbenos con tu número de orden y lo revisamos.",
  },
};

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const status = COPY[params.get("status")] ? params.get("status") : "error";
  const order = params.get("order");

  const [payment, setPayment] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!order) return;
    getPaymentByOrderAPI(order)
      .then(({ data }) => setPayment(data.info))
      .catch(() => {});
  }, [order]);

  const copy = COPY[status];
  const appointment = payment?.appointment;
  const canRetry = status !== "ok" && appointment && !appointment.abono_pagada;

  const handleRetry = async () => {
    setRetrying(true);
    setError("");
    try {
      const { data } = await createPaymentAPI(appointment._id);
      redirectToWebpay(data.info.url, data.info.token);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo reintentar el pago");
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="max-w-md mx-auto text-center">
        <h1 className="mb-3 text-4xl tracking-wide font-display">
          {copy.title} <span className={status === "ok" ? "text-green-400" : "text-red"}>{copy.accent}</span>
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted">{copy.text}</p>

        {payment && (
          <div className="mb-8 text-left border border-white/10">
            <Row label="N.° de orden" value={payment.buyOrder} />
            <Row label="Monto" value={formatCLP(payment.amount)} />
            {payment.cardLast4 && <Row label="Tarjeta" value={`•••• ${payment.cardLast4}`} />}
            {appointment?.artista?.nombre_artistico && <Row label="Artista" value={appointment.artista.nombre_artistico} />}
            {appointment?.fecha_hora && (
              <Row
                label="Cita"
                value={new Date(appointment.fecha_hora).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}
              />
            )}
          </div>
        )}

        {error && <div className="px-4 py-3 mb-4 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}

        <div className="flex flex-col gap-3">
          {canRetry && (
            <button onClick={handleRetry} disabled={retrying}
              className="py-3 text-xs font-medium tracking-widest text-white uppercase bg-red hover:bg-red-hover disabled:opacity-60">
              {retrying ? "Redirigiendo..." : "Reintentar pago"}
            </button>
          )}
          <Link to="/mi-cuenta" className="py-3 text-xs tracking-widest uppercase border border-white/15 text-paper hover:border-white/30">
            Ir a Mi cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between px-4 py-2.5 text-xs border-b border-white/10 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-paper">{value}</span>
    </div>
  );
}