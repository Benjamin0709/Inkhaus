import { useEffect, useState } from "react";
import { getUnansweredQueriesAPI, updateUnansweredQueryAPI } from "../../api/chatbotQuery.api";

export default function ReportsPage() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("todas"); // todas | pendientes | atendidas
  const [savingId, setSavingId] = useState(null);
  const [notaDraft, setNotaDraft] = useState({});

  const load = () => {
    setLoading(true);
    getUnansweredQueriesAPI()
      .then(({ data }) => setQueries(data.info || []))
      .catch((err) => setError(err.response?.data?.message || "No se pudieron cargar los reportes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = queries.filter((q) => {
    if (filtro === "pendientes") return !q.atendida;
    if (filtro === "atendidas") return q.atendida;
    return true;
  });

  const toggleAtendida = async (q) => {
    setSavingId(q._id);
    try {
      const { data } = await updateUnansweredQueryAPI(q._id, { atendida: !q.atendida });
      setQueries((prev) => prev.map((x) => (x._id === q._id ? data.info : x)));
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo actualizar");
    } finally {
      setSavingId(null);
    }
  };

  const saveNota = async (q) => {
    const nota = notaDraft[q._id] ?? q.nota_admin ?? "";
    setSavingId(q._id);
    try {
      const { data } = await updateUnansweredQueryAPI(q._id, { nota_admin: nota });
      setQueries((prev) => prev.map((x) => (x._id === q._id ? data.info : x)));
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo guardar la nota");
    } finally {
      setSavingId(null);
    }
  };

  const pendientesCount = queries.filter((q) => !q.atendida).length;

  return (
    <div className="min-h-screen px-6 pt-24 pb-20 md:px-12">
      <h1 className="mb-2 text-5xl tracking-wide font-display">
        REPORTES
      </h1>
      <p className="mb-10 text-sm text-muted">
        Preguntas que el chatbot no pudo responder y mensajes directos a artistas
      </p>

      {/* ── Preguntas sin respuesta del chatbot ─────────────────────── */}
      <section className="mb-14">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-6 border-b border-paper/10">
          <h2 className="text-2xl tracking-wider font-display">
            Preguntas del chatbot sin respuesta
            {pendientesCount > 0 && (
              <span className="ml-3 text-xs align-middle text-red">({pendientesCount} pendientes)</span>
            )}
          </h2>
          <div className="flex gap-2">
            {[
              { key: "todas", label: "Todas" },
              { key: "pendientes", label: "Pendientes" },
              { key: "atendidas", label: "Atendidas" },
            ].map((f) => (
              <button key={f.key} onClick={() => setFiltro(f.key)}
                className={`px-3 py-1.5 text-xs uppercase tracking-widest border transition-colors ${
                  filtro === f.key ? "bg-red border-red text-white" : "border-paper/20 text-muted hover:border-paper/50"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted">
            {filtro === "todas" ? "Nadie le ha hecho al chatbot una pregunta sin respuesta todavía." : "No hay registros en este filtro."}
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((q) => (
              <div key={q._id} className={`border p-4 ${q.atendida ? "border-white/10 opacity-60" : "border-red/30"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-paper">"{q.mensaje}"</div>
                    <div className="mt-1 text-xs text-muted">
                      {new Date(q.createdAt).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}
                      {q.pagina && <span> · en {q.pagina}</span>}
                    </div>
                    {(q.nombre || q.email) && (
                      <div className="mt-1 text-xs text-muted">
                        {q.nombre && <span>{q.nombre}</span>}
                        {q.email && (
                          <a href={`mailto:${q.email}`} className="ml-1 underline underline-offset-2 hover:text-paper">
                            {q.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => toggleAtendida(q)} disabled={savingId === q._id}
                    className={`text-[10px] uppercase tracking-widest border px-2 py-1 flex-shrink-0 transition-colors ${
                      q.atendida
                        ? "text-green-400 border-green-400/40"
                        : "text-yellow-400 border-yellow-400/40 hover:bg-yellow-400/10"
                    } disabled:opacity-50`}>
                    {savingId === q._id ? "..." : q.atendida ? "Atendida" : "Pendiente"}
                  </button>
                </div>

                <div className="flex gap-2 mt-3">
                  <input
                    value={notaDraft[q._id] ?? q.nota_admin ?? ""}
                    onChange={(e) => setNotaDraft((prev) => ({ ...prev, [q._id]: e.target.value }))}
                    placeholder="Nota interna (ej: contactado por correo, se resolvió, etc.)"
                    className="flex-1 px-3 py-1.5 text-xs bg-white/5 border border-white/10 focus:border-red outline-none text-paper placeholder-muted"
                  />
                  <button onClick={() => saveNota(q)} disabled={savingId === q._id}
                    className="px-3 py-1.5 text-xs uppercase tracking-widest border border-white/15 text-muted hover:border-white/30 hover:text-paper disabled:opacity-50">
                    Guardar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Mensajes directos a artistas (chat en vivo) ─────────────── */}
      <section>
        <h2 className="pb-3 mb-6 text-2xl tracking-wider border-b font-display border-paper/10">
          Mensajes directos a artistas
        </h2>
        <div className="p-8 border cursor-not-allowed border-paper/10 opacity-40">
          <div className="mb-2 text-xl tracking-wider font-display">Chat en vivo</div>
          <div className="text-xs tracking-widest uppercase text-muted">
            Próximamente — requiere el sistema de mensajería en tiempo real
          </div>
        </div>
      </section>
    </div>
  );
}