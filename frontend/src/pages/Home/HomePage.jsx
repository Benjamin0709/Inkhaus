import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getArtistsAPI } from "../../api/artists.api";
import { getPortfolioAPI } from "../../api/portfolio.api";
import { getStylesAPI } from "../../api/styles.api";

export default function HomePage() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState([]);
  const [artists, setArtists] = useState([]);
  const [styles, setStyles] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [loadingStyles, setLoadingStyles] = useState(true);

  useEffect(() => {
    getPortfolioAPI()
      .then(({ data }) => setPortfolio(data.info || []))
      .catch(() => setPortfolio([]))
      .finally(() => setLoadingPortfolio(false));
    getArtistsAPI()
      .then(({ data }) => setArtists(data.info || []))
      .catch(() => setArtists([]))
      .finally(() => setLoadingArtists(false));
    getStylesAPI()
      .then(({ data }) => setStyles(data.info || []))
      .catch(() => setStyles([]))
      .finally(() => setLoadingStyles(false));
  }, []);

  const stylePreview = (style) => {
    const match = portfolio.find((p) => (p.styles || []).some((s) => s.nombre === style.nombre) && p.imagenes_urls?.length);
    return match?.imagenes_urls?.[0] || style.imagen_referencia_url || null;
  };
  
  const statsData = [
    { num: "8+", label: "Años de experiencia" },
    {
      num: loadingPortfolio ? "…" : `${portfolio.length}${portfolio.length > 0 ? "+" : ""}`,
      label: "Piezas realizadas",
    },
    {
      num: loadingArtists ? "…" : String(artists.length),
      label: "Artistas en el estudio",
    },
    {
      num: loadingStyles ? "…" : String(styles.length),
      label: "Estilos disponibles",
    },
  ];

  return (
    <main className="relative z-10">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative flex flex-col justify-end min-h-screen px-12 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-ink via-ink2 to-black" />
        <div className="absolute inset-0 z-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(#f2ede8 1px,transparent 1px),linear-gradient(90deg,#f2ede8 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
        <div className="absolute right-[-2rem] top-1/2 -translate-y-1/2 font-display text-[22vw] text-paper/3 select-none pointer-events-none z-0 leading-none">
          INK
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="text-xs tracking-[0.3em] uppercase text-muted mb-6">Santiago · Chile · Est. 2018</div>
          <h1 className="font-display text-[clamp(4rem,10vw,9rem)] leading-none mb-6 tracking-wide">
            EL ARTE<br />
            QUE <em className="not-italic text-red" style={{ fontFamily: "'Playfair Display', serif" }}>permanece</em>
          </h1>
          <p className="max-w-lg mb-10 text-lg font-light leading-relaxed text-muted">
            Tatuajes de autor diseñados para durar toda la vida. Cada pieza es única, creada en colaboración contigo.
          </p>
          <div className="flex gap-4">
            <Link to="/register" className="px-8 py-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover">
              Reservar cita
            </Link>
            <a href="#portfolio" className="px-8 py-4 text-sm font-light tracking-widest uppercase transition-colors border border-paper/20 hover:border-paper/50 text-paper">
              Ver portafolio
            </a>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────── */}
      <div className="grid grid-cols-2 border-t border-b md:grid-cols-4 border-paper/10">
        {statsData.map((s) => (
          <div key={s.label} className="px-8 py-10 text-center border-r border-paper/10 last:border-r-0">
            <div className="mb-2 text-5xl font-display text-paper">{s.num}</div>
            <div className="text-xs tracking-widest uppercase text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── ESTILOS ─────── */}
      {styles.length > 0 && (
        <section id="portfolio" className="px-12 py-24 border-b border-paper/10">
          <div className="flex items-end justify-between mb-8">
            <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] tracking-wide">
              EXPLORA POR <em className="not-italic text-red" style={{ fontFamily: "'Playfair Display',serif" }}>estilo</em>
            </h2>
            <Link to="/portfolio" className="text-muted text-xs tracking-widest uppercase border-b border-muted pb-0.5 hover:text-paper hover:border-paper transition-colors">
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {styles.map((style) => {
              const img = stylePreview(style);
              return (
                <button
                  key={style._id}
                  onClick={() => navigate(`/portfolio?style=${encodeURIComponent(style.nombre)}`)}
                  className="relative overflow-hidden text-left group aspect-square bg-ink2"
                >
                  {img ? (
                    <img src={img} alt={style.nombre} className="absolute inset-0 object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-ink2 to-black" />
                  )}
                  <div className="absolute inset-0 flex flex-col justify-end p-4 transition-colors bg-ink/40 group-hover:bg-ink/70">
                    <div className="text-lg tracking-wider font-display text-paper">{style.nombre}</div>
                    {}
                    {style.descripcion && (
                      <div className="text-[11px] text-muted/90 font-light leading-snug mt-1 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {style.descripcion}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── ARTISTAS ─────────────────────────────────────── */}
      <section id="artists" className="px-12 pb-24">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] tracking-wide">
            NUESTROS <em className="not-italic text-red" style={{ fontFamily: "'Playfair Display',serif" }}>artistas</em>
          </h2>
          <Link to="/artists" className="text-muted text-xs tracking-widest uppercase border-b border-muted pb-0.5 hover:text-paper transition-colors">
            Conocerlos →
          </Link>
        </div>

        {loadingArtists ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
          </div>
        ) : artists.length === 0 ? (
          <p className="py-10 text-sm text-muted">Aún no hay artistas cargados en el estudio.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {artists.map((a) => (
              <button
                key={a._id}
                onClick={() => navigate(`/artists/${a._id}`)}
                className="p-8 text-left transition-colors border cursor-pointer border-paper/10 hover:border-paper/30 group"
              >
                <div className="flex items-center justify-center w-16 h-16 mb-6 overflow-hidden text-xl transition-colors border rounded-full border-paper/20 font-display text-paper group-hover:border-red group-hover:text-red">
                  {a.foto_url ? <img src={a.foto_url} alt={a.nombre_artistico} className="object-cover w-full h-full" /> : a.nombre_artistico?.slice(0, 2)}
                </div>
                <div className="mb-1 text-xl tracking-wider font-display">{a.nombre_artistico}</div>
                <div className="mb-4 text-xs tracking-widest uppercase text-red">
                  {(a.especialidades || []).join(" · ")}
                </div>
                {a.bio && <p className="mb-4 text-sm font-light leading-relaxed text-muted">{a.bio}</p>}
                <span className="text-[10px] tracking-widest uppercase text-paper/60 group-hover:text-red transition-colors">
                  Ver perfil →
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── CTA BANNER ───────────────────────────────────── */}
      <div className="flex flex-col items-center justify-between gap-6 px-12 py-20 bg-red md:flex-row">
        <div className="font-display text-[clamp(2rem,4vw,3.5rem)] tracking-wide text-white leading-tight">
          ¿LISTO PARA TU <em className="italic" style={{ fontFamily: "'Playfair Display',serif" }}>próxima</em> PIEZA?
        </div>
        <Link to="/register" className="px-10 py-4 text-sm font-medium tracking-widest uppercase transition-colors bg-white text-red hover:bg-paper whitespace-nowrap">
          Agendar ahora →
        </Link>
      </div>
    </main>
  );
}