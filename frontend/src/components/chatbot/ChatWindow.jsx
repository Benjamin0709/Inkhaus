import { useEffect, useRef, useState } from "react";
import { formatCLP } from "./chatbotEngine";

function QuoteCard({ quote }) {
  return (
    <div className="max-w-[92%]">
      <div className="text-[11px] text-muted mb-1">Resumen de tu solicitud</div>
      <div className="p-3 border rounded-lg bg-ink border-gold/30">
        <Row label="Zona" value={quote.zona} />
        <Row label="Tamaño" value={quote.tamanioLabel} />
        <Row label="Estilo" value={quote.estilo} />
        <Row label="Artista" value={quote.artista} />
        <div className="my-2 border-t border-white/10" />
        <div className="text-[10px] text-muted">
          {quote.esEstimado ? "Precio estimado (referencial)" : "Precio estimado"}
        </div>
        <div className="text-lg font-medium text-gold my-0.5">
          {formatCLP(quote.min)} – {formatCLP(quote.max)}
        </div>
        <div className="text-[10px] text-muted/70">* Precio final en consulta presencial</div>
      </div>
    </div>
  );
}
function GalleryRow({ items }) {
  return (
    <div className="flex gap-2 overflow-x-auto max-w-[92%] pb-1">
      {items.map((it, i) => (
        <div key={i} className="flex-shrink-0 w-20 h-20 overflow-hidden border rounded-md border-white/10 bg-ink2">
          {it.imagen_url && (
            <img src={it.imagen_url} alt={it.titulo} className="object-cover w-full h-full" />
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-[11px] text-muted mt-0.5">
      <span>{label}</span>
      <span className="font-medium text-paper">{value}</span>
    </div>
  );
}

function OptionsRow({ options, answered, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {options.map((o) => {
        const isSelected = answered === o;
        const disabled = !!answered;
        return (
          <button
            key={o}
            disabled={disabled}
            onClick={() => onPick(o)}
            className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors leading-tight
              ${
                isSelected
                  ? "bg-red text-white border-red"
                  : "text-paper/90 border-white/20 bg-white/5 hover:bg-red hover:text-white hover:border-red"
              }
              ${disabled && !isSelected ? "opacity-30 cursor-default" : "cursor-pointer"}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function ChatWindow({ messages, inputEnabled, onOption, onSend }) {
  const scrollRef = useRef(null);
  const [val, setVal] = useState("");

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const submit = () => {
    if (!val.trim()) return;
    onSend(val);
    setVal("");
  };

  return (
     <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-ink">
      <div ref={scrollRef} className="flex flex-col flex-1 gap-2 px-3 py-3 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col gap-1">
            {m.text && (
              <div
                className={`max-w-[92%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                  m.from === "user"
                    ? "self-end bg-red text-white rounded-br-sm"
                    : "self-start bg-white/5 border border-white/10 text-paper rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            )}
            {m.quote && <QuoteCard quote={m.quote} />}
            {m.gallery && <GalleryRow items={m.gallery} />}
            {m.options && (
              <OptionsRow options={m.options} answered={m.answered} onPick={(o) => onOption(m.id, o)} />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-t border-white/10 bg-ink2 flex-shrink-0">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={!inputEnabled}
          placeholder={inputEnabled ? "Escribe aquí..." : "Elegí una opción arriba…"}
          className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] bg-white/5 border border-white/10 text-paper placeholder:text-muted outline-none disabled:opacity-40"
        />
        <button
          onClick={submit}
          disabled={!inputEnabled}
          aria-label="Enviar"
          className="flex items-center justify-center flex-shrink-0 text-white transition-colors rounded-md w-7 h-7 bg-red hover:bg-red-hover disabled:opacity-30"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2 15 22l-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
