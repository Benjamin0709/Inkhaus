import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSiteContentAPI, setSiteContentAPI } from "../../api/siteContent.api";
import { uploadVideoAPI } from "../../api/upload.api";
import BookingCTALink from "../../components/ui/BookingCTALink";
import {
  CARE_INTRO, CARE_TIMELINE, CARE_TIPS, CARE_KIT, CARE_CHILE,
  CARE_AVOID, CARE_WARNING_SIGNS, CARE_WARNING_CTA, CARE_DISCLAIMER,
} from "../../constants/careContent";

const VIDEO_KEY = "cuidados_video_url";

export default function CarePage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSiteContentAPI(VIDEO_KEY)
      .then(({ data }) => setVideoUrl(data.info.value || ""))
      .catch(() => {});
  }, []);

  const handleVideo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { data } = await uploadVideoAPI(file);
      await setSiteContentAPI(VIDEO_KEY, data.url);
      setVideoUrl(data.url);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo subir el video");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("¿Quitar el video de la página de Cuidados?")) return;
    try {
      await setSiteContentAPI(VIDEO_KEY, "");
      setVideoUrl("");
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo quitar el video");
    }
  };

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-3 text-[clamp(2.5rem,5vw,4rem)] tracking-wide font-display">
          CUIDADOS DE TU <span className="text-red">TATUAJE</span>
        </h1>
        <p className="max-w-2xl mb-10 text-sm leading-relaxed text-muted">{CARE_INTRO}</p>

        {/* ── Video ─────────────────────────────────────────────── */}
        {videoUrl && (
          <div className="mb-10">
            <video src={videoUrl} controls preload="metadata" className="w-full border border-white/10 bg-ink2 max-h-[520px]" />
          </div>
        )}

        {isAdmin && (
          <div className="p-4 mb-10 border border-dashed border-white/20">
            <div className="mb-2 text-xs tracking-widest uppercase text-muted">Administrar video (solo admin)</div>
            {error && <div className="px-3 py-2 mb-3 text-xs border bg-red/10 border-red/30 text-red">{error}</div>}
            <div className="flex flex-wrap items-center gap-3">
              <label className="px-4 py-2 text-xs tracking-widest uppercase transition-colors border cursor-pointer border-white/15 text-muted hover:border-white/30 hover:text-paper">
                {uploading ? "Subiendo..." : videoUrl ? "Reemplazar video" : "Subir video"}
                <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideo} disabled={uploading} className="hidden" />
              </label>
              {videoUrl && !uploading && (
                <button onClick={handleRemove} className="text-xs tracking-widest uppercase text-red hover:underline">
                  Quitar video
                </button>
              )}
              <span className="text-[11px] text-muted">MP4 o WEBM, máx. 60 MB.</span>
            </div>
          </div>
        )}

        {/* ── Línea de tiempo ───────────────────────────────────── */}
        <h2 className="mb-5 text-2xl tracking-wide font-display">CÓMO AVANZA LA CURACIÓN</h2>
        <div className="grid gap-4 mb-14 md:grid-cols-2">
          {CARE_TIMELINE.map((etapa) => (
            <div key={etapa.periodo} className="p-6 border border-white/10">
              <div className="text-[10px] tracking-widest uppercase text-red">{etapa.periodo}</div>
              <div className="mt-1 mb-3 text-lg tracking-wide font-display">{etapa.titulo}</div>
              <ul className="space-y-2">
                {etapa.puntos.map((p) => (
                  <li key={p} className="text-sm leading-relaxed text-muted">• {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Consejos esenciales ───────────────────────────────── */}
        <h2 className="mb-5 text-2xl tracking-wide font-display">CONSEJOS ESENCIALES</h2>
        <div className="mb-14 space-y-3">
          {CARE_TIPS.map((t, i) => (
            <div key={t.titulo} className="flex gap-4 p-5 border border-white/10">
              <div className="flex-shrink-0 w-8 text-3xl leading-none font-display text-red">{i + 1}</div>
              <div>
                <div className="mb-1 text-sm tracking-wide text-paper">{t.titulo}</div>
                <p className="text-sm leading-relaxed text-muted">{t.texto}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Qué necesitas (farmacia) ──────────────────────────── */}
        <h2 className="mb-3 text-2xl tracking-wide font-display">QUÉ NECESITAS</h2>
        <p className="max-w-2xl mb-5 text-sm leading-relaxed text-muted">{CARE_KIT.intro}</p>
        <div className="grid gap-3 mb-14 md:grid-cols-2">
          {CARE_KIT.items.map((it) => (
            <div key={it.nombre} className="p-5 border border-white/10">
              <div className="mb-1 text-sm text-paper">{it.nombre}</div>
              <p className="text-xs leading-relaxed text-muted">{it.detalle}</p>
            </div>
          ))}
        </div>

        {/* ── Según tu día a día en Chile ───────────────────────── */}
        <h2 className="mb-5 text-2xl tracking-wide font-display">SEGÚN TU DÍA A DÍA EN CHILE</h2>
        <div className="grid gap-3 mb-14 md:grid-cols-2">
          {CARE_CHILE.map((c) => (
            <div key={c.titulo} className="p-5 border border-white/10">
              <div className="mb-1 text-sm text-paper">{c.titulo}</div>
              <p className="text-xs leading-relaxed text-muted">{c.texto}</p>
            </div>
          ))}
        </div>

        {/* ── Qué evitar ────────────────────────────────────────── */}
        <h2 className="mb-5 text-2xl tracking-wide font-display">QUÉ EVITAR</h2>
        <ul className="grid gap-2 mb-14 md:grid-cols-2">
          {CARE_AVOID.map((a) => (
            <li key={a} className="px-4 py-3 text-sm border border-white/10 text-muted">✕ {a}</li>
          ))}
        </ul>

        {/* ── Señales de alerta ─────────────────────────────────── */}
        <div className="p-6 mb-10 border border-red/40 bg-red/5">
          <h2 className="mb-3 text-xl tracking-wide font-display text-red">SEÑALES DE ALERTA</h2>
          <ul className="mb-4 space-y-1.5">
            {CARE_WARNING_SIGNS.map((s) => (
              <li key={s} className="text-sm text-paper/90">• {s}</li>
            ))}
          </ul>
          <p className="text-sm leading-relaxed text-muted">{CARE_WARNING_CTA}</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link to="/contact" className="px-6 py-3 text-xs tracking-widest uppercase transition-colors border border-white/15 text-paper hover:border-white/30">
            Tengo una duda
          </Link>
          <BookingCTALink className="px-6 py-3 text-xs tracking-widest text-white uppercase bg-red hover:bg-red-hover">
            Agendar un retoque
          </BookingCTALink>
        </div>

        <p className="text-[11px] italic text-muted">{CARE_DISCLAIMER}</p>
      </div>
    </div>
  );
}