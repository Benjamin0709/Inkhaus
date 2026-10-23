import { useEffect, useState } from "react";
import { getArtistsAPI } from "../../api/artists.api";
import { assetUrl } from "../../utils/assetUrl";
import { sendContactMessageAPI } from "../../api/contact.api";

const STUDIO_EMAIL = "inkhausweb@gmail.com";
const STUDIO_PHONE = "+56 9 1234 5678";

export default function ContactPage() {
  const [artists, setArtists] = useState([]);

  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", mensaje: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getArtistsAPI().then(({ data }) => setArtists(data.info || [])).catch(() => {});
  }, []);

  const equipo = artists.filter((a) => a.instagram?.trim());

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.nombre.trim() || !form.email.trim() || !form.mensaje.trim()) {
      return setError("Nombre, correo y mensaje son obligatorios");
    }
    try {
      setSending(true);
      await sendContactMessageAPI(form);
      setSent(true);
      setForm({ nombre: "", email: "", telefono: "", mensaje: "" });
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="grid max-w-4xl gap-14 mx-auto md:grid-cols-2">
        {/* ── Formulario ─────────────────────────────────────── */}
        <div>
          <h1 className="mb-1 text-4xl tracking-wide font-display">
            HABLEMOS <span className="text-red">CONTIGO</span>
          </h1>
          <p className="mb-8 text-sm text-muted">
            ¿Tienes una duda antes de agendar? Escríbenos y te respondemos a la brevedad.
          </p>

          {sent ? (
            <div className="px-4 py-4 text-sm border bg-green-900/20 border-green-700/40 text-green-400">
              ¡Mensaje enviado! Revisa tu correo — te confirmamos la recepción y te responderemos pronto.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="px-4 py-3 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}

              <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Tu nombre"
                className="w-full px-4 py-3 text-sm transition-colors border outline-none bg-paper/5 border-paper/10 focus:border-red text-paper placeholder-muted" />
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Tu correo"
                className="w-full px-4 py-3 text-sm transition-colors border outline-none bg-paper/5 border-paper/10 focus:border-red text-paper placeholder-muted" />
              <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono (opcional)"
                className="w-full px-4 py-3 text-sm transition-colors border outline-none bg-paper/5 border-paper/10 focus:border-red text-paper placeholder-muted" />
              <textarea name="mensaje" value={form.mensaje} onChange={handleChange} rows={5} placeholder="Tu mensaje"
                className="w-full px-4 py-3 text-sm transition-colors border outline-none bg-paper/5 border-paper/10 focus:border-red text-paper placeholder-muted" />

              <button type="submit" disabled={sending}
                className="w-full py-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60">
                {sending ? "Enviando..." : "Enviar mensaje"}
              </button>
            </form>
          )}
        </div>

        {/* ── Datos de contacto + equipo ─────────────────────── */}
        <div>
          <h2 className="mb-4 text-xs tracking-widest uppercase text-muted">Contacto directo</h2>
          <div className="mb-10 space-y-2">
            <a href={`mailto:${STUDIO_EMAIL}`} className="block text-lg text-paper hover:text-red">{STUDIO_EMAIL}</a>
            <a href={`tel:${STUDIO_PHONE.replace(/\s/g, "")}`} className="block text-lg text-paper hover:text-red">{STUDIO_PHONE}</a>
            <p className="text-sm text-muted">Santiago, Chile</p>
          </div>

          {equipo.length > 0 && (
            <>
              <h2 className="mb-4 text-xs tracking-widest uppercase text-muted">Equipo</h2>
              <div className="space-y-3">
                {equipo.map((a) => (
                  <a
                    key={a._id}
                    href={`https://instagram.com/${a.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 transition-colors border border-white/10 hover:border-red/40 group"
                  >
                    <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 overflow-hidden text-xs border rounded-full border-white/15 font-display bg-ink2">
                      {a.foto_url ? <img src={assetUrl(a.foto_url)} alt={a.nombre_artistico} className="object-cover w-full h-full" /> : a.nombre_artistico?.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-paper group-hover:text-red">{a.nombre_artistico}</div>
                      <div className="text-xs text-muted">@{a.instagram.replace("@", "")}</div>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}