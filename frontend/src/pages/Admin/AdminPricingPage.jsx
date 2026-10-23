import { useEffect, useState } from "react";
import { getArtistPricingAPI, saveArtistPricingAPI } from "../../api/pricing.api";
import { getArtistsAPI } from "../../api/artists.api";
import { assetUrl } from "../../utils/assetUrl";
import {
  PRICE_ZONES, PRICE_SIZES, SPECIAL_SIZES,
  priceKey, pricesArrayToMap, pricesMapToArray,
  pricingDocsToArray, formatCLP,
} from "../../constants/pricing";

export default function AdminPricingPage() {
  const [artists, setArtists]       = useState([]);
  const [artistId, setArtistId]     = useState("");
  const [precios, setPrecios]       = useState({});
  const [loading, setLoading]       = useState(false);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  // ── Cargar lista de artistas ─────────────────────────────
  useEffect(() => {
    getArtistsAPI()
      .then(({ data }) => setArtists(data.info || []))
      .catch(() => setError("No se pudo cargar la lista de artistas"))
      .finally(() => setLoadingArtists(false));
  }, []);

  // ── Cargar precios al cambiar artista ────────────────────
  useEffect(() => {
    if (!artistId) { setPrecios({}); return; }
    setLoading(true);
    setError("");
    setSuccess("");
    getArtistPricingAPI(artistId)
      .then(({ data }) => setPrecios(pricesArrayToMap(pricingDocsToArray(data.info || []))))
      .catch(() => setError("No se pudieron cargar los precios de este artista"))
      .finally(() => setLoading(false));
  }, [artistId]);

  // ── Helpers de formato ───────────────────────────────────
  const formatThousands = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("es-CL");
  };
  const parseThousands = (v) => v.replace(/\D/g, "");

  const updatePrecio = (zona, tamanio, campo, raw) => {
    const key = priceKey(zona, tamanio);
    setPrecios((prev) => ({
      ...prev,
      [key]: { ...prev[key], [campo]: parseThousands(raw) },
    }));
  };

  const clearPrecio = (zona, tamanio) => {
    const key = priceKey(zona, tamanio);
    setPrecios((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  // ── Guardar ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!artistId) return;
    setError("");
    setSuccess("");
    const tabla = pricesMapToArray(precios);
    const invalido = tabla.find((p) => p.precio_min > p.precio_max);
    if (invalido) return setError(`Min > Max en ${invalido.zona} – ${invalido.tamanio}`);
    try {
      setSaving(true);
      const { data } = await saveArtistPricingAPI(artistId, tabla);
      setPrecios(pricesArrayToMap(pricingDocsToArray(data.info)));
      setSuccess("Precios guardados correctamente");
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const selectedArtist = artists.find((a) => a._id === artistId);

  return (
    <div className="min-h-screen px-6 pt-24 pb-20 md:px-12">
      <h1 className="mb-2 text-5xl tracking-wide font-display">
        TABLA DE <span className="text-red">PRECIOS</span>
      </h1>
      <p className="mb-10 text-sm text-muted">
        Revisa y edita los precios aproximados de cada artista
      </p>

      {/* ── Filtro por artista ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pb-6 mb-8 border-b border-paper/10">
        <label className="text-xs tracking-widest uppercase text-muted">Artista</label>
        {loadingArtists ? (
          <div className="w-5 h-5 border-2 rounded-full border-red border-t-transparent animate-spin" />
        ) : (
          <select
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="px-4 py-2 text-xs border outline-none bg-ink2 border-white/10 text-paper focus:border-red"
          >
            <option value="">Seleccionar artista</option>
            {artists.map((a) => (
              <option key={a._id} value={a._id} className="bg-ink2 text-paper">{a.nombre_artistico} </option>
            ))}
          </select>
        )}
        {selectedArtist?.foto_url && (
          <img src={assetUrl(selectedArtist.foto_url)} alt={selectedArtist.nombre_artistico}
            className="object-cover w-8 h-8 border rounded-full border-white/15" />
        )}
        {selectedArtist && (
          <span className="text-xs text-muted">{(selectedArtist.especialidades || []).join(" · ")}</span>
        )}
      </div>

      {error   && <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}
      {success && <div className="px-4 py-3 mb-6 text-sm text-green-400 border bg-green-900/20 border-green-700/40">{success}</div>}

      {!artistId ? (
        <p className="text-sm text-muted">Selecciona un artista para ver o editar sus precios.</p>
      ) : loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Matriz zona × tamaño ──────────────────────────────── */}
          <div className="mb-4 overflow-x-auto border border-white/10">
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
                            <input type="text" inputMode="numeric"
                              value={formatThousands(val.min)}
                              onChange={(e) => updatePrecio(zona, s.value, "min", e.target.value)}
                              placeholder="Min"
                              className="w-full px-2 py-1.5 text-[12px] bg-paper/5 border border-paper/10 focus:border-red outline-none text-paper placeholder-muted"
                            />
                            <span className="text-muted">–</span>
                            <input type="text" inputMode="numeric"
                              value={formatThousands(val.max)}
                              onChange={(e) => updatePrecio(zona, s.value, "max", e.target.value)}
                              placeholder="Max"
                              className="w-full px-2 py-1.5 text-[12px] bg-paper/5 border border-paper/10 focus:border-red outline-none text-paper placeholder-muted"
                            />
                            {hasValue && (
                              <button type="button" onClick={() => clearPrecio(zona, s.value)}
                                className="flex-shrink-0 text-muted hover:text-red">✕</button>
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

          {/* ── Piezas especiales ─────────────────────────────────── */}
          <div className="mb-6">
            <div className="mb-2 text-xs tracking-widest uppercase text-muted">Piezas de región completa</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SPECIAL_SIZES.map((s) => {
                const key = priceKey(s.zonaLabel, s.value);
                const val = precios[key] || {};
                const hasValue = val.min || val.max;
                return (
                  <div key={s.value} className="flex items-center gap-2 p-3 border border-white/10">
                    <span className="flex-shrink-0 w-32 text-xs text-paper">{s.label}</span>
                    <input type="text" inputMode="numeric"
                      value={formatThousands(val.min)}
                      onChange={(e) => updatePrecio(s.zonaLabel, s.value, "min", e.target.value)}
                      placeholder="Min"
                      className="w-full px-2 py-1.5 text-[12px] bg-paper/5 border border-paper/10 focus:border-red outline-none text-paper placeholder-muted"
                    />
                    <span className="text-muted">–</span>
                    <input type="text" inputMode="numeric"
                      value={formatThousands(val.max)}
                      onChange={(e) => updatePrecio(s.zonaLabel, s.value, "max", e.target.value)}
                      placeholder="Max"
                      className="w-full px-2 py-1.5 text-[12px] bg-paper/5 border border-paper/10 focus:border-red outline-none text-paper placeholder-muted"
                    />
                    {hasValue && (
                      <button type="button" onClick={() => clearPrecio(s.zonaLabel, s.value)}
                        className="flex-shrink-0 text-muted hover:text-red">✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Resumen solo lectura ──────────────────────────────── */}
          {Object.keys(precios).length > 0 && (
            <div className="mb-8">
              <div className="mb-2 text-xs tracking-widest uppercase text-muted">Precios actuales guardados</div>
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
            </div>
          )}

          <button onClick={handleSave} disabled={saving}
            className="px-8 py-3 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </>
      )}
    </div>
  );
}
