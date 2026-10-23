import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyArtistProfileAPI, updateArtistAPI } from "../../api/artists.api";
import { uploadImageAPI } from "../../api/upload.api";
import AvatarCropper from "../../components/ui/AvatarCropper";
import Avatar from "../../components/ui/Avatar";
import { assetUrl } from "../../utils/assetUrl";
import { getPortfolioAPI, deletePortfolioAPI } from "../../api/portfolio.api";
import { getStylesAPI } from "../../api/styles.api";
import { getArtistPricingAPI, saveArtistPricingAPI } from "../../api/pricing.api";
import {
  PRICE_ZONES, PRICE_SIZES, SPECIAL_SIZES,
  priceKey, pricesArrayToMap, pricesMapToArray,
  pricingDocsToArray, formatCLP,
} from "../../constants/pricing";

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export default function EditArtistProfile() {
  const [artist, setArtist]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [saving, setSaving]           = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotoToCrop, setFotoToCrop]  = useState(null); // File pendiente de encuadrar

  const [form, setForm] = useState({
    nombre_artistico: "",
    bio: "",
    instagram: "",
    foto_url: "",
    especialidades: [],
    horarios: [],
  });
  const [especialidadInput, setEspecialidadInput] = useState("");

  // ── Portafolio ───────────────────────────────────────────
  const [works, setWorks]             = useState([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [deletingId, setDeletingId]   = useState(null);
  const [styles, setStyles]           = useState([]);
  const [styleFilter, setStyleFilter] = useState("");
  const [portfolioError, setPortfolioError] = useState("");

  // ── Precios ──────────────────────────────────────────────
  const [precios, setPrecios] = useState({});
  const [preciosGuardados, setPreciosGuardados] = useState({})

  // ── Carga inicial ────────────────────────────────────────
  useEffect(() => {
    Promise.all([getMyArtistProfileAPI(), getStylesAPI()])
      .then(([artistRes, stylesRes]) => {
        const a = artistRes.data.info;
        setArtist(a);
        setForm({
          nombre_artistico: a.nombre_artistico || "",
          bio:              a.bio              || "",
          instagram:        a.instagram        || "",
          foto_url:         a.foto_url         || "",
          especialidades:   a.especialidades   || [],
          horarios:         a.horarios         || [],
        });
        setStyles(stylesRes.data.info || []);

        // Cargar precios desde la colección Pricing 
        // y hacer fallback a tabla_precios del artista si aún no hay docs
        getArtistPricingAPI(a._id)
          .then(({ data }) => {
            if (data.info?.length) {
              const mapa = pricesArrayToMap(pricingDocsToArray(data.info));
              setPrecios(mapa);
              setPreciosGuardados(mapa);         
            } else {
              const mapa = pricesArrayToMap(a.tabla_precios || []);
              setPrecios(mapa);
              setPreciosGuardados(mapa);        
            }
          })
          .catch(() => {
            const mapa = pricesArrayToMap(a.tabla_precios || []);
            setPrecios(mapa);
            setPreciosGuardados(mapa);            
          });
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

  // ── Portafolio ───────────────────────────────────────────
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

  // ── Formulario general ───────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // 1) El artista elige un archivo → se abre el recortador
  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return setError("La imagen supera el máximo de 8 MB");
    setError("");
    setFotoToCrop(file);
  };

  // 2) Confirma el encuadre → se sube el PNG cuadrado resultante
  const handleFotoCropped = async (croppedFile) => {
    setFotoToCrop(null);
    setUploadingFoto(true);
    setError("");
    try {
      const { data } = await uploadImageAPI(croppedFile);
      setForm((f) => ({ ...f, foto_url: data.url }));
    } catch (err) {
      setError(err.response?.data?.message || "Error al subir la foto");
    } finally {
      setUploadingFoto(false);
    }
  };

  // ── Especialidades ───────────────────────────────────────
  const addEspecialidad = () => {
    const v = especialidadInput.trim();
    if (!v || form.especialidades.includes(v)) return;
    setForm((f) => ({ ...f, especialidades: [...f.especialidades, v] }));
    setEspecialidadInput("");
  };

  const removeEspecialidad = (esp) => {
    setForm((f) => ({ ...f, especialidades: f.especialidades.filter((e) => e !== esp) }));
  };

  // ── Horarios ─────────────────────────────────────────────
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

  // ── Precios ──────────────────────────────────────────────
  const formatThousands = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("es-CL");
  };

  const parseThousands = (formatted) => formatted.replace(/\D/g, "");

  const updatePrecio = (zona, tamanio, campo, rawInputValue) => {
    const key = priceKey(zona, tamanio);
    setPrecios((prev) => ({
      ...prev,
      [key]: { ...prev[key], [campo]: parseThousands(rawInputValue) },
    }));
  };

  const clearPrecio = (zona, tamanio) => {
    const key = priceKey(zona, tamanio);
    setPrecios((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  
  // ── Guardar ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.nombre_artistico.trim()) return setError("El nombre artístico es obligatorio");

    // Validación básica: min <= max en cada celda completada
    const tabla = pricesMapToArray(precios);
    const invalido = tabla.find((p) => p.precio_min > p.precio_max);
    if (invalido) {
      return setError(`El precio mínimo no puede ser mayor que el máximo (${invalido.zona} – ${invalido.tamanio})`);
    }
  
    try {
      setSaving(true);

      // 1. Actualizar perfil del artista (incluye tabla_precios embebida como respaldo)
      const { data } = await updateArtistAPI(artist._id, { ...form, tabla_precios: tabla });

      // 2. Sincronizar con la colección Pricing
      const pr = await saveArtistPricingAPI(artist._id, tabla);
      const mapaGuardado = pricesArrayToMap(pricingDocsToArray(pr.data.info));
      setPrecios(mapaGuardado);
      setPreciosGuardados(mapaGuardado);      

      setArtist(data.info);
      setSuccess("¡Perfil actualizado!");
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  // ── Estados de carga / sin perfil ────────────────────────
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

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="max-w-xl mx-auto">
        <h1 className="mb-1 text-4xl tracking-wide font-display">
          MI <span className="text-red">PERFIL</span>
        </h1>
        <p className="mb-8 text-sm text-muted">Así te ven tus clientes en la página de artistas</p>

        {error   && <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}
        {success && <div className="px-4 py-3 mb-6 text-sm text-green-400 border bg-green-900/20 border-green-700/40">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Foto de perfil */}
          <div className="flex items-center gap-5">
            <Avatar src={form.foto_url} name={form.nombre_artistico} className="w-24 h-24 text-2xl" />
            <label className="px-4 py-2 text-xs tracking-widest uppercase transition-colors border cursor-pointer border-white/15 text-muted hover:border-white/30 hover:text-paper">
              {uploadingFoto ? "Subiendo..." : "Cambiar foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFotoChange} disabled={uploadingFoto} className="hidden" />
            </label>
          </div>

          {fotoToCrop && (
            <AvatarCropper
              file={fotoToCrop}
              onCancel={() => setFotoToCrop(null)}
              onConfirm={handleFotoCropped}
            />
          )}

          {/* Campos básicos */}
          <Field label="Nombre artístico *">
            <input name="nombre_artistico" value={form.nombre_artistico} onChange={handleChange} className={inputCls} />
          </Field>

          <Field label="Bio">
            <textarea name="bio" value={form.bio} onChange={handleChange} rows={4} className={inputCls} />
          </Field>

          <Field label="Instagram">
            <input name="instagram" value={form.instagram} onChange={handleChange} placeholder="@tu_usuario" className={inputCls} />
          </Field>

          {/* Especialidades */}
          <div>
            <div className="mb-2 text-xs tracking-widest uppercase text-muted">Especialidades</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.especialidades.map((esp) => (
                <span key={esp} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border bg-red/10 border-red/30 text-red">
                  {esp}
                  <button type="button" onClick={() => removeEspecialidad(esp)} className="hover:text-white">✕</button>
                </span>
              ))}
              {form.especialidades.length === 0 && (
                <span className="text-xs text-muted">Aún no agregas especialidades.</span>
              )}
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
                  <select
                    value={h.dia}
                    onChange={(e) => updateHorario(i, "dia", e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="px-3 py-2 text-xs capitalize border outline-none bg-ink2 border-paper/10 text-paper focus:border-red"
                  >
                    {DIAS.map((d) => <option key={d} value={d} className="bg-ink2 text-paper">{d}</option>)}
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

          {/* Tabla de precios */}
          <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-4 lg:px-10">
            <div className="max-w-5xl mx-auto">
              <div className="mb-1 text-xs tracking-widest uppercase text-muted">Tabla de precios aproximados</div>
              <p className="mb-3 text-xs text-muted">
                Define un rango de precio (CLP) por zona y tamaño. Deja en blanco las combinaciones que no ofrezcas.
              </p>

              {/* Matriz zona × tamaño */}
              <div className="overflow-x-auto border border-white/10">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="sticky left-0 p-3 text-left border-r bg-ink2 border-white/10 text-muted min-w-[140px]">Zona</th>
                      {PRICE_SIZES.map((s) => (
                        <th key={s.value} className="p-3 text-center border-r border-white/10 text-muted min-w-[170px]">
                          {s.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PRICE_ZONES.map((zona) => (
                      <tr key={zona} className="border-t border-white/10">
                        <td className="sticky left-0 p-3 font-medium border-r bg-ink2 border-white/10 text-paper">{zona}</td>
                        {PRICE_SIZES.map((s) => {
                          const key = priceKey(zona, s.value);
                          const val = precios[key] || {};
                          const hasValue = val.min || val.max;
                          return (
                            <td key={s.value} className="p-2 border-r border-white/10">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatThousands(val.min)}
                                  onChange={(e) => updatePrecio(zona, s.value, "min", e.target.value)}
                                  placeholder="Min"
                                  className="w-full px-2 py-1.5 text-[12px] bg-paper/5 border border-paper/10 focus:border-red outline-none text-paper placeholder-muted"
                                />
                                <span className="text-muted">–</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatThousands(val.max)}
                                  onChange={(e) => updatePrecio(zona, s.value, "max", e.target.value)}
                                  placeholder="Max"
                                  className="w-full px-2 py-1.5 text-[12px] bg-paper/5 border border-paper/10 focus:border-red outline-none text-paper placeholder-muted"
                                />
                                {hasValue && (
                                  <button
                                    type="button"
                                    onClick={() => clearPrecio(zona, s.value)}
                                    className="flex-shrink-0 text-muted hover:text-red"
                                    aria-label={`Quitar precio de ${zona} ${s.label}`}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Piezas de región completa */}
              <div className="mt-4">
                <div className="mb-2 text-xs tracking-widest uppercase text-muted">Piezas de región completa</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SPECIAL_SIZES.map((s) => {
                    const key = priceKey(s.zonaLabel, s.value);
                    const val = precios[key] || {};
                    const hasValue = val.min || val.max;
                    return (
                      <div key={s.value} className="flex items-center gap-2 p-3 border border-white/10">
                        <span className="flex-shrink-0 w-32 text-xs text-paper">{s.label}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatThousands(val.min)}
                          onChange={(e) => updatePrecio(s.zonaLabel, s.value, "min", e.target.value)}
                          placeholder="Min"
                          className="w-full px-2 py-1.5 text-[12px] bg-paper/5 border border-paper/10 focus:border-red outline-none text-paper placeholder-muted"
                        />
                        <span className="text-muted">–</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatThousands(val.max)}
                          onChange={(e) => updatePrecio(s.zonaLabel, s.value, "max", e.target.value)}
                          placeholder="Max"
                          className="w-full px-2 py-1.5 text-[12px] bg-paper/5 border border-paper/10 focus:border-red outline-none text-paper placeholder-muted"
                        />
                        {hasValue && (
                          <button
                            type="button"
                            onClick={() => clearPrecio(s.zonaLabel, s.value)}
                            className="flex-shrink-0 text-muted hover:text-red"
                            aria-label={`Quitar precio de ${s.label}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || uploadingFoto}
            className="w-full py-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>

        {/* ── Precios publicados ─────────────────── */}
        <div className="mt-16">
          <h2 className="mb-4 text-2xl tracking-wide font-display">PRECIOS PUBLICADOS</h2>
          {Object.keys(precios).length === 0 ? (
            <p className="text-sm text-muted">Aún no has guardado precios.</p>
          ) : (
            <div className="overflow-x-auto border border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/5 text-muted">
                    <th className="p-3 text-left">Zona</th>
                    <th className="p-3 text-left">Tamaño</th>
                    <th className="p-3 text-left">Rango</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(precios).map(([key, val]) => {
                    const [zona, tamanio] = key.split("|");
                    return (
                      <tr key={key} className="border-t border-white/10">
                        <td className="p-3 text-paper">{zona}</td>
                        <td className="p-3 capitalize text-paper">{tamanio.replace("_", " ")}</td>
                        <td className="p-3 text-paper">
                          {val.min && val.max
                            ? `${formatCLP(val.min)} – ${formatCLP(val.max)}`
                            : <span className="text-muted">Incompleto</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Mi portafolio ─────────────────────────────────────── */}
        <div className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <h2 className="text-2xl tracking-wide font-display">MI PORTAFOLIO</h2>
            <Link to="/artista/portafolio" className="text-xs tracking-widest uppercase text-red hover:underline">
              + Subir trabajo nuevo
            </Link>
          </div>

          <select
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="px-4 py-2 mb-6 text-xs border outline-none bg-ink2 border-white/10 text-paper focus:border-red"
          >
            <option value="">Todos los estilos</option>
            {styles.map((s) => (
              <option key={s._id} value={s.nombre} className="bg-ink2 text-paper"> {s.nombre}
              </option>
            ))}
          </select>

          {portfolioError && (
            <div className="px-4 py-3 mb-4 text-sm border bg-red/10 border-red/30 text-red">{portfolioError}</div>
          )}

          {loadingWorks ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 rounded-full border-red border-t-transparent animate-spin" />
            </div>
          ) : filteredWorks.length === 0 ? (
            <p className="text-sm text-muted">
              {styleFilter
                ? `No tienes trabajos publicados en el estilo "${styleFilter}".`
                : "Aún no has publicado ningún trabajo."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredWorks.map((w) => (
                <div key={w._id} className="relative overflow-hidden border border-white/10 group aspect-square bg-ink2">
                  <img src={assetUrl(w.imagenes_urls?.[0])} alt={w.titulo} className="object-cover w-full h-full" />
                  <div className="absolute inset-0 flex flex-col justify-between p-2 transition-opacity opacity-0 bg-ink/70 group-hover:opacity-100">
                    <div className="text-[11px] leading-tight text-paper">
                      <div className="font-medium">{w.titulo}</div>
                      <div className="text-[9px] uppercase tracking-widest text-muted mt-0.5">
                        {(w.styles || []).map((s) => s.nombre).join(" · ")}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Link
                        to={`/artista/portafolio?edit=${w._id}`}
                        className="flex-1 py-1.5 text-[10px] text-center uppercase tracking-widest bg-white/10 hover:bg-white/20 text-paper"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteWork(w._id)}
                        disabled={deletingId === w._id}
                        className="flex-1 py-1.5 text-[10px] uppercase tracking-widest bg-red/80 hover:bg-red text-white disabled:opacity-60"
                      >
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