import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMyArtistProfileAPI } from "../../api/artists.api";
import { getStylesAPI } from "../../api/styles.api";
import { uploadImageAPI } from "../../api/upload.api";
import { createPortfolioAPI, getPortfolioAPI, updatePortfolioAPI, deletePortfolioAPI } from "../../api/portfolio.api";

const emptyForm = { titulo: "", descripcion: "", zona_corporal: "", styles: [], destacado: false };

export default function UploadWork() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editParam = searchParams.get("edit");

  const [artist, setArtist] = useState(null);
  const [styles, setStyles] = useState([]);
  const [works, setWorks] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // null = modo "crear"; con valor = editando esa pieza existente
  const [editingId, setEditingId] = useState(null);
  const [appliedEditParam, setAppliedEditParam] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]); // File[] nuevos, aún no subidos
  const [previews, setPreviews] = useState([]); // object URLs de `files`
  const [existingImages, setExistingImages] = useState([]); // URLs ya subidas (modo edición)

  const totalImages = existingImages.length + previews.length;

  useEffect(() => {
    Promise.all([getMyArtistProfileAPI(), getStylesAPI()])
      .then(([artistRes, stylesRes]) => {
        setArtist(artistRes.data.info);
        setStyles(stylesRes.data.info || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "No se pudo cargar tu perfil de artista");
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  useEffect(() => {
    if (!artist?._id) return;
    setLoadingWorks(true);
    getPortfolioAPI({ artist: artist._id })
      .then(({ data }) => setWorks(data.info || []))
      .catch(() => setWorks([]))
      .finally(() => setLoadingWorks(false));
  }, [artist]);

  // ── Si llegamos con ?edit=ID (ej: desde "Mi portafolio" en el perfil),
  // cargamos esa pieza en el formulario apenas tengamos la lista de
  // trabajos. Solo se aplica una vez, para no pelear con el botón
  // "Cancelar" si el usuario decide salir del modo edición. ──
  useEffect(() => {
    if (appliedEditParam || !editParam || loadingWorks) return;
    const item = works.find((w) => w._id === editParam);
    if (item) {
      startEdit(item);
    }
    setAppliedEditParam(true);
    // Limpiamos el parámetro de la URL para que no se re-aplique al navegar
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [works, loadingWorks, editParam, appliedEditParam]);

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p));
  }, [previews]);

  const refreshWorks = () => {
    if (!artist?._id) return;
    getPortfolioAPI({ artist: artist._id })
      .then(({ data }) => setWorks(data.info || []))
      .catch(() => {});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleStyle = (id) => {
    setForm((f) => ({
      ...f,
      styles: f.styles.includes(id) ? f.styles.filter((s) => s !== id) : [...f.styles, id],
    }));
  };

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const espacioDisponible = 6 - existingImages.length;
    const merged = [...files, ...selected].slice(0, Math.max(espacioDisponible, 0));
    setFiles(merged);
    setPreviews(merged.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (idx) => {
    const nextFiles = files.filter((_, i) => i !== idx);
    setFiles(nextFiles);
    setPreviews(nextFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingImage = (idx) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFiles([]);
    setPreviews([]);
    setExistingImages([]);
  };

  // ── Carga una pieza existente en el formulario para editarla ──
  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      titulo: item.titulo || "",
      descripcion: item.descripcion || "",
      zona_corporal: item.zona_corporal || "",
      styles: (item.styles || []).map((s) => s._id || s),
      destacado: !!item.destacado,
    });
    setExistingImages(item.imagenes_urls || []);
    setFiles([]);
    setPreviews([]);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este trabajo del portafolio? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    setError("");
    try {
      await deletePortfolioAPI(id);
      if (editingId === id) resetForm();
      refreshWorks();
    } catch (err) {
      setError(err.response?.data?.message || "Error al eliminar el trabajo");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (totalImages === 0) return setError("Selecciona al menos una imagen del trabajo");
    if (!form.titulo || !form.zona_corporal) return setError("Título y zona corporal son obligatorios");
    if (form.styles.length === 0) return setError("Selecciona al menos un estilo");

    try {
      setSubmitting(true);
      // Sube solo las imágenes nuevas; las existentes ya están subidas
      const uploads = files.length ? await Promise.all(files.map((f) => uploadImageAPI(f))) : [];
      const imagenes_urls = [...existingImages, ...uploads.map((res) => res.data.url)];

      const payload = {
        artist: artist._id,
        styles: form.styles,
        titulo: form.titulo,
        descripcion: form.descripcion,
        imagenes_urls,
        zona_corporal: form.zona_corporal,
        destacado: form.destacado,
      };

      if (editingId) {
        await updatePortfolioAPI(editingId, payload);
        setSuccess("¡Trabajo actualizado!");
      } else {
        await createPortfolioAPI(payload);
        setSuccess("¡Trabajo publicado en tu portafolio!");
      }

      resetForm();
      refreshWorks();
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar el trabajo");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile) {
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
        <h1 className="mb-1 text-4xl tracking-wide font-display">
          {editingId ? "EDITAR" : "SUBIR"} <span className="text-red">TRABAJO</span>
        </h1>
        <p className="mb-8 text-sm text-muted">Publicando como {artist.nombre_artistico}</p>

        {error && <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}
        {success && <div className="px-4 py-3 mb-6 text-sm text-green-400 border bg-green-900/20 border-green-700/40">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Imágenes (múltiples) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs tracking-widest uppercase text-muted">
              Imágenes del trabajo * (máx. 6 — se muestran como carrusel)
            </label>

            {totalImages > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {existingImages.map((src, i) => (
                  <div key={`existing-${i}`} className="relative aspect-square">
                    <img src={src} alt={`actual-${i}`} className="object-cover w-full h-full border border-white/10" />
                    <button type="button" onClick={() => removeExistingImage(i)}
                      className="absolute top-1 right-1 bg-black/70 text-white text-[10px] w-5 h-5 flex items-center justify-center">✕</button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 bg-red text-white text-[9px] px-1.5 py-0.5 uppercase tracking-wide">
                        Portada
                      </span>
                    )}
                  </div>
                ))}
                {previews.map((src, i) => (
                  <div key={`new-${i}`} className="relative aspect-square">
                    <img src={src} alt={`preview-${i}`} className="object-cover w-full h-full border border-white/10" />
                    <button type="button" onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-black/70 text-white text-[10px] w-5 h-5 flex items-center justify-center">✕</button>
                    {existingImages.length === 0 && i === 0 && (
                      <span className="absolute bottom-1 left-1 bg-red text-white text-[9px] px-1.5 py-0.5 uppercase tracking-wide">
                        Portada
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {totalImages < 6 && (
              <label className="flex items-center justify-center px-4 text-sm text-center transition-colors border-2 border-dashed cursor-pointer border-white/15 hover:border-red/50 h-28 text-muted">
                {totalImages === 0
                  ? "Haz clic para elegir una o más imágenes (JPG, PNG, WEBP — máx 8MB c/u)"
                  : `Agregar más (${6 - totalImages} disponibles)`}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} className="hidden" />
              </label>
            )}
          </div>

          <Field label="Título *">
            <input name="titulo" value={form.titulo} onChange={handleChange}
              placeholder="Ej: Retrato realista brazo completo" className={inputCls} />
          </Field>

          <Field label="Descripción">
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3}
              placeholder="Detalles de la técnica, tiempo de sesión, etc." className={inputCls} />
          </Field>

          <Field label="Zona corporal *">
            <input name="zona_corporal" value={form.zona_corporal} onChange={handleChange}
              placeholder="Ej: antebrazo" className={inputCls} />
          </Field>

          {/* Estilos (multi-selección) */}
          <div>
            <div className="mb-2 text-xs tracking-widest uppercase text-muted">
              Estilos * (elige uno o más — ej: Anime + Black &amp; Gray)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {styles.map((s) => {
                const active = form.styles.includes(s._id);
                return (
                  <button
                    type="button"
                    key={s._id}
                    onClick={() => toggleStyle(s._id)}
                    className={`px-3 py-1.5 text-xs border transition-colors ${
                      active ? "bg-red text-white border-red" : "border-paper/20 text-paper/80 hover:border-paper/50"
                    }`}
                  >
                    {s.nombre}
                  </button>
                );
              })}
              {styles.length === 0 && (
                <span className="text-xs text-muted">Aún no hay estilos creados por el admin.</span>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer text-muted">
            <input type="checkbox" name="destacado" checked={form.destacado} onChange={handleChange} className="accent-red" />
            Marcar como trabajo destacado
          </label>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="flex-1 py-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60">
              {submitting ? "Guardando..." : editingId ? "Guardar cambios" : "Publicar en mi portafolio"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} disabled={submitting}
                className="px-6 py-4 text-sm tracking-widest uppercase transition-colors border border-white/15 text-muted hover:border-white/30 hover:text-paper disabled:opacity-60">
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* ── Mis trabajos publicados ─────────────────────────── */}
        <div className="mt-16">
          <h2 className="mb-6 text-2xl tracking-wide font-display">MIS TRABAJOS</h2>

          {loadingWorks ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 rounded-full border-red border-t-transparent animate-spin" />
            </div>
          ) : works.length === 0 ? (
            <p className="text-sm text-muted">Aún no has publicado ningún trabajo.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {works.map((w) => (
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
                      <button type="button" onClick={() => startEdit(w)}
                        className="flex-1 py-1.5 text-[10px] uppercase tracking-widest bg-white/10 hover:bg-white/20 text-paper">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDelete(w._id)} disabled={deletingId === w._id}
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