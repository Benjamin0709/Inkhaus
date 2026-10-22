import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getArtistAPI } from "../../api/artists.api";
import {
  getAvailabilityAPI,
  createAppointmentAPI,
} from "../../api/appointment.api";
import { createPaymentAPI } from "../../api/payment.api";
import { redirectToWebpay } from "../../utils/webpay";
import { formatCLP } from "../../constants/pricing";
import Calendar from "../../components/ui/Calendar";

const toISODateLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

function readPendingQuote() {
  try {
    const q = JSON.parse(
      localStorage.getItem("inkhaus_pending_quote")
    );

    const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

    if (
      q?.precio?.min > 0 &&
      Date.now() - (q.fecha || 0) < MAX_AGE
    ) {
      return q;
    }
  } catch (_e) {
    // No hay una cotización válida guardada.
  }

  return null;
}

export default function BookAppointmentPage() {
  const { artistId } = useParams();

  const [artist, setArtist] = useState(null);
  const [loadingArtist, setLoadingArtist] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState(null);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);

  const [tipo, setTipo] = useState("ajuste");
  const [notas, setNotas] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [created, setCreated] = useState(null);
  const [paying, setPaying] = useState(false);
  const [quote] = useState(() => readPendingQuote());

  useEffect(() => {
    getArtistAPI(artistId)
      .then(({ data }) => setArtist(data.info))
      .catch((err) =>
        setError(
          err.response?.data?.message ||
            "No se pudo cargar el artista"
        )
      )
      .finally(() => setLoadingArtist(false));
  }, [artistId]);

  const availableDaysOfWeek = useMemo(() => {
    if (!artist?.horarios?.length) return new Set();

    return new Set(artist.horarios.map((h) => h.dia));
  }, [artist]);

  useEffect(() => {
    if (!selectedDate) return;

    setSelectedTime(null);
    setLoadingTimes(true);
    setError("");

    getAvailabilityAPI(
      artistId,
      toISODateLocal(selectedDate)
    )
      .then(({ data }) => {
        setAvailableTimes(data.info || []);
      })
      .catch((err) => {
        setAvailableTimes([]);
        setError(
          err.response?.data?.message ||
            "No se pudo cargar la disponibilidad"
        );
      })
      .finally(() => setLoadingTimes(false));
  }, [selectedDate, artistId]);

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return;

    setError("");
    setSubmitting(true);

    try {
      const { data } = await createAppointmentAPI({
        artista: artistId,
        tipo,
        date: toISODateLocal(selectedDate),
        time: selectedTime,
        notas,
        cotizacion: quote
          ? {
              zona: quote.zona,
              tamanio: quote.tamanio,
              estilo: quote.estilo,
              min: quote.precio.min,
              max: quote.precio.max,
            }
          : undefined,
      });

      setCreated(data.info);
      localStorage.removeItem("inkhaus_pending_quote");
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo agendar la cita"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async () => {
    if (!created?._id || paying) return;

    setPaying(true);
    setError("");

    try {
      const { data } = await createPaymentAPI(created._id);

      const paymentUrl = data?.info?.url;
      const paymentToken = data?.info?.token;

      if (!paymentUrl || !paymentToken) {
        throw new Error(
          "El servidor no devolvió los datos necesarios para iniciar el pago."
        );
      }

      redirectToWebpay(paymentUrl, paymentToken);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "No se pudo iniciar el pago"
      );
      setPaying(false);
    }
  };

  if (loadingArtist) {
    return (
      <div className="flex justify-center min-h-screen px-12 pt-28">
        <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen px-12 text-center pt-28 text-muted">
        {error || "Artista no encontrado."}{" "}
        <Link to="/artists" className="underline text-red">
          Volver a artistas
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
        <div className="max-w-md mx-auto text-center">
          <h1 className="mb-3 text-3xl tracking-wide font-display">
            ¡CITA <span className="text-red">RESERVADA</span>!
          </h1>

          <p className="mb-2 text-sm text-muted">
            Tu cita con {artist.nombre_artistico} quedó registrada
            para el{" "}
            {selectedDate.toLocaleDateString("es-CL")} a las{" "}
            {selectedTime}.
          </p>

          <p className="mb-8 text-sm text-muted">
            Para confirmar tu reserva, paga el abono de{" "}
            <strong className="text-paper">
              {formatCLP(created?.abono_monto ?? 0)}
            </strong>
            . Este monto se descuenta del valor final del tatuaje,
            según las condiciones de InkHaus.
          </p>

          {error && (
            <div className="px-4 py-3 mb-4 text-sm border bg-red/10 border-red/30 text-red">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handlePay}
              disabled={paying || !created?._id}
              className="py-4 text-sm font-medium tracking-widest text-white uppercase bg-red hover:bg-red-hover disabled:opacity-60"
            >
              {paying
                ? "Redirigiendo a Webpay..."
                : "Pagar abono con Webpay"}
            </button>

            <Link
              to="/mi-cuenta"
              className="py-3 text-xs tracking-widest uppercase border border-white/15 text-paper hover:border-white/30"
            >
              Pagar después
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="mb-1 text-4xl tracking-wide font-display">
          AGENDAR <span className="text-red">CITA</span>
        </h1>

        <p className="mb-8 text-sm text-muted">
          Con {artist.nombre_artistico}
        </p>

        {error && (
          <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">
            {error}
          </div>
        )}

        {availableDaysOfWeek.size === 0 ? (
          <p className="text-sm text-muted">
            Este artista todavía no tiene horarios de atención
            configurados.
          </p>
        ) : (
          <>
            <div className="mb-3 text-xs tracking-widest uppercase text-muted">
              Tipo de cita
            </div>

            <div className="flex gap-2 mb-8">
              <button
                type="button"
                onClick={() => setTipo("ajuste")}
                className={`flex-1 py-3 text-xs uppercase tracking-widest border transition-colors ${
                  tipo === "ajuste"
                    ? "bg-red border-red text-white"
                    : "border-white/15 text-muted hover:border-white/30"
                }`}
              >
                Revisión de diseño
              </button>

              <button
                type="button"
                onClick={() => setTipo("sesion")}
                className={`flex-1 py-3 text-xs uppercase tracking-widest border transition-colors ${
                  tipo === "sesion"
                    ? "bg-red border-red text-white"
                    : "border-white/15 text-muted hover:border-white/30"
                }`}
              >
                Sesión de tatuaje
              </button>
            </div>

            <Calendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              availableDaysOfWeek={availableDaysOfWeek}
            />

            {selectedDate && (
              <div className="mt-8">
                <div className="mb-3 text-xs tracking-widest uppercase text-muted">
                  Horarios disponibles
                </div>

                {loadingTimes ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 rounded-full border-red border-t-transparent animate-spin" />
                  </div>
                ) : availableTimes.length === 0 ? (
                  <p className="text-sm text-muted">
                    No quedan horas disponibles ese día. Prueba
                    otra fecha.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTimes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={`px-4 py-2 text-xs border transition-colors ${
                          selectedTime === t
                            ? "bg-red border-red text-white"
                            : "border-white/15 text-paper hover:border-white/30"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedDate && selectedTime && (
              <div className="mt-8">
                <label className="block mb-2 text-xs tracking-widest uppercase text-muted">
                  Notas (opcional)
                </label>

                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="Algo que el artista deba saber antes de la cita"
                  className="w-full px-4 py-3 text-sm transition-colors border outline-none bg-paper/5 border-paper/10 focus:border-red text-paper placeholder-muted"
                />

                {quote && (
                  <div className="p-3 mt-4 text-xs border border-white/10 text-muted">
                    Cotización del asistente:{" "}
                    <span className="text-paper">
                      {quote.zona} ·{" "}
                      {quote.tamanioLabel || quote.tamanio} ·{" "}
                      {quote.estilo}
                    </span>{" "}
                    ({formatCLP(quote.precio.min)} –{" "}
                    {formatCLP(quote.precio.max)}). Se usará para
                    calcular el abono.
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="w-full py-4 mt-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60"
                >
                  {submitting
                    ? "Agendando..."
                    : "Confirmar cita"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}