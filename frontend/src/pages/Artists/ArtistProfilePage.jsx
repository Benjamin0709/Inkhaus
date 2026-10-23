import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getArtistAPI } from "../../api/artists.api";
import { getPortfolioAPI } from "../../api/portfolio.api";
import ImageCarousel from "../../components/ui/ImageCarousel";
import Avatar from "../../components/ui/Avatar";
import { useLiveChat } from "../../context/LiveChatContext";
import { createConversationAPI } from "../../api/conversation.api";
import { useAuth } from "../../context/AuthContext";
import { getArtistPricingAPI } from "../../api/pricing.api";
import {
  PRICE_ZONES, PRICE_SIZES, SPECIAL_SIZES,
  pricingDocsToArray, formatCLP,
} from "../../constants/pricing";

export default function ArtistProfilePage() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [precios, setPrecios] = useState([]);
  const { user } = useAuth();
  const { openLiveChat } = useLiveChat();

  const handleMessage = async () => {
    if (!user) return (window.location.href = "/login");
    try {
      const { data } = await createConversationAPI({ artistaId: artist._id });
      openLiveChat(data.info._id);
    } catch (_e) {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getArtistAPI(id),
      getPortfolioAPI({ artist: id }),
      getArtistPricingAPI(id),
    ])
      .then(([artistRes, portfolioRes, pricingRes]) => {
        setArtist(artistRes.data.info);
        setWorks(portfolioRes.data.info || []);
        setPrecios(pricingDocsToArray(pricingRes.data.info || []));
      })
      .catch(() => setArtist(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center min-h-screen pt-28">
        <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen px-12 text-center pt-28 text-muted">
        Artista no encontrado. <Link to="/artists" className="underline text-red">Volver a artistas</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <Link to="/artists" className="inline-block mb-8 text-xs tracking-widest uppercase text-muted hover:text-paper">
        ← Todos los artistas
      </Link>

      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between mb-14">
        <div className="flex flex-col gap-8 md:flex-row">
          <Avatar src={artist.foto_url} name={artist.nombre_artistico} className="w-32 h-32 text-3xl" />
          <div>
            <h1 className="mb-1 text-4xl tracking-wide font-display">{artist.nombre_artistico}</h1>
            <div className="mb-4 text-xs tracking-widest uppercase text-red">
              {(artist.especialidades || []).join(" · ")}
            </div>
            {artist.bio && <p className="max-w-xl mb-4 text-sm leading-relaxed text-muted">{artist.bio}</p>}
            {artist.instagram && (
              <a href={`https://instagram.com/${artist.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"
                className="text-sm underline text-paper underline-offset-4 hover:text-red">
                @{artist.instagram.replace("@", "")}
              </a>
            )}
          </div>
        </div>

        <Link to={`/artists/${artist._id}/agendar`}
          className="inline-block px-6 py-3 mt-4 text-xs tracking-widest text-white uppercase bg-red hover:bg-red-hover">
          Agendar cita
        </Link>
      </div>
      <button onClick={handleMessage}
        className="inline-block px-6 py-3 mt-4 ml-2 text-xs tracking-widest uppercase transition-colors border border-white/15 text-paper hover:border-white/30">
        Enviar mensaje
      </button>

      <h2 className="mb-6 text-2xl tracking-wide font-display">TRABAJOS</h2>
      {works.length === 0 ? (
        <p className="text-sm text-muted">Este artista aún no ha publicado trabajos en su portafolio.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {works.map((w) => (
            <div key={w._id} className="relative overflow-hidden group aspect-[4/5] bg-ink2">
              <ImageCarousel images={w.imagenes_urls || []} alt={w.titulo} />
              <div className="absolute inset-0 flex items-end p-4 transition-opacity opacity-0 bg-ink/70 group-hover:opacity-100">
                <div>
                  <div className="text-base tracking-wide font-display">{w.titulo}</div>
                  <div className="text-[10px] tracking-widest uppercase text-muted mt-1">
                    {(w.styles || []).map((s) => s.nombre).join(" · ")} · {w.zona_corporal}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Precios aproximados */}
      {precios.length > 0 && (
        <div className="mb-14">
          <h2 className="mb-6 text-2xl tracking-wide font-display">PRECIOS APROXIMADOS</h2>

          <div className="overflow-x-auto border border-white/10">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="sticky left-0 p-3 text-left border-r bg-ink2 border-white/10 text-muted min-w-[140px]">
                    Zona
                  </th>
                  {PRICE_SIZES.map((s) => (
                    <th key={s.value} className="p-3 text-center border-r border-white/10 text-muted min-w-[130px]">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRICE_ZONES.map((zona) => {
                  const fila = PRICE_SIZES.map((s) =>
                    precios.find((p) => p.zona === zona && p.tamanio === s.value)
                  );
                  if (fila.every((p) => !p)) return null;
                  return (
                    <tr key={zona} className="border-t border-white/10">
                      <td className="sticky left-0 p-3 font-medium border-r bg-ink2 border-white/10 text-paper">
                        {zona}
                      </td>
                      {fila.map((p, i) => (
                        <td key={i} className="p-3 text-center border-r border-white/10 text-paper">
                          {p
                            ? `${formatCLP(p.precio_min)} – ${formatCLP(p.precio_max)}`
                            : <span className="text-white/20">—</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {SPECIAL_SIZES.map((s) => {
            const p = precios.find((pr) => pr.zona === s.zonaLabel && pr.tamanio === s.value);
            if (!p) return null;
            return (
              <div key={s.value} className="flex items-center justify-between px-4 py-3 mt-2 border border-white/10">
                <span className="text-xs text-paper">{s.label}</span>
                <span className="text-xs text-paper">
                  {formatCLP(p.precio_min)} – {formatCLP(p.precio_max)}
                </span>
              </div>
            );
          })}

          <p className="mt-3 text-[10px] text-muted">
            Los precios son aproximados y pueden variar según el diseño y detalles del tatuaje.
          </p>
        </div>
      )}
    </div>
    
    
  );
}