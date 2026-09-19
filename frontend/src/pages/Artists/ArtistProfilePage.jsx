import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getArtistAPI } from "../../api/artists.api";
import { getPortfolioAPI } from "../../api/portfolio.api";
import ImageCarousel from "../../components/ui/ImageCarousel";

export default function ArtistProfilePage() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getArtistAPI(id), getPortfolioAPI({ artist: id })])
      .then(([artistRes, portfolioRes]) => {
        setArtist(artistRes.data.info);
        setWorks(portfolioRes.data.info || []);
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
          <div className="flex items-center justify-center flex-shrink-0 w-32 h-32 overflow-hidden text-3xl border rounded-full border-white/15 font-display bg-ink2">
            {artist.foto_url
              ? <img src={artist.foto_url} alt={artist.nombre_artistico} className="object-cover w-full h-full" />
              : artist.nombre_artistico?.slice(0, 2)}
          </div>
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

        <Link to={`/artistas/${artist._id}/reservar`}
          className="flex-shrink-0 px-8 py-4 text-xs font-medium tracking-widest text-center text-white uppercase transition-colors bg-red hover:bg-red-hover">
          Reservar cita
        </Link>
      </div>

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
    </div>
  );
}