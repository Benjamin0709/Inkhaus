import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllConversationsAdminAPI, closeConversationAPI } from "../../api/conversation.api";
import ConversationThread from "./ConversationThread";

const POLL_MS = 15000;

const TABS = [
  { id: "todas",   label: "Todas" },
  { id: "artistas", label: "Con artistas" },
  { id: "equipo",  label: "Equipo / Chatbot" },
];

const fmt = (d) =>
  new Date(d).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });

/**
 * Panel de admin: lista TODAS las conversaciones del chat en vivo
 * y permite abrirlas.
 *  - Chats cliente ↔ artista: solo lectura (supervisión).
 *  - Chats del equipo (sin artista, ej. fallback del chatbot): el admin puede responder.
 */
export default function AdminConversations() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [tab, setTab]           = useState("todas");
  const [estado, setEstado]     = useState("todos");
  const [query, setQuery]       = useState("");
  const [activeId, setActiveId] = useState(null);
  const [closing, setClosing]   = useState(false);

  const load = useCallback(() => {
    getAllConversationsAdminAPI()
      .then(({ data }) => { setItems(data.info || []); setError(""); })
      .catch((err) => setError(err.response?.data?.message || "No se pudieron cargar las conversaciones"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (tab === "artistas" && !c.artista) return false;
      if (tab === "equipo" && c.artista) return false;
      if (estado !== "todos" && c.estado !== estado) return false;
      if (!q) return true;
      return [c.cliente?.name, c.cliente?.email, c.artista?.nombre_artistico, c.ultimo_mensaje]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [items, tab, estado, query]);

  const active = items.find((c) => c._id === activeId) || null;

  const handleClose = async () => {
    if (!active || !window.confirm("¿Cerrar esta conversación?")) return;
    setClosing(true);
    try {
      await closeConversationAPI(active._id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cerrar la conversación");
    } finally {
      setClosing(false);
    }
  };

  const selectCls = "px-3 py-2 text-xs border outline-none bg-ink2 border-white/10 text-paper focus:border-red";

  return (
    <section>
      <h2 className="pb-3 mb-6 text-2xl tracking-wider border-b font-display border-paper/10">
        Mensajes directos a artistas
      </h2>

      {error && (
        <div className="px-4 py-3 mb-4 text-sm border bg-red/10 border-red/30 text-red">{error}</div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex border border-white/10">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-[11px] tracking-widest uppercase transition-colors ${
                tab === t.id ? "bg-red text-white" : "text-muted hover:text-paper"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ colorScheme: "dark" }} className={selectCls}>
          <option value="todos">Todos los estados</option>
          <option value="abierta">Abiertas</option>
          <option value="cerrada">Cerradas</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente, artista o mensaje..."
          className="flex-1 min-w-[200px] px-3 py-2 text-xs border outline-none bg-paper/5 border-white/10 text-paper placeholder-muted focus:border-red"
        />
        <span className="text-xs text-muted">{filtered.length} de {items.length}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Lista */}
        <div className="border border-white/10 max-h-[560px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 rounded-full border-red border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-center text-muted">
              {items.length === 0 ? "Aún no hay conversaciones." : "Ninguna conversación coincide con los filtros."}
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => setActiveId(c._id)}
                className={`w-full text-left p-4 border-b border-white/10 transition-colors ${
                  c._id === activeId ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm truncate text-paper">{c.cliente?.name || "Cliente eliminado"}</div>
                    <div className="text-[10px] tracking-widest uppercase truncate text-red">
                      {c.artista ? `→ ${c.artista.nombre_artistico}` : "→ Equipo Ink Haus"}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 text-[9px] tracking-widest uppercase border ${
                    c.estado === "abierta" ? "border-green-700/50 text-green-400" : "border-white/15 text-muted"
                  }`}>
                    {c.estado}
                  </span>
                </div>
                <div className="mt-1 text-xs truncate text-muted">{c.ultimo_mensaje || "Sin mensajes aún"}</div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted">
                  <span>{fmt(c.ultima_actividad)}</span>
                  {c.origen === "chatbot_fallback" && (
                    <span className="px-1.5 py-0.5 border border-white/15 tracking-widest uppercase text-[9px]">Chatbot</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Conversación */}
        <div className="flex flex-col border border-white/10 h-[560px]">
          {!active ? (
            <div className="flex items-center justify-center flex-1 p-6 text-sm text-center text-muted">
              Selecciona una conversación para ver los mensajes.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
                <div className="min-w-0">
                  <div className="text-sm truncate text-paper">
                    {active.cliente?.name || "Cliente eliminado"}
                    <span className="text-muted"> · {active.cliente?.email}</span>
                  </div>
                  <div className="text-[10px] tracking-widest uppercase text-red">
                    {active.artista ? `Con ${active.artista.nombre_artistico} · solo lectura` : "Bandeja del equipo · puedes responder"}
                  </div>
                </div>
                {active.estado === "abierta" && (
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={closing}
                    className="flex-shrink-0 px-3 py-1.5 text-[10px] tracking-widest uppercase border border-white/15 text-muted hover:border-red hover:text-red disabled:opacity-50"
                  >
                    {closing ? "..." : "Cerrar"}
                  </button>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <ConversationThread
                  key={active._id}
                  conversationId={active._id}
                  onSent={load}
                  readOnly={Boolean(active.artista)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
