import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getPortfolioAPI, deletePortfolioAPI } from "../../api/portfolio.api";
import { getStylesAPI } from "../../api/styles.api";
import { getArtistsAPI } from "../../api/artists.api";
import { useAuth } from "../../context/AuthContext";
import ImageCarousel from "../../components/ui/ImageCarousel";

export default function PortfolioPage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).includes("admin");

  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [styles, setStyles] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const styleFilter = searchParams.get("style") || "";
  const artistFilter = searchParams.get("artist") || "";

  useEffect(() => {
    Promise.all([getStylesAPI(), getArtistsAPI()])
      .then(([s, a]) => {
        setStyles(s.data.info || []);
        setArtists(a.data.info || []);
      })
      .catch(() => {});
  }, []);

  const loadItems = () => {
    setLoading(true);
    const params = {};
    if (artistFilter) params.artist = artistFilter;
    getPortfolioAPI(params)
      .then(({ data }) => setItems(data.info || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(loadItems, [artistFilter]);

  // Un trabajo puede tener varios estilos; se muestra si CUALQUIERA de
  // ellos coincide con el filtro seleccionado.
  const filtered = useMemo(() => {
    if (!styleFilter) return items;
    return items.filter((i) => (i.styles || []).some((s) => s.nombre === styleFilter));
  }, [items, styleFilter]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  // ── Solo admin: elimina cualquier pieza del portafolio ──
  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este trabajo del portafolio? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    setError("");
    try {
      await deletePortfolioAPI(id);
      setItems((prev) => prev.filter((it) => it._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Error al eliminar el trabajo");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] tracking-wide">
          PORTAFOLIO <em className="not-italic text-red" style={{ fontFamily: "'Playfair Display',serif" }}>completo</em>
        </h1>
      </div>

      {error && <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-10">
        <select
          value={styleFilter}
          onChange={(e) => setFilter("style", e.target.value)}
          className="px-4 py-2 text-xs border outline-none bg-white/5 border-white/10 text-paper focus:border-red"
        >
          <option value="">Todos los estilos</option>
          {styles.map((s) => (
            <option key={s._id} value={s.nombre}>{s.nombre}</option>
          ))}
        </select>

        <select
          value={artistFilter}
          onChange={(e) => setFilter("artist", e.target.value)}
          className="px-4 py-2 text-xs border outline-none bg-white/5 border-white/10 text-paper focus:border-red"
        >
          <option value="">Todos los artistas</option>
          {artists.map((a) => (
            <option key={a._id} value={a._id}>{a.nombre_artistico}</option>
          ))}
        </select>

        {(styleFilter || artistFilter) && (
          <button onClick={() => setSearchParams({})}
            className="text-xs underline text-muted underline-offset-4 hover:text-paper">
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">No hay trabajos que coincidan con este filtro todavía.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <div key={item._id} className="relative overflow-hidden group aspect-[4/5] bg-ink2">
              <ImageCarousel images={item.imagenes_urls || []} alt={item.titulo} />
              <div className="absolute inset-0 flex items-end p-4 transition-opacity opacity-0 bg-ink/70 group-hover:opacity-100">
                <div>
                  <div className="text-base tracking-wide font-display">{item.titulo}</div>
                  <div className="text-[10px] tracking-widest uppercase text-muted mt-1">
                    {(item.styles || []).map((s) => s.nombre).join(" · ")} · {item.zona_corporal}
                  </div>
                  {item.artist?.nombre_artistico && (
                    <Link to={`/artists/${item.artist._id}`}
                      className="text-[10px] text-red mt-1 inline-block hover:underline">
                      por {item.artist.nombre_artistico}
                    </Link>
                  )}
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(item._id)}
                  disabled={deletingId === item._id}
                  className="absolute z-10 px-2.5 py-1.5 text-[10px] uppercase tracking-widest bg-red/90 hover:bg-red text-white top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-60"
                >
                  {deletingId === item._id ? "..." : "Eliminar"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}