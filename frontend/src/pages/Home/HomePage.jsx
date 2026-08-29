import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getArtistsAPI } from "../../api/artists.api";
import { getPortfolioAPI } from "../../api/portfolio.api";

// ─── Datos de muestra mientras la BD no tiene datos ──────
const SAMPLE_PORTFOLIO = [
  { _id: "1", titulo: "Retrato realista", zona_corporal: "espalda", style: { nombre: "Realismo" }, color: "#1a1a1a" },
  { _id: "2", titulo: "Mandala geométrico", zona_corporal: "antebrazo", style: { nombre: "Geometría" }, color: "#111" },
  { _id: "3", titulo: "Koi japonés", zona_corporal: "pierna", style: { nombre: "Blackwork" }, color: "#0d0d0d" },
  { _id: "4", titulo: "Acuarela floral", zona_corporal: "hombro", style: { nombre: "Acuarela" }, color: "#161616" },
  { _id: "5", titulo: "Personaje anime", zona_corporal: "brazo", style: { nombre: "Anime" }, color: "#131313" },
  { _id: "6", titulo: "Portrait black & gray", zona_corporal: "pecho", style: { nombre: "Black & Gray" }, color: "#0f0f0f" },
];

const SAMPLE_ARTISTS = [
  { _id: "1", nombre_artistico: "VALENTINA A.", especialidades: ["Realismo", "Hiperrealismo"], bio: "Especialista en retratos y texturas ultra-detalladas. Estudió bellas artes en Buenos Aires.", initials: "VA" },
  { _id: "2", nombre_artistico: "MARCO R.", especialidades: ["Blackwork", "Geometría"], bio: "Formas geométricas precisas y patrones ornamentales. Referente del blackwork en Latinoamérica.", initials: "MR" },
  { _id: "3", nombre_artistico: "CAMILA L.", especialidades: ["Anime", "Cartoon", "Color"], bio: "Vida y color en cada línea. Mezcla influencias del anime japonés con el estilo cartoon.", initials: "CL" },
];

const TABS = ["Todos", "Realismo", "Black & Gray", "Anime", "Blackwork", "Acuarela"];

