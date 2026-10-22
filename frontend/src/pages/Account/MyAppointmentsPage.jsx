import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyAppointmentsAPI, cancelAppointmentAPI } from "../../api/appointment.api";

const ESTADO_LABEL = {
  pendiente: { text: "Pendiente", cls: "text-yellow-400 border-yellow-400/40" },
  confirmada: { text: "Confirmada", cls: "text-green-400 border-green-400/40" },
  cancelada: { text: "Cancelada", cls: "text-red/70 border-red/40" },
  completada: { text: "Completada", cls: "text-muted border-white/20" },
};

export default function MyAppointmentsPage() {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getMyAppointmentsAPI()
      .then(({ data }) => setCitas(data.info || []))
      .catch(() => setCitas([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("¿Cancelar esta cita?")) return;
    setCancelingId(id);
    setError("");
    try {
      await cancelAppointmentAPI(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cancelar la cita");
    } finally {
      setCancelingId(null);
    }
  };

  const ahora = new Date();
  const proximas = citas.filter((c) => new Date(c.fecha_hora) >= ahora && c.estado !== "cancelada");
  const pasadas = citas.filter((c) => new Date(c.fecha_hora) < ahora || c.estado === "cancelada");

  if (loading) {
    return (
      <div className="flex justify-center min-h-screen px-12 pt-28">
        <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="mb-1 text-4xl tracking-wide font-display">MIS <span className="text-red">CITAS</span></h1>
        <p className="mb-8 text-sm text-muted">Gestiona tus reservas con Ink Haus</p>

        {error && <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}

        {citas.length === 0 ? (
          <div className="py-16 text-center text-muted">
            <p className="mb-4 text-sm">Aún no tienes citas agendadas.</p>
            <Link to="/artists" className="inline-block px-6 py-3 text-xs tracking-widest text-white uppercase bg-red hover:bg-red-hover">
              Ver artistas
            </Link>
          </div>
        ) : (
          <>
            {proximas.length > 0 && (
              <div className="mb-10">
                <h2 className="mb-4 text-xs tracking-widest uppercase text-muted">Próximas</h2>
                <div className="space-y-3">
                  {proximas.map((c) => (
                    <CitaCard key={c._id} cita={c} onCancel={handleCancel} canceling={cancelingId === c._id} />
                  ))}
                </div>
              </div>
            )}
            {pasadas.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs tracking-widest uppercase text-muted">Historial</h2>
                <div className="space-y-3 opacity-60">
                  {pasadas.map((c) => (
                    <CitaCard key={c._id} cita={c} onCancel={handleCancel} canceling={cancelingId === c._id} readOnly />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CitaCard({ cita, onCancel, canceling, readOnly }) {
  const fecha = new Date(cita.fecha_hora);
  const estado = ESTADO_LABEL[cita.estado] || ESTADO_LABEL.pendiente;
  const puedeCancelar = !readOnly && ["pendiente", "confirmada"].includes(cita.estado);

  return (
    <div className="flex items-center justify-between p-4 border border-white/10">
      <div>
        <div className="text-sm text-paper">{cita.artista?.nombre_artistico || "Artista"}</div>
        <div className="text-xs text-muted">
          {fecha.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })} · {fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted mt-1">
          {cita.tipo === "ajuste" ? "Revisión de diseño" : "Sesión de tatuaje"}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className={`text-[10px] uppercase tracking-widest border px-2 py-1 ${estado.cls}`}>{estado.text}</span>
        {puedeCancelar && (
          <button onClick={() => onCancel(cita._id)} disabled={canceling}
            className="text-[10px] uppercase tracking-widest text-red hover:underline disabled:opacity-50">
            {canceling ? "..." : "Cancelar"}
          </button>
        )}
      </div>
    </div>
  );
}