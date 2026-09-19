import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import BodyViewer3D from "./BodyViewer3D";
import ChatWindow from "./ChatWindow";
import { useChatEngine } from "./useChatEngine";
import { TOTAL_STEPS } from "./chatbotEngine";

// Rutas donde el widget NO debe mostrarse
const HIDDEN_ON = ["/login", "/register"];

function NeedleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M14 3 21 10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6 6 17l-3 4 4-3L18 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 14.5 6 12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 12 8.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
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

export default function ChatbotWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("chat"); // 'chat' | '3d'
  const engine = useChatEngine({ onExit: () => setOpen(false) });

  const hidden = HIDDEN_ON.includes(location.pathname);

  // Arranca la conversación recién la primera vez que se abre el panel
  useEffect(() => {
    if (open) engine.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (hidden) return null;

  const zonaStepActive = engine.progressIndex === 1;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar asistente Ink Haus" : "Abrir asistente Ink Haus"}
        className="fixed bottom-5 right-5 z-[999] w-14 h-14 rounded-full bg-red hover:bg-red-hover
                   shadow-[0_8px_30px_rgba(192,57,43,0.45)] text-white flex items-center justify-center
                   transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <CloseIcon className="w-6 h-6" /> : <NeedleIcon className="w-6 h-6" />}
        {!open && (
          <span className="absolute inset-0 border-2 rounded-full border-red animate-ping opacity-30" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed z-[998] bg-ink2 border border-white/10 shadow-2xl overflow-hidden flex flex-col
                     bottom-0 right-0 left-0 h-[85vh] rounded-t-2xl
                     sm:bottom-24 sm:right-5 sm:left-auto sm:h-[560px] sm:w-[380px] sm:rounded-2xl
                     lg:w-[680px]"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10 bg-ink2 flex-shrink-0">
            <div className="flex items-center justify-center flex-shrink-0 rounded-full w-7 h-7 bg-red">
              <NeedleIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-paper">Asistente Ink Haus</div>
              <div className="text-[10.5px] text-muted flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block flex-shrink-0" />
                Cotización en tiempo real · 3D
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="p-1 transition-colors text-muted hover:text-paper"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Barra de progreso (5 pasos) */}
          <div className="flex flex-shrink-0 gap-1 px-4 py-2 border-b border-white/10 bg-ink2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i).map((i) => (
              <div
                key={i}
                className={`h-[3px] flex-1 rounded-full transition-colors ${
                  i < engine.progressIndex ? "bg-red" : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {/* Tabs solo en mobile */}
          <div className="flex flex-shrink-0 border-b sm:hidden border-white/10">
            <button
              onClick={() => setMobileTab("chat")}
              className={`flex-1 py-2 text-[11px] uppercase tracking-wide ${
                mobileTab === "chat" ? "text-paper border-b-2 border-red" : "text-muted"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setMobileTab("3d")}
              className={`flex-1 py-2 text-[11px] uppercase tracking-wide ${
                mobileTab === "3d" ? "text-paper border-b-2 border-red" : "text-muted"
              }`}
            >
              Modelo 3D
            </button>
          </div>

          {/* Cuerpo: visor 3D + chat */}
          <div className="flex flex-1 min-h-0">
            <div
              className={`w-full sm:w-[220px] lg:w-[260px] flex-shrink-0 border-r border-white/10
                ${mobileTab === "3d" ? "block" : "hidden"} sm:block`}
            >
              <BodyViewer3D
                active={zonaStepActive}
                onZoneSelect={engine.selectZonaFrom3D}
                onInvalidClick={() => {}}
              />
            </div>
            <div
              className={`flex-1 min-w-0 min-h-0 flex-col ${
               mobileTab === "chat" ? "flex" : "hidden"
              } sm:flex`}
            >
             <ChatWindow
                messages={engine.messages}
                inputEnabled={engine.inputEnabled}
                onOption={engine.handleOption}
                onSend={engine.sendText}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
