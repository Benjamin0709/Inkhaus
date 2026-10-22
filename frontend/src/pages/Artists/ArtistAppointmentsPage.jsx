import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getAllAppointmentsAPI,
  updateAppointmentAPI,
  getAvailabilityAPI,
} from "../../api/appointment.api";
import Calendar from "../../components/ui/Calendar";
import { formatCLP } from "../../constants/pricing";

const ESTADO_LABEL = {
  pendiente: {
    text: "Pendiente",
    cls: "text-yellow-400 border-yellow-400/40 bg-yellow-400/5",
  },
  confirmada: {
    text: "Confirmada",
    cls: "text-green-400 border-green-400/40 bg-green-400/5",
  },
  cancelada: {
    text: "Cancelada",
    cls: "text-red/70 border-red/40 bg-red/5",
  },
  completada: {
    text: "Completada",
    cls: "text-muted border-white/20 bg-white/5",
  },
};

const toISODateLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function ArtistAppointmentsPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroArtista, setFiltroArtista] = useState("todos");

  // Reagendar
  const [reagendandoId, setReagendandoId] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState(null);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [nuevaHora, setNuevaHora] = useState(null);
  const [loadingHoras, setLoadingHoras] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");

    getAllAppointmentsAPI()
      .then(({ data }) => setCitas(data.info || []))
      .catch((err) =>
        setError(
          err.response?.data?.message ||
            "No se pudieron cargar las citas"
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Lista de artistas presentes en las citas.
  const artistasEnCitas = useMemo(() => {
    const map = new Map();

    citas.forEach((c) => {
      if (c.artista?._id) {
        map.set(c.artista._id, c.artista.nombre_artistico);
      }
    });

    return Array.from(map, ([id, nombre]) => ({ id, nombre }));
  }, [citas]);

  const filtered = useMemo(() => {
    return citas.filter((c) => {
      if (filtroEstado !== "todas" && c.estado !== filtroEstado) {
        return false;
      }

      if (
        isAdmin &&
        filtroArtista !== "todos" &&
        c.artista?._id !== filtroArtista
      ) {
        return false;
      }

      return true;
    });
  }, [citas, filtroEstado, filtroArtista, isAdmin]);

  const ahora = new Date();

  const proximas = filtered.filter(
    (c) =>
      new Date(c.fecha_hora) >= ahora &&
      c.estado !== "cancelada"
  );

  const pasadas = filtered.filter(
    (c) =>
      new Date(c.fecha_hora) < ahora ||
      c.estado === "cancelada"
  );

  // Acciones
  const handleConfirm = async (id) => {
    setActingId(id);
    setError("");

    try {
      await updateAppointmentAPI(id, { estado: "confirmada" });
      load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo confirmar la cita"
      );
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (id) => {
    if (
      !window.confirm(
        "¿Cancelar esta cita? Se notificará al cliente."
      )
    ) {
      return;
    }

    setActingId(id);
    setError("");

    try {
      await updateAppointmentAPI(id, { estado: "cancelada" });
      load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo cancelar la cita"
      );
    } finally {
      setActingId(null);
    }
  };

  const handleComplete = async (id) => {
    setActingId(id);
    setError("");

    try {
      await updateAppointmentAPI(id, { estado: "completada" });
      load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo marcar como completada"
      );
    } finally {
      setActingId(null);
    }
  };

  // Reagendar
  const startReschedule = (cita) => {
    setReagendandoId(cita._id);
    setNuevaFecha(null);
    setNuevaHora(null);
    setHorasDisponibles([]);
  };

  const cancelReschedule = () => {
    setReagendandoId(null);
    setNuevaFecha(null);
    setNuevaHora(null);
    setHorasDisponibles([]);
  };

  const handlePickDate = (cita, date) => {
    setNuevaFecha(date);
    setNuevaHora(null);
    setLoadingHoras(true);

    getAvailabilityAPI(
      cita.artista._id,
      toISODateLocal(date)
    )
      .then(({ data }) => setHorasDisponibles(data.info || []))
      .catch(() => setHorasDisponibles([]))
      .finally(() => setLoadingHoras(false));
  };

  const confirmReschedule = async (id) => {
    if (!nuevaFecha || !nuevaHora) return;

    setActingId(id);
    setError("");

    try {
      await updateAppointmentAPI(id, {
        date: toISODateLocal(nuevaFecha),
        time: nuevaHora,
      });

      cancelReschedule();
      load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo reagendar la cita"
      );
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center min-h-screen px-12 pt-28">
        <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="mb-1 text-4xl tracking-wide font-display">
          {isAdmin ? "TODAS LAS" : "MI"}{" "}
          <span className="text-red">AGENDA</span>
        </h1>

        <p className="mb-8 text-sm text-muted">
          {isAdmin
            ? "Gestiona las citas de todos los artistas"
            : `Citas agendadas contigo, ${user?.name}`}
        </p>

        {error && (
          <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">
            {error}
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-8">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="px-4 py-2 text-xs border outline-none bg-ink2 border-white/10 text-paper focus:border-red"
          >
            <option value="todas" className="bg-ink2 text-paper">
              Todos los estados
            </option>
            <option value="pendiente" className="bg-ink2 text-paper">
              Pendientes
            </option>
            <option value="confirmada" className="bg-ink2 text-paper">
              Confirmadas
            </option>
            <option value="cancelada" className="bg-ink2 text-paper">
              Canceladas
            </option>
            <option value="completada" className="bg-ink2 text-paper">
              Completadas
            </option>
          </select>

          {isAdmin && artistasEnCitas.length > 0 && (
            <select
              value={filtroArtista}
              onChange={(e) => setFiltroArtista(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="px-4 py-2 text-xs border outline-none bg-ink2 border-white/10 text-paper focus:border-red"
            >
              <option value="todos" className="bg-ink2 text-paper">
                Todos los artistas
              </option>

              {artistasEnCitas.map((a) => (
                <option
                  key={a.id}
                  value={a.id}
                  className="bg-ink2 text-paper"
                >
                  {a.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-sm text-center text-muted">
            No hay citas que coincidan con este filtro.
          </p>
        ) : (
          <>
            {proximas.length > 0 && (
              <div className="mb-10">
                <h2 className="mb-4 text-xs tracking-widest uppercase text-muted">
                  Próximas ({proximas.length})
                </h2>

                <div className="space-y-3">
                  {proximas.map((c) => (
                    <CitaRow
                      key={c._id}
                      cita={c}
                      isAdmin={isAdmin}
                      acting={actingId === c._id}
                      onConfirm={() => handleConfirm(c._id)}
                      onCancel={() => handleCancel(c._id)}
                      onComplete={() => handleComplete(c._id)}
                      reagendando={reagendandoId === c._id}
                      onStartReschedule={() => startReschedule(c)}
                      onCancelReschedule={cancelReschedule}
                      onPickDate={(date) => handlePickDate(c, date)}
                      nuevaFecha={nuevaFecha}
                      horasDisponibles={horasDisponibles}
                      loadingHoras={loadingHoras}
                      nuevaHora={nuevaHora}
                      onPickHora={setNuevaHora}
                      onConfirmReschedule={() =>
                        confirmReschedule(c._id)
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {pasadas.length > 0 && (
              <div>
                <h2 className="mb-4 text-xs tracking-widest uppercase text-muted">
                  Historial ({pasadas.length})
                </h2>

                <div className="space-y-3 opacity-70">
                  {pasadas.map((c) => (
                    <CitaRow
                      key={c._id}
                      cita={c}
                      isAdmin={isAdmin}
                      readOnly
                    />
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

function CitaRow({
  cita,
  isAdmin,
  readOnly,
  acting,
  onConfirm,
  onCancel,
  onComplete,
  reagendando,
  onStartReschedule,
  onCancelReschedule,
  onPickDate,
  nuevaFecha,
  horasDisponibles,
  loadingHoras,
  nuevaHora,
  onPickHora,
  onConfirmReschedule,
}) {
  const fecha = new Date(cita.fecha_hora);
  const estado = ESTADO_LABEL[cita.estado] || ESTADO_LABEL.pendiente;

  const puedeGestionar =
    !readOnly &&
    ["pendiente", "confirmada"].includes(cita.estado);

  // El campo del modelo es abono_pagada; sena_* se mantiene por registros antiguos.
  const abonoPagado =
    cita.abono_pagada ?? cita.sena_pagada ?? false;

  const abonoMonto =
    cita.abono_monto ?? cita.sena_monto ?? 0;

  return (
    <div className="border border-white/10">
      <div className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="text-sm text-paper">
            {cita.cliente?.name || "Cliente"}

            {isAdmin && cita.artista?.nombre_artistico && (
              <span className="ml-2 text-xs text-muted">
                · con {cita.artista.nombre_artistico}
              </span>
            )}
          </div>

          <div className="text-xs text-muted">
            {fecha.toLocaleDateString("es-CL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            ·{" "}
            {fecha.toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          <div className="text-[10px] uppercase tracking-widest text-muted mt-1">
            {cita.tipo === "ajuste"
              ? "Ajuste de diseño"
              : "Sesión de tatuaje"}
          </div>

          {/* Estado del abono */}
          <div className="mt-1 text-[11px]">
            {abonoPagado ? (
              <span className="text-green-400">
                Abono pagado · {formatCLP(abonoMonto)}
              </span>
            ) : (
              <span className="text-yellow-400">
                Abono pendiente
                {abonoMonto
                  ? ` · ${formatCLP(abonoMonto)}`
                  : ""}
              </span>
            )}
          </div>

          {/* Cotización asociada a la cita */}
          {cita.cotizacion?.zona && (
            <div className="text-[11px] text-muted mt-1">
              Cotización: {cita.cotizacion.zona} ·{" "}
              {cita.cotizacion.tamanio} ·{" "}
              {cita.cotizacion.estilo}
            </div>
          )}

          {cita.cliente?.email && (
            <a
              href={`mailto:${cita.cliente.email}`}
              className="text-[11px] text-muted hover:text-paper underline underline-offset-2"
            >
              {cita.cliente.email}
            </a>
          )}

          {cita.notas && (
            <div className="mt-2 text-xs italic px-3 py-1.5 bg-white/5 text-paper/80 border-l-2 border-white/15">
              "{cita.notas}"
            </div>
          )}
        </div>

        <div className="flex flex-col items-end flex-shrink-0 gap-2">
          <span
            className={`text-[10px] uppercase tracking-widest border px-2 py-1 ${estado.cls}`}
          >
            {estado.text}
          </span>

          {puedeGestionar && (
            <div className="flex flex-wrap justify-end gap-2">
              {cita.estado === "pendiente" && (
                <button
                  onClick={onConfirm}
                  disabled={acting}
                  className="text-[10px] uppercase tracking-widest text-green-400 hover:underline disabled:opacity-50"
                >
                  {acting ? "..." : "Confirmar"}
                </button>
              )}

              {cita.estado === "confirmada" && (
                <button
                  onClick={onComplete}
                  disabled={acting}
                  className="text-[10px] uppercase tracking-widest text-muted hover:text-paper hover:underline disabled:opacity-50"
                >
                  Marcar completada
                </button>
              )}

              <button
                onClick={
                  reagendando
                    ? onCancelReschedule
                    : onStartReschedule
                }
                disabled={acting}
                className="text-[10px] uppercase tracking-widest text-paper/70 hover:text-paper hover:underline disabled:opacity-50"
              >
                {reagendando ? "Cerrar" : "Reagendar"}
              </button>

              <button
                onClick={onCancel}
                disabled={acting}
                className="text-[10px] uppercase tracking-widest text-red hover:underline disabled:opacity-50"
              >
                {acting ? "..." : "Cancelar"}
              </button>
            </div>
          )}
        </div>
      </div>

      {reagendando && (
        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
          <div className="mb-3 text-xs tracking-widest uppercase text-muted">
            Elige nueva fecha y hora
          </div>

          <Calendar
            selectedDate={nuevaFecha}
            onSelectDate={onPickDate}
          />

          {nuevaFecha && (
            <div className="mt-4">
              {loadingHoras ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 rounded-full border-red border-t-transparent animate-spin" />
                </div>
              ) : horasDisponibles.length === 0 ? (
                <p className="text-xs text-muted">
                  Sin horas disponibles ese día.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {horasDisponibles.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onPickHora(t)}
                      className={`px-3 py-1.5 text-xs border transition-colors ${
                        nuevaHora === t
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

          {nuevaFecha && nuevaHora && (
            <button
              onClick={onConfirmReschedule}
              disabled={acting}
              className="w-full py-3 mt-4 text-xs font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60"
            >
              {acting ? "Reagendando..." : "Confirmar nueva fecha"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
