import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getConversationMessagesAPI, sendConversationMessageAPI } from "../../api/conversation.api";

const POLL_MS = 4000;

export default function ConversationThread({ conversationId, onSent }) {
  const { user } = useAuth();
  const myId = user?.id || user?._id;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const load = useCallback(() => {
    getConversationMessagesAPI(conversationId)
      .then(({ data }) => setMessages(data.info || []))
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    setMessages([]);
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const v = text.trim();
    if (!v) return;
    setSending(true);
    setText("");
    try {
      await sendConversationMessageAPI(conversationId, v);
      load();
      onSent?.();
    } catch (_e) {
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 p-4 space-y-2 overflow-y-auto">
        {messages.length === 0 && (
          <p className="mt-6 text-xs text-center text-muted">Escribe el primer mensaje de esta conversación.</p>
        )}
        {messages.map((m) => {
          const propio = (m.emisor?._id || m.emisor) === myId;
          return (
            <div key={m._id} className={`flex flex-col ${propio ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                propio ? "bg-red text-white rounded-br-sm" : "bg-white/5 border border-white/10 text-paper rounded-bl-sm"
              }`}>
                {m.texto}
              </div>
              <span className="text-[9px] text-muted mt-0.5">
                {new Date(m.createdAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-white/10">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-3 py-2 text-sm border outline-none bg-white/5 border-white/10 text-paper placeholder:text-muted focus:border-red"
        />
        <button onClick={handleSend} disabled={sending || !text.trim()}
          className="px-4 py-2 text-xs tracking-widest text-white uppercase bg-red hover:bg-red-hover disabled:opacity-40">
          Enviar
        </button>
      </div>
    </div>
  );
}