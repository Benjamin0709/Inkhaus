import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyArtistProfileAPI, updateArtistAPI } from "../../api/artists.api";
import { uploadImageAPI } from "../../api/upload.api";
import { getPortfolioAPI, deletePortfolioAPI } from "../../api/portfolio.api";
import { getStylesAPI } from "../../api/styles.api";

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export default function EditArtistProfile() {
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const [form, setForm] = useState({
    nombre_artistico: "",
    bio: "",
    instagram: "",
    foto_url: "",
    especialidades: [],
    horarios: [],
  });
  const [especialidadInput, setEspecialidadInput] = useState("");

  // ── Mi portafolio ────────────────────────────────────────
  const [works, setWorks] = useState([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [styles, setStyles] = useState([]);
  const [styleFilter, setStyleFilter] = useState("");
  const [portfolioError, setPortfolioError] = useState("");

  useEffect(() => {
    Promise.all([getMyArtistProfileAPI(), getStylesAPI()])
      .then(([artistRes, stylesRes]) => {
        const a = artistRes.data.info;
        setArtist(a);
        setForm({
          nombre_artistico: a.nombre_artistico || "",
          bio: a.bio || "",
          instagram: a.instagram || "",
          foto_url: a.foto_url || "",
          especialidades: a.especialidades || [],
          horarios: a.horarios || [],
        });
        setStyles(stylesRes.data.info || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "No se pudo cargar tu perfil de artista");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!artist?._id) return;
    loadWorks();
  }, [artist]);

  const loadWorks = () => {
    if (!artist?._id) return;
    setLoadingWorks(true);
    getPortfolioAPI({ artist: artist._id })
      .then(({ data }) => setWorks(data.info || []))
      .catch(() => setWorks([]))
      .finally(() => setLoadingWorks(false));
  };

  const filteredWorks = styleFilter
    ? works.filter((w) => (w.styles || []).some((s) => s.nombre === styleFilter))
    : works;

  const handleDeleteWork = async (id) => {
    if (!window.confirm("¿Eliminar este trabajo del portafolio? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    setPortfolioError("");
    try {
      await deletePortfolioAPI(id);
      setWorks((prev) => prev.filter((w) => w._id !== id));
    } catch (err) {
      setPortfolioError(err.response?.data?.message || "Error al eliminar el trabajo");
    } finally {
      setDeletingId(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    setError("");
    try {
      const { data } = await uploadImageAPI(file);
      setForm((f) => ({ ...f, foto_url: data.url }));
    } catch (err) {
      setError(err.response?.data?.message || "Error al subir la foto");
    } finally {
      setUploadingFoto(false);
    }
  };

  const addEspecialidad = () => {
    const v = especialidadInput.trim();
    if (!v || form.especialidades.includes(v)) return;
    setForm((f) => ({ ...f, especialidades: [...f.especialidades, v] }));
    setEspecialidadInput("");
  };

  const removeEspecialidad = (esp) => {
    setForm((f) => ({ ...f, especialidades: f.especialidades.filter((e) => e !== esp) }));
  };

  const addHorario = () => {
    setForm((f) => ({ ...f, horarios: [...f.horarios, { dia: "lunes", desde: "10:00", hasta: "18:00" }] }));
  };

  const updateHorario = (idx, campo, value) => {
    setForm((f) => ({
      ...f,
      horarios: f.horarios.map((h, i) => (i === idx ? { ...h, [campo]: value } : h)),
    }));
  };

  const removeHorario = (idx) => {
    setForm((f) => ({ ...f, horarios: f.horarios.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.nombre_artistico.trim()) return setError("El nombre artístico es obligatorio");

    try {
      setSaving(true);
      const { data } = await updateArtistAPI(artist._id, form);
      setArtist(data.info);
      setSuccess("¡Perfil actualizado!");
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center min-h-screen px-12 pt-28">
        <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen px-12 pt-28">
        <div className="max-w-lg mx-auto text-center text-muted">
          {error || "No tienes un perfil de artista asociado."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="max-w-xl mx-auto">
        <h1 className="mb-1 text-4xl tracking-wide font-display">MI <span className="text-red">PERFIL</span></h1>
        <p className="mb-8 text-sm text-muted">Así te ven tus clientes en la página de artistas</p>

        {error && <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}
        {success && <div className="px-4 py-3 mb-6 text-sm text-green-400 border bg-green-900/20 border-green-700/40">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Foto de perfil */}
          <div className="flex items-center gap-5">
            <div className="flex items-center justify-center flex-shrink-0 w-24 h-24 overflow-hidden text-2xl border rounded-full border-white/15 font-display bg-ink2">
              {form.foto_url
                ? <img src={form.foto_url} alt={form.nombre_artistico} className="object-cover w-full h-full" />
                : form.nombre_artistico?.slice(0, 2) || "?"}
            </div>
            <label className="px-4 py-2 text-xs tracking-widest uppercase transition-colors border cursor-pointer border-white/15 text-muted hover:border-white/30 hover:text-paper">
              {uploadingFoto ? "Subiendo..." : "Cambiar foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFotoChange} disabled={uploadingFoto} className="hidden" />
            </label>
          </div>

          <Field label="Nombre artístico *">
            <input name="nombre_artistico" value={form.nombre_artistico} onChange={handleChange} className={inputCls} />
          </Field>

          <Field label="Bio">
            <textarea name="bio" value={form.bio} onChange={handleChange} rows={4} className={inputCls} />
          </Field>

          <Field label="Instagram">
            <input name="instagram" value={form.instagram} onChange={handleChange} placeholder="@tu_usuario" className={inputCls} />
          </Field>

          {/* Especialidades (tags libres) */}
          <div>
            <div className="mb-2 text-xs tracking-widest uppercase text-muted">Especialidades</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.especialidades.map((esp) => (
                <span key={esp} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border bg-red/10 border-red/30 text-red">
                  {esp}
                  <button type="button" onClick={() => removeEspecialidad(esp)} className="hover:text-white">✕</button>
                </span>
              ))}
              {form.especialidades.length === 0 && <span className="text-xs text-muted">Aún no agregas especialidades.</span>}
            </div>
            <div className="flex gap-2">
              <input
                value={especialidadInput}
                onChange={(e) => setEspecialidadInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEspecialidad(); } }}
                placeholder="Ej: Realismo"
                className={inputCls}
              />
              <button type="button" onClick={addEspecialidad}
                className="px-4 text-xs tracking-widest uppercase border border-white/15 text-muted hover:border-white/30 hover:text-paper">
                Agregar
              </button>
            </div>
          </div>

          {/* Horarios */}
          <div>
            <div className="mb-2 text-xs tracking-widest uppercase text-muted">Horarios de atención</div>
            <div className="flex flex-col gap-2">
              {form.horarios.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={h.dia} onChange={(e) => updateHorario(i, "dia", e.target.value)}
                    className="px-3 py-2 text-xs capitalize border outline-none bg-paper/5 border-paper/10 text-paper focus:border-red">
                    {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input type="time" value={h.desde} onChange={(e) => updateHorario(i, "desde", e.target.value)}
                    className="px-3 py-2 text-xs border outline-none bg-paper/5 border-paper/10 text-paper focus:border-red" />
                  <span className="text-xs text-muted">a</span>
                  <input type="time" value={h.hasta} onChange={(e) => updateHorario(i, "hasta", e.target.value)}
                    className="px-3 py-2 text-xs border outline-none bg-paper/5 border-paper/10 text-paper focus:border-red" />
                  <button type="button" onClick={() => removeHorario(i)} className="text-xs text-red hover:underline">Quitar</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addHorario}
              className="px-4 py-2 mt-2 text-xs tracking-widest uppercase border border-white/15 text-muted hover:border-white/30 hover:text-paper">
              + Agregar horario
            </button>
          </div>

          <button type="submit" disabled={saving || uploadingFoto}
            className="w-full py-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>

        {/* ── Mi portafolio ────────────────────────────────────── */}
        <div className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <h2 className="text-2xl tracking-wide font-display">MI PORTAFOLIO</h2>
            <Link to="/artista/portafolio"
              className="text-xs tracking-widest uppercase text-red hover:underline">
              + Subir trabajo nuevo
            </Link>
          </div>

          <select
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value)}
            className="px-4 py-2 mb-6 text-xs border outline-none bg-white/5 border-white/10 text-paper focus:border-red"
          >
            <option value="">Todos los estilos</option>
            {styles.map((s) => (
              <option key={s._id} value={s.nombre}>{s.nombre}</option>
            ))}
          </select>

          {portfolioError && <div className="px-4 py-3 mb-4 text-sm border bg-red/10 border-red/30 text-red">{portfolioError}</div>}

          {loadingWorks ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 rounded-full border-red border-t-transparent animate-spin" />
            </div>
          ) : filteredWorks.length === 0 ? (
            <p className="text-sm text-muted">
              {styleFilter ? `No tienes trabajos publicados en el estilo "${styleFilter}".` : "Aún no has publicado ningún trabajo."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredWorks.map((w) => (
                <div key={w._id} className="relative overflow-hidden border border-white/10 group aspect-square bg-ink2">
                  <img src={w.imagenes_urls?.[0]} alt={w.titulo} className="object-cover w-full h-full" />
                  <div className="absolute inset-0 flex flex-col justify-between p-2 transition-opacity opacity-0 bg-ink/70 group-hover:opacity-100">
                    <div className="text-[11px] leading-tight text-paper">
                      <div className="font-medium">{w.titulo}</div>
                      <div className="text-[9px] uppercase tracking-widest text-muted mt-0.5">
                        {(w.styles || []).map((s) => s.nombre).join(" · ")}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Link to={`/artista/portafolio?edit=${w._id}`}
                        className="flex-1 py-1.5 text-[10px] text-center uppercase tracking-widest bg-white/10 hover:bg-white/20 text-paper">
                        Editar
                      </Link>
                      <button type="button" onClick={() => handleDeleteWork(w._id)} disabled={deletingId === w._id}
                        className="flex-1 py-1.5 text-[10px] uppercase tracking-widest bg-red/80 hover:bg-red text-white disabled:opacity-60">
                        {deletingId === w._id ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-paper/5 border border-paper/10 focus:border-red outline-none text-paper placeholder-muted px-4 py-3 text-sm transition-colors";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs tracking-widest uppercase text-muted">{label}</label>
      {children}
    </div>
  );
}