export default function HomePage() {
  const [portfolio, setPortfolio] = useState(SAMPLE_PORTFOLIO);
  const [artists, setArtists]     = useState(SAMPLE_ARTISTS);
  const [activeTab, setActiveTab] = useState("Todos");

  useEffect(() => {
    getPortfolioAPI().then(({ data }) => { if (data.info?.length) setPortfolio(data.info); }).catch(() => {});
    getArtistsAPI().then(({ data }) => { if (data.info?.length) setArtists(data.info); }).catch(() => {});
  }, []);

  const filtered = activeTab === "Todos"
    ? portfolio
    : portfolio.filter((p) => p.style?.nombre === activeTab);

  return (
    <main className="relative z-10">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative flex flex-col justify-end min-h-screen px-12 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-ink via-ink2 to-black" />
        {/* Grid overlay */}
        <div className="absolute inset-0 z-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(#f2ede8 1px,transparent 1px),linear-gradient(90deg,#f2ede8 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
        {/* Large decorative text */}
        <div className="absolute right-[-2rem] top-1/2 -translate-y-1/2 font-display text-[14vw] text-paper/3 select-none pointer-events-none z-0 leading-none">
          INK  HAUS
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="text-xs tracking-[0.3em] uppercase text-muted mb-6">
            Santiago · Chile · Est. 2018
          </div>
          <h1 className="font-display text-[clamp(4rem,10vw,9rem)] leading-none mb-6 tracking-wide">
            EL ARTE<br />
            QUE <em className="not-italic font-normal font-italic text-red" style={{ fontFamily: "'Playfair Display', serif" }}>permanece</em>
          </h1>
          <p className="max-w-lg mb-10 text-lg font-light leading-relaxed text-muted">
            Tatuajes de autor diseñados para durar toda la vida. Cada pieza es única, creada en colaboración contigo.
          </p>
          <div className="flex gap-4">
            <Link to="/register"
              className="px-8 py-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover">
              Reservar cita
            </Link>
            <a href="#portfolio"
              className="px-8 py-4 text-sm font-light tracking-widest uppercase transition-colors border border-paper/20 hover:border-paper/50 text-paper">
              Ver portafolio
            </a>
          </div>
        </div>

      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 border-t border-b md:grid-cols-4 border-paper/10">
        {[
          { num: "8+",    label: "Años de experiencia" },
          { num: "100+", label: "Piezas realizadas" },
          { num: "3",     label: "Artistas en el estudio" },
          { num: "6",    label: "Estilos disponibles" },
        ].map((s) => (
          <div key={s.label} className="px-8 py-10 text-center border-r border-paper/10 last:border-r-0">
            <div className="mb-2 text-5xl font-display text-paper">{s.num}</div>
            <div className="text-xs tracking-widest uppercase text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── PORTAFOLIO ───────────────────────────────────── */}
      <section id="portfolio" className="px-12 py-24">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] tracking-wide">
            PORTAFOLIO <em className="font-italic text-[0.7em] italic text-red" style={{ fontFamily: "'Playfair Display',serif" }}>reciente</em>
          </h2>
          <a href="#" className="text-muted text-xs tracking-widest uppercase border-b border-muted pb-0.5 hover:text-paper hover:border-paper transition-colors">
            Ver todo →
          </a>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-xs tracking-widest uppercase transition-colors border
                ${activeTab === tab
                  ? "bg-red border-red text-white"
                  : "border-paper/20 text-muted hover:border-paper/50 hover:text-paper"}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {filtered.map((item, i) => (
            <div key={item._id}
              className="relative overflow-hidden cursor-pointer group"
              style={{ paddingBottom: i % 3 === 1 ? "70%" : "60%", background: item.color || "#111" }}>
              {item.imagen_url && (
                <img src={item.imagen_url} alt={item.titulo}
                  className="absolute inset-0 object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 flex items-end p-5 transition-opacity duration-300 opacity-0 bg-ink/60 group-hover:opacity-100">
                <div>
                  <div className="text-lg tracking-wider font-display text-paper">{item.titulo}</div>
                  <div className="mt-1 text-xs tracking-widest uppercase text-muted">
                    {item.style?.nombre} · {item.zona_corporal}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ARTISTAS ─────────────────────────────────────── */}
      <section id="artists" className="px-12 pb-24">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] tracking-wide">
            NUESTROS <em className="font-italic text-[0.7em] italic text-red" style={{ fontFamily: "'Playfair Display',serif" }}>artistas</em>
          </h2>
          <a href="#" className="text-muted text-xs tracking-widest uppercase border-b border-muted pb-0.5 hover:text-paper transition-colors">
            Conocerlos →
          </a>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {artists.map((a) => (
            <div key={a._id}
              className="p-8 transition-colors border cursor-pointer border-paper/10 hover:border-paper/30 group">
              <div className="flex items-center justify-center w-16 h-16 mb-6 text-xl transition-colors border rounded-full border-paper/20 font-display text-paper group-hover:border-red group-hover:text-red">
                {a.initials || a.nombre_artistico?.slice(0, 2)}
              </div>
              <div className="mb-1 text-xl tracking-wider font-display">{a.nombre_artistico}</div>
              <div className="mb-4 text-xs tracking-widest uppercase text-red">
                {Array.isArray(a.especialidades) ? a.especialidades.join(" · ") : a.especialidad}
              </div>
              <p className="text-sm font-light leading-relaxed text-muted">{a.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────── */}
      <div className="flex flex-col items-center justify-between gap-6 px-12 py-20 bg-red md:flex-row">
        <div className="font-display text-[clamp(2rem,4vw,3.5rem)] tracking-wide text-white leading-tight">
          ¿LISTO PARA TU{" "}
          <em className="italic font-italic" style={{ fontFamily: "'Playfair Display',serif" }}>próxima</em>{" "}
          PIEZA?
        </div>
        <Link to="/register"
          className="px-10 py-4 text-sm font-medium tracking-widest uppercase transition-colors bg-white text-red hover:bg-paper whitespace-nowrap">
          Agendar ahora →
        </Link>
      </div>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="flex flex-col items-center justify-between gap-4 px-12 py-10 border-t border-paper/10 md:flex-row">
        <div className="text-2xl tracking-widest font-display">
          INK<span className="text-red">.</span>HAUS
        </div>
        <div className="text-xs tracking-widest text-center text-muted">
          © 2026 Ink Haus Studio · Santiago, Chile · Todos los derechos reservados
        </div>
      </footer>

    </main>
  );
}
