import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getArtistsAPI } from "../../api/artists.api";

export default function ArtistsListPage() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArtistsAPI()
      .then(({ data }) => setArtists(data.info || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] tracking-wide mb-10">
        NUESTROS <em className="not-italic text-red" style={{ fontFamily: "'Playfair Display',serif" }}>artistas</em>
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {artists.map((a) => (
            <div key={a._id} className="flex flex-col transition-colors border border-white/10 hover:border-white/25 p-7">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center flex-shrink-0 overflow-hidden text-lg border rounded-full w-14 h-14 border-white/15 font-display bg-ink2">
                  {a.foto_url
                    ? <img src={a.foto_url} alt={a.nombre_artistico} className="object-cover w-full h-full" />
                    : a.nombre_artistico?.slice(0, 2)}
                </div>
                <div>
                  <div className="text-xl tracking-wide font-display">{a.nombre_artistico}</div>
                  <div className="text-[10px] tracking-widest text-red uppercase">
                    {(a.especialidades || []).join(" · ")}
                  </div>
                </div>
              </div>

              {a.bio && <p className="flex-1 mb-4 text-sm leading-relaxed text-muted">{a.bio}</p>}

              {a.instagram && (
                <a href={`https://instagram.com/${a.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"
                  className="inline-block mb-4 text-xs text-muted hover:text-paper">
                  @{a.instagram.replace("@", "")}
                </a>
              )}

              <Link to={`/artists/${a._id}`}
                className="py-3 mt-auto text-xs tracking-widest text-center uppercase transition-colors bg-white/5 hover:bg-red hover:text-white">
                Ver trabajos
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}