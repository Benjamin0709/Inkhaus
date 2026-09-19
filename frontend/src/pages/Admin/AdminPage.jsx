import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getAllArtistsAdminAPI,
  createArtistFullAPI,
  updateArtistFullAPI,
  deleteArtistAPI,
  reactivateArtistAPI,
  deleteArtistPermanentAPI,
} from "../../api/artists.api";
import { getStylesAPI, createStyleAPI } from "../../api/styles.api";

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const DIA_LABEL = {
  lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue",
  viernes: "Vie", sabado: "Sáb", domingo: "Dom",
};

const inputCls =
  "w-full bg-paper/5 border border-paper/10 focus:border-red outline-none " +
  "text-paper placeholder-muted px-3 py-2 text-sm transition-colors";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  nombre_artistico: "",
  bio: "",
  instagram: "",
  especialidades: [],
  horarios: [],
};

export default function AdminPage() {
  const { user } = useAuth();

  const [artists, setArtists] = useState([]);
  const [styles, setStyles] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // editingId === null -> modo "crear nuevo"; si tiene valor -> editando ese artista
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [nuevoEstilo, setNuevoEstilo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadArtists = () => {
    setLoadingList(true);
    getAllArtistsAdminAPI()
      .then(({ data }) => setArtists(data.info || []))
      .catch(() => setArtists([]))
      .finally(() => setLoadingList(false));
  };

  const loadStyles = () => {
    getStylesAPI()
      .then(({ data }) => setStyles(data.info || []))
      .catch(() => setStyles([]));
  };

  useEffect(() => {
    loadArtists();
    loadStyles();
  }, []);

  // ── Especialidades (checkbox multi-select) ──────────────────────────
  const toggleEspecialidad = (nombre) => {
    setForm((f) => ({
      ...f,
      especialidades: f.especialidades.includes(nombre)
        ? f.especialidades.filter((e) => e !== nombre)
        : [...f.especialidades, nombre],
    }));
  };

  const handleCreateStyle = async () => {
    const nombre = nuevoEstilo.trim();
    if (!nombre) return;
    try {
      const { data } = await createStyleAPI({ nombre });
      setStyles((prev) => [...prev, data.info].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setForm((f) => ({ ...f, especialidades: [...f.especialidades, data.info.nombre] }));
      setNuevoEstilo("");
    } catch (e) {
      setError(e.response?.data?.message || "No se pudo crear el estilo");
    }
  };

  // ── Horarios (bloques día/desde/hasta) ───────────────────────────────
  const addHorario = () => {
    setForm((f) => ({
      ...f,
      horarios: [...f.horarios, { dia: "lunes", desde: "10:00", hasta: "18:00" }],
    }));
  };
  const updateHorario = (i, field, value) => {
    setForm((f) => {
      const horarios = [...f.horarios];
      horarios[i] = { ...horarios[i], [field]: value };
      return { ...f, horarios };
    });
  };
  const removeHorario = (i) => {
    setForm((f) => ({ ...f, horarios: f.horarios.filter((_, idx) => idx !== i) }));
  };

  // ── Iniciar edición: precarga el formulario con los datos del artista ──
  const startEdit = (artist) => {
    setEditingId(artist._id);
    setForm({
      name: artist.user?.name || "",
      email: artist.user?.email || "",
      password: "", // no se edita acá
      nombre_artistico: artist.nombre_artistico || "",
      bio: artist.bio || "",
      instagram: artist.instagram || "",
      especialidades: artist.especialidades || [],
      horarios: artist.horarios || [],
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  // ── Submit (crear o actualizar según editingId) ──────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (editingId) {
      if (!form.name.trim() || !form.email.trim() || !form.nombre_artistico.trim()) {
        setError("Nombre, correo y nombre artístico son obligatorios.");
        return;
      }
      setSubmitting(true);
      try {
        await updateArtistFullAPI(editingId, {
          name: form.name,
          email: form.email,
          nombre_artistico: form.nombre_artistico,
          bio: form.bio,
          instagram: form.instagram,
          especialidades: form.especialidades,
          horarios: form.horarios,
        });
        setSuccess(`Artista "${form.nombre_artistico}" actualizado correctamente.`);
        setEditingId(null);
        setForm(emptyForm);
        loadArtists();
      } catch (e) {
        setError(e.response?.data?.message || "No se pudo actualizar el artista.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Modo creación
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.nombre_artistico.trim()) {
      setError("Nombre, correo, clave provisional y nombre artístico son obligatorios.");
      return;
    }
    if (form.password.length < 8) {
      setError("La clave provisional debe tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      await createArtistFullAPI(form);
      setSuccess(`Artista "${form.nombre_artistico}" creado correctamente.`);
      setForm(emptyForm);
      loadArtists();
    } catch (e) {
      setError(e.response?.data?.message || "No se pudo crear el artista.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (artist) => {
    if (!confirm(`¿Desactivar a ${artist.nombre_artistico}? No aparecerá más en el portafolio ni en el chatbot, pero se conserva su historial.`)) return;
    try {
      await deleteArtistAPI(artist._id);
      loadArtists();
    } catch (e) {
      alert(e.response?.data?.message || "No se pudo desactivar el artista.");
    }
  };

  const handleReactivate = async (artist) => {
    try {
      await reactivateArtistAPI(artist._id);
      loadArtists();
    } catch (e) {
      alert(e.response?.data?.message || "No se pudo reactivar el artista.");
    }
  };

  const handleDeletePermanent = async (artist) => {
    const confirmText = `ELIMINAR ${artist.nombre_artistico.toUpperCase()}`;
    const typed = prompt(
      `Esta acción es IRREVERSIBLE: se borrará su cuenta y perfil de la base de datos.\n\nEscribe exactamente:\n${confirmText}\n\npara confirmar:`
    );
    if (typed !== confirmText) return;
    try {
      await deleteArtistPermanentAPI(artist._id);
      loadArtists();
    } catch (e) {
      alert(e.response?.data?.message || "No se pudo eliminar el artista.");
    }
  };

  return (
    <div className="min-h-screen px-6 pt-24 pb-20 md:px-12">
      <h1 className="mb-2 text-5xl tracking-wide font-display">
        PANEL <span className="text-red">ADMIN</span>
      </h1>
      <p className="mb-10 text-sm text-muted">Bienvenido, {user?.name}.</p>

      {/* Módulos aún no implementados */}
      <div className="grid gap-6 md:grid-cols-2 mb-14">
        {["Tabla de precios", "Reportes y citas"].map((t) => (
          <div key={t} className="p-8 border cursor-not-allowed border-paper/10 opacity-40">
            <div className="mb-2 text-xl tracking-wider font-display">{t}</div>
            <div className="text-xs tracking-widest uppercase text-muted">Próximamente — TS-5</div>
          </div>
        ))}
      </div>

      {/* ── Gestión de artistas ─────────────────────────────────────── */}
      <section>
        <h2 className="pb-3 mb-6 text-2xl tracking-wider border-b font-display border-paper/10">
          Gestión de artistas
        </h2>

        <div className="grid lg:grid-cols-[380px_1fr] gap-8">
          {/* Formulario de creación / edición */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 border border-paper/10 h-fit">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs tracking-widest uppercase text-muted">
                {editingId ? "Editando artista" : "Nuevo artista"}
              </div>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="text-xs underline text-muted hover:text-paper">
                  Cancelar edición
                </button>
              )}
            </div>

            <Field label="Nombre completo">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder="Ej: Benjamin Rojas"
              />
            </Field>

            <Field label="Correo (será su usuario de acceso)">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
                placeholder="benjamin@inkhaus.cl"
              />
            </Field>

            {!editingId && (
              <Field label="Clave provisional (mín. 8 caracteres)">
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                  placeholder="Se la comunicas tú al artista"
                />
              </Field>
            )}

            <Field label="Nombre artístico (público)">
              <input
                value={form.nombre_artistico}
                onChange={(e) => setForm({ ...form, nombre_artistico: e.target.value })}
                className={inputCls}
                placeholder="Ej: Benjamin R."
              />
            </Field>

            <Field label="Instagram (opcional)">
              <input
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                className={inputCls}
                placeholder="@usuario"
              />
            </Field>

            <Field label="Bio corta (opcional)">
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className={`${inputCls} resize-none`}
                rows={2}
              />
            </Field>

            {/* Especialidades */}
            <div>
              <div className="mb-2 text-xs tracking-widest uppercase text-muted">Especialidades</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {styles.map((s) => {
                  const active = form.especialidades.includes(s.nombre);
                  return (
                    <button
                      type="button"
                      key={s._id}
                      onClick={() => toggleEspecialidad(s.nombre)}
                      className={`px-2.5 py-1 text-xs border transition-colors ${
                        active
                          ? "bg-red text-white border-red"
                          : "border-paper/20 text-paper/80 hover:border-paper/50"
                      }`}
                    >
                      {s.nombre}
                    </button>
                  );
                })}
                {styles.length === 0 && (
                  <span className="text-xs text-muted">Aún no hay estilos creados — crea el primero abajo.</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={nuevoEstilo}
                  onChange={(e) => setNuevoEstilo(e.target.value)}
                  placeholder="Crear estilo nuevo…"
                  className={`${inputCls} flex-1 text-xs`}
                />
                <button
                  type="button"
                  onClick={handleCreateStyle}
                  className="px-3 text-xs tracking-wide uppercase border border-paper/20 hover:border-paper/50"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* Horarios */}
            <div>
              <div className="mb-2 text-xs tracking-widest uppercase text-muted">Horarios semanales</div>
              <div className="space-y-1.5">
                {form.horarios.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <select
                      value={h.dia}
                      onChange={(e) => updateHorario(i, "dia", e.target.value)}
                      className={`${inputCls} flex-1 text-xs`}
                    >
                      {DIAS.map((d) => (
                        <option key={d} value={d}>{DIA_LABEL[d]}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={h.desde}
                      onChange={(e) => updateHorario(i, "desde", e.target.value)}
                      className={`${inputCls} text-xs w-[92px]`}
                    />
                    <span className="text-xs text-muted">–</span>
                    <input
                      type="time"
                      value={h.hasta}
                      onChange={(e) => updateHorario(i, "hasta", e.target.value)}
                      className={`${inputCls} text-xs w-[92px]`}
                    />
                    <button
                      type="button"
                      onClick={() => removeHorario(i)}
                      className="px-1 text-xs text-muted hover:text-red"
                      aria-label="Quitar bloque de horario"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addHorario}
                className="px-3 py-1 mt-2 text-xs tracking-wide uppercase border border-paper/20 hover:border-paper/50"
              >
                + Agregar bloque
              </button>
            </div>

            {error && <div className="px-3 py-2 text-xs border text-red border-red/40 bg-red/10">{error}</div>}
            {success && (
              <div className="px-3 py-2 text-xs text-green-400 border border-green-400/40 bg-green-400/10">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-red hover:bg-red-hover disabled:opacity-40 text-white py-2.5 text-sm uppercase tracking-widest transition-colors"
            >
              {submitting
                ? (editingId ? "Guardando…" : "Creando…")
                : (editingId ? "Guardar cambios" : "Crear artista")}
            </button>
          </form>

          {/* Listado de artistas */}
          <div>
            {loadingList ? (
              <div className="text-sm text-muted">Cargando artistas…</div>
            ) : artists.length === 0 ? (
              <div className="p-10 text-sm text-center border border-paper/10 text-muted">
                Todavía no hay artistas registrados. Crea el primero con el formulario de la izquierda.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {artists.map((a) => (
                  <div key={a._id} className={`border p-5 ${a.activo ? "border-paper/10" : "border-paper/5 opacity-60"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-lg tracking-wide font-display">
                          {a.nombre_artistico}
                          {!a.activo && (
                            <span className="text-[9px] uppercase tracking-widest border border-muted/40 text-muted px-1.5 py-0.5">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted">{a.user?.email}</div>
                      </div>
                    </div>

                    {a.especialidades?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {a.especialidades.map((e) => (
                          <span key={e} className="text-[10px] uppercase tracking-wide border border-paper/20 px-2 py-0.5 text-paper/70">
                            {e}
                          </span>
                        ))}
                      </div>
                    )}

                    {a.horarios?.length > 0 && (
                      <div className="mt-3 text-xs text-muted space-y-0.5">
                        {a.horarios.map((h, i) => (
                          <div key={i}>
                            {DIA_LABEL[h.dia]} · {h.desde} – {h.hasta}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-3 pt-3 mt-4 border-t border-paper/10">
                      <button
                        onClick={() => startEdit(a)}
                        className="text-xs tracking-wide uppercase text-paper/80 hover:text-red"
                      >
                        Editar
                      </button>

                      {a.activo ? (
                        <button
                          onClick={() => handleDeactivate(a)}
                          className="text-xs tracking-wide uppercase text-muted hover:text-red"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(a)}
                          className="text-xs tracking-wide text-green-400 uppercase hover:text-green-300"
                        >
                          Reactivar
                        </button>
                      )}

                      <button
                        onClick={() => handleDeletePermanent(a)}
                        className="ml-auto text-xs tracking-wide uppercase text-red/70 hover:text-red"
                      >
                        Eliminar definitivamente
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="mb-1 text-xs tracking-widest uppercase text-muted">{label}</div>
      {children}
    </div>
  );
}