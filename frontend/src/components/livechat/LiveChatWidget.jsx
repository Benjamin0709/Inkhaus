import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLiveChat } from "../../context/LiveChatContext";
import { getMyConversationsAPI, getConversationMessagesAPI, sendConversationMessageAPI, createConversationAPI } from "../../api/conversation.api";
import { getArtistsAPI } from "../../api/artists.api";

const HIDDEN_ON = ["/login", "/register"];
const POLL_MESSAGES_MS = 4000;
const POLL_LIST_MS = 15000;

function ChatIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CloseIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LiveChatWidget() {
  const location = useLocation();
  const { user, hasRole } = useAuth();
  const { open, setOpen, pendingConversationId, setPendingConversationId } = useLiveChat();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Cliente: selector para iniciar conversación nueva
  const [artists, setArtists] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newArtistId, setNewArtistId] = useState("");

  const scrollRef = useRef(null);
  const isCliente = !hasRole("artista", "admin");

  const hidden = HIDDEN_ON.includes(location.pathname) || !user;

  // ── Cargar lista de conversaciones ───────────────────────────────
  const loadConversations = useCallback(() => {
    if (!user) return;
    getMyConversationsAPI()
      .then(({ data }) => setConversations(data.info || []))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!open || !user) return;
    loadConversations();
    if (isCliente) {
      getArtistsAPI().then(({ data }) => setArtists(data.info || [])).catch(() => {});
    }
    const t = setInterval(loadConversations, POLL_LIST_MS);
    return () => clearInterval(t);
  }, [open, user, isCliente, loadConversations]);

  // ── Si LiveChatContext pide abrir una conversación específica ────
  useEffect(() => {
    if (open && pendingConversationId) {
      setActiveId(pendingConversationId);
      setPendingConversationId(null);
    }
  }, [open, pendingConversationId, setPendingConversationId]);

  // ── Cargar y hacer polling de mensajes de la conversación activa ──
  const loadMessages = useCallback(() => {
    if (!activeId) return;
    getConversationMessagesAPI(activeId)
      .then(({ data }) => setMessages(data.info || []))
      .catch(() => {});
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages();
    const t = setInterval(loadMessages, POLL_MESSAGES_MS);
    return () => clearInterval(t);
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const v = text.trim();
    if (!v || !activeId) return;
    setSending(true);
    setText("");
    try {
      await sendConversationMessageAPI(activeId, v);
      loadMessages();
      loadConversations();
    } catch (_e) {
      // reintento simple: se puede reintentar manualmente
    } finally {
      setSending(false);
    }
  };

  const handleStartNew = async () => {
    if (!newArtistId) return;
    try {
      const { data } = await createConversationAPI({ artistaId: newArtistId });
      setShowNew(false);
      setNewArtistId("");
      loadConversations();
      setActiveId(data.info._id);
    } catch (_e) {}
  };

  const handleStartTeamChat = async () => {
    try {
      const { data } = await createConversationAPI({});
      setShowNew(false);
      loadConversations();
      setActiveId(data.info._id);
    } catch (_e) {}
  };

  if (hidden) return null;

  const activeConversation = conversations.find((c) => c._id === activeId);

  const conversationLabel = (c) =>
    c.artista?.nombre_artistico || "Equipo Ink Haus";

  const otherPartyLabel = (c) => {
    if (isCliente) return c.artista?.nombre_artistico || "Equipo Ink Haus";
    return c.cliente?.name || "Cliente";
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar mensajes" : "Abrir mensajes"}
        className="fixed z-[997] flex items-center justify-center text-white transition-transform rounded-full shadow-lg bottom-5 right-24 w-14 h-14 bg-ink2 border border-white/15 hover:scale-105 active:scale-95"
      >
        {open ? <CloseIcon className="w-6 h-6" /> : <ChatIcon className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed z-[996] flex flex-col overflow-hidden border shadow-2xl bg-ink2 border-white/10 bottom-0 right-0 left-0 h-[85vh] rounded-t-2xl sm:bottom-24 sm:right-24 sm:left-auto sm:h-[520px] sm:w-[360px] sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-3 border-b border-white/10">
            {activeId ? (
              <button onClick={() => setActiveId(null)} className="flex items-center gap-2 text-sm text-paper">
                ← {activeConversation ? otherPartyLabel(activeConversation) : "Chat"}
              </button>
            ) : (
              <div className="text-sm text-paper">Mensajes</div>
            )}
            {isCliente && !activeId && (
              <button onClick={() => setShowNew((v) => !v)} className="text-xs uppercase tracking-widest text-red hover:underline">
                + Nuevo
              </button>
            )}
          </div>

          {/* Selector de nueva conversación (solo cliente) */}
          {isCliente && !activeId && showNew && (
            <div className="flex-shrink-0 p-3 space-y-2 border-b border-white/10 bg-white/[0.02]">
              <select
                value={newArtistId}
                onChange={(e) => setNewArtistId(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-full px-3 py-2 text-xs border outline-none bg-ink2 border-white/10 text-paper"
              >
                <option value="">Elige un artista…</option>
                {artists.map((a) => (
                  <option key={a._id} value={a._id} className="bg-ink2 text-paper">{a.nombre_artistico}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={handleStartNew} disabled={!newArtistId}
                  className="flex-1 py-2 text-xs tracking-widest text-white uppercase bg-red hover:bg-red-hover disabled:opacity-40">
                  Escribir al artista
                </button>
              </div>
              <button onClick={handleStartTeamChat} className="w-full py-2 text-xs tracking-widest uppercase border border-white/15 text-muted hover:text-paper hover:border-white/30">
                Escribir al equipo
              </button>
            </div>
          )}

          {/* Cuerpo: lista de conversaciones o chat activo */}
          {!activeId ? (
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="p-6 text-xs text-center text-muted">
                  {isCliente ? "Aún no tienes conversaciones. Crea una con \"+ Nuevo\"." : "No tienes conversaciones asignadas por ahora."}
                </p>
              ) : (
                conversations.map((c) => (
                  <button key={c._id} onClick={() => setActiveId(c._id)}
                    className="flex items-center w-full gap-3 p-3 text-left border-b border-white/5 hover:bg-white/5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate text-paper">{isCliente ? conversationLabel(c) : otherPartyLabel(c)}</div>
                      <div className="text-xs truncate text-muted">{c.ultimo_mensaje || "Sin mensajes aún"}</div>
                    </div>
                    {c.origen === "chatbot_fallback" && (
                      <span className="flex-shrink-0 text-[9px] uppercase tracking-widest text-yellow-400 border border-yellow-400/40 px-1.5 py-0.5">
                        Bot
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 p-3 space-y-2 overflow-y-auto">
                {messages.map((m) => {
                  const esPropio = m.emisor?._id === user?.id || m.emisor === user?.id;
                  return (
                    <div key={m._id} className={`flex flex-col ${esPropio ? "items-end" : "items-start"}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                        esPropio ? "bg-red text-white rounded-br-sm" : "bg-white/5 border border-white/10 text-paper rounded-bl-sm"
                      }`}>
                        {m.texto}
                      </div>
                      <span className="text-[9px] text-muted mt-0.5">
                        {new Date(m.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <p className="mt-6 text-xs text-center text-muted">Escribe el primer mensaje de esta conversación.</p>
                )}
              </div>
              <div className="flex items-center flex-shrink-0 gap-1.5 px-2.5 py-2 border-t border-white/10">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] bg-white/5 border border-white/10 text-paper placeholder:text-muted outline-none"
                />
                <button onClick={handleSend} disabled={sending || !text.trim()}
                  className="flex items-center justify-center flex-shrink-0 w-7 h-7 text-white transition-colors rounded-md bg-red hover:bg-red-hover disabled:opacity-30">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 2 15 22l-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}