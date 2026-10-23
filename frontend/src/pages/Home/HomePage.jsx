import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getArtistsAPI } from "../../api/artists.api";
import { getPortfolioAPI } from "../../api/portfolio.api";
import { getStylesAPI } from "../../api/styles.api";
import { assetUrl } from "../../utils/assetUrl";
import BookingCTALink from "../../components/ui/BookingCTALink";

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
      <section className="relative flex flex-col justify-end min-h-[100svh] px-5 pt-28 pb-28 overflow-hidden sm:px-8 md:px-12 md:pb-20">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-ink via-ink2 to-black" />
        <div className="absolute inset-0 z-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(#f2ede8 1px,transparent 1px),linear-gradient(90deg,#f2ede8 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
        <div aria-hidden="true" className="absolute right-0 top-[18%] md:top-1/2 md:-translate-y-1/2 font-display text-[24vw] md:text-[22vw] text-paper/[0.035] select-none pointer-events-none z-0 leading-none whitespace-nowrap">
          INKHAUS
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="mb-5 text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase text-muted md:mb-6">Santiago · Chile · Est. 2018</div>
          <h1 className="font-display text-[clamp(3.25rem,13vw,5rem)] md:text-[clamp(4rem,10vw,9rem)] leading-[0.95] md:leading-none mb-5 md:mb-6 tracking-wide">
            EL ARTE<br />
            QUE <em className="not-italic text-red" style={{ fontFamily: "'Playfair Display', serif" }}>permanece</em>
          </h1>
          <p className="max-w-lg mb-8 text-base font-light leading-relaxed md:mb-10 md:text-lg text-muted">
            Tatuajes de autor diseñados para durar toda la vida. Cada pieza es única, creada en colaboración contigo.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <BookingCTALink className="px-6 py-3.5 text-xs font-medium tracking-widest text-center text-white uppercase transition-colors md:px-8 md:py-4 md:text-sm bg-red hover:bg-red-hover">
              Reservar cita
            </BookingCTALink>
            <a href="#portfolio" className="px-6 py-3.5 text-xs font-light tracking-widest text-center uppercase transition-colors border md:px-8 md:py-4 md:text-sm border-paper/20 hover:border-paper/50 text-paper">
              Ver portafolio
            </a>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────── */}
      <div className="grid grid-cols-2 border-t border-b md:grid-cols-4 border-paper/10">
        {statsData.map((s) => (
          <div key={s.label} className="px-3 py-8 text-center border-b border-r md:px-8 md:py-10 border-paper/10 even:border-r-0 md:even:border-r md:border-b-0 md:last:border-r-0">
            <div className="mb-2 text-4xl md:text-5xl font-display text-paper">{s.num}</div>
            <div className="text-[10px] md:text-xs tracking-[0.15em] md:tracking-widest uppercase text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── ESTILOS ─────── */}
      {styles.length > 0 && (
        <section id="portfolio" className="px-5 py-16 border-b sm:px-8 md:px-12 md:py-24 border-paper/10">
          <div className="flex flex-col items-start gap-4 mb-8 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-[clamp(2.25rem,8vw,4rem)] md:text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-wide">
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
                    <img src={assetUrl(img)} alt={style.nombre} className="absolute inset-0 object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-ink2 to-black" />
                  )}
                  <div className="absolute inset-0 flex flex-col justify-end p-3 md:p-4 transition-colors bg-ink/40 group-hover:bg-ink/70">
                    <div className="text-base tracking-wider md:text-lg font-display text-paper">{style.nombre}</div>
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
      <section id="artists" className="px-5 py-16 sm:px-8 md:px-12 md:pt-24 md:pb-24">
        <div className="flex flex-col items-start gap-4 mb-8 sm:flex-row sm:items-end sm:justify-between md:mb-10">
          <h2 className="font-display text-[clamp(2.25rem,8vw,4rem)] md:text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-wide">
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
                className="p-6 text-left transition-colors border cursor-pointer md:p-8 border-paper/10 hover:border-paper/30 group"
              >
                <div className="flex items-center justify-center w-16 h-16 mb-6 overflow-hidden text-xl transition-colors border rounded-full border-paper/20 font-display text-paper group-hover:border-red group-hover:text-red">
                  {a.foto_url ? <img src={assetUrl(a.foto_url)} alt={a.nombre_artistico} className="object-cover w-full h-full" /> : a.nombre_artistico?.slice(0, 2)}
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
      <div className="flex flex-col items-center justify-between gap-6 px-5 py-14 text-center sm:px-8 md:px-12 md:py-20 md:text-left bg-red md:flex-row">
        <div className="font-display text-[clamp(2rem,7vw,3.5rem)] md:text-[clamp(2rem,4vw,3.5rem)] tracking-wide text-white leading-tight">
          ¿LISTO PARA TU <em className="italic" style={{ fontFamily: "'Playfair Display',serif" }}>próxima</em> PIEZA?
        </div>
        <BookingCTALink className="w-full px-6 py-3.5 text-xs font-medium tracking-widest text-center uppercase transition-colors sm:w-auto md:px-8 md:py-4 md:text-sm bg-ink text-paper hover:bg-black">
          Reservar cita
        </BookingCTALink>
      </div>
    </main>
  );
}