import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VIEW = 280;   // tamaño (px) del área de recorte en pantalla
const OUTPUT = 512; // tamaño (px) de la imagen final (cuadrada)
const MAX_ZOOM = 4; // veces el zoom "rellenar"

/**
 * Modal para encuadrar una foto dentro de un círculo.
 * - Arrastrar para mover, rueda / slider / pellizco para zoom.
 * - "Ajustar" muestra la imagen completa; "Rellenar" llena el círculo.
 *
 * Props:
 *   file:      File de imagen elegido por el usuario
 *   onCancel:  () => void
 *   onConfirm: (File) => void  → recibe un PNG cuadrado de 512×512
 */
export default function AvatarCropper({ file, onCancel, onConfirm }) {
  const [src, setSrc]       = useState(null);
  const [img, setImg]       = useState(null);
  const [error, setError]   = useState("");
  const [scale, setScale]   = useState(1);
  const [pos, setPos]       = useState({ x: 0, y: 0 }); // esquina sup. izq. de la imagen dentro del área
  const [busy, setBusy]     = useState(false);

  const pointers  = useRef(new Map());
  const lastPinch = useRef(null);

  // ── Cargar imagen ────────────────────────────────────────
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    const el = new Image();
    el.onload  = () => setImg(el);
    el.onerror = () => setError("No se pudo leer la imagen. Prueba con otro archivo.");
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Zoom mínimo = imagen completa visible; "rellenar" = cubre todo el círculo
  const { fitScale, fillScale } = useMemo(() => {
    if (!img) return { fitScale: 1, fillScale: 1 };
    return {
      fitScale:  Math.min(VIEW / img.naturalWidth, VIEW / img.naturalHeight),
      fillScale: Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight),
    };
  }, [img]);

  const maxScale = fillScale * MAX_ZOOM;

  const clampPos = useCallback((x, y, s) => {
    if (!img) return { x, y };
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    const clamp = (v, size) => (size >= VIEW ? Math.min(0, Math.max(VIEW - size, v)) : Math.min(VIEW - size, Math.max(0, v)));
    return { x: clamp(x, w), y: clamp(y, h) };
  }, [img]);

  // Cambia el zoom manteniendo fijo el punto (cx, cy) del área de recorte
  const zoomTo = useCallback((nextScale, cx = VIEW / 2, cy = VIEW / 2) => {
    if (!img) return;
    const s = Math.min(maxScale, Math.max(fitScale, nextScale));
    setPos((p) => {
      const ratio = s / scale;
      return clampPos(cx - (cx - p.x) * ratio, cy - (cy - p.y) * ratio, s);
    });
    setScale(s);
  }, [img, scale, fitScale, maxScale, clampPos]);

  const center = useCallback((s) => {
    if (!img) return;
    setScale(s);
    setPos({
      x: (VIEW - img.naturalWidth * s) / 2,
      y: (VIEW - img.naturalHeight * s) / 2,
    });
  }, [img]);

  // Estado inicial: rellenar el círculo
  useEffect(() => { if (img) center(fillScale); }, [img, fillScale, center]);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  // ── Gestos ───────────────────────────────────────────────
  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPinch.current = null;
  };

  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);

    if (pointers.current.size === 1) {
      setPos((p) => clampPos(p.x + (cur.x - prev.x), p.y + (cur.y - prev.y), scale));
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch.current) zoomTo(scale * (dist / lastPinch.current));
      lastPinch.current = dist;
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    lastPinch.current = null;
  };

  const onWheel = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    zoomTo(scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - rect.left, e.clientY - rect.top);
  };

  // React registra wheel como pasivo; hay que enganchar el listener a mano para poder hacer preventDefault
  const areaRef = useRef(null);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  // ── Exportar ─────────────────────────────────────────────
  const handleConfirm = () => {
    if (!img) return;
    setBusy(true);
    const k = OUTPUT / VIEW;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, pos.x * k, pos.y * k, img.naturalWidth * scale * k, img.naturalHeight * scale * k);
    canvas.toBlob((blob) => {
      if (!blob) { setBusy(false); setError("No se pudo procesar la imagen."); return; }
      onConfirm(new File([blob], "foto-perfil.png", { type: "image/png" }));
    }, "image/png");
  };

  const zoomPct = fillScale === fitScale ? 0 : ((scale - fitScale) / (maxScale - fitScale)) * 100;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar foto de perfil"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
    >
      <div className="w-full max-w-sm p-6 border bg-ink2 border-white/10">
        <h2 className="mb-1 text-2xl tracking-wide font-display">
          AJUSTAR <span className="text-red">FOTO</span>
        </h2>
        <p className="mb-5 text-xs text-muted">Arrastra para mover y usa el zoom para encuadrar.</p>

        {error ? (
          <div className="px-4 py-3 mb-4 text-sm border bg-red/10 border-red/30 text-red">{error}</div>
        ) : (
          <>
            {/* Área de recorte */}
            <div className="flex justify-center">
              <div
                ref={areaRef}
                className="relative overflow-hidden select-none cursor-grab active:cursor-grabbing bg-ink"
                style={{ width: VIEW, height: VIEW, touchAction: "none", maxWidth: "100%" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {img && (
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    className="absolute top-0 left-0 max-w-none"
                    style={{
                      width: img.naturalWidth,
                      height: img.naturalHeight,
                      transformOrigin: "0 0",
                      transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                      pointerEvents: "none",
                    }}
                  />
                )}
                {/* Máscara: oscurece todo lo que queda fuera del círculo */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle at center, transparent 0, transparent calc(50% - 1px), rgba(10,9,8,.75) 50%)",
                  }}
                />
                <div className="absolute inset-0 border rounded-full pointer-events-none border-white/40" />
              </div>
            </div>

            {/* Controles */}
            <div className="flex items-center gap-3 mt-5">
              <span className="text-xs text-muted">−</span>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={zoomPct}
                disabled={!img || fillScale === fitScale}
                onChange={(e) => zoomTo(fitScale + (Number(e.target.value) / 100) * (maxScale - fitScale))}
                className="flex-1 accent-red"
                aria-label="Zoom"
              />
              <span className="text-xs text-muted">+</span>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => center(fitScale)}
                className="flex-1 py-2 text-[11px] tracking-widest uppercase border border-white/15 text-muted hover:border-white/30 hover:text-paper"
              >
                Ajustar
              </button>
              <button
                type="button"
                onClick={() => center(fillScale)}
                className="flex-1 py-2 text-[11px] tracking-widest uppercase border border-white/15 text-muted hover:border-white/30 hover:text-paper"
              >
                Rellenar
              </button>
            </div>
          </>
        )}

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-3 text-xs tracking-widest uppercase border border-white/15 text-muted hover:border-white/30 hover:text-paper disabled:opacity-60"
          >
            Cancelar
          </button>
          {!error && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!img || busy}
              className="flex-1 py-3 text-xs font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60"
            >
              {busy ? "Procesando..." : "Usar foto"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
