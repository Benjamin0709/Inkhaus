import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BookingCTALink from "../../components/ui/BookingCTALink";

const PUBLIC_LINKS = [
  { label: "Portafolio", to: "/portfolio" },
  { label: "Artistas", to: "/artists" },
  { label: "Proceso", to: "/proceso" },
  { label: "Cuidados", to: "/cuidados" },
  { label: "Contacto", to: "/contact" },
];

const ARTIST_LINKS = [
  { label: "Subir trabajo", to: "/artista/portafolio" },
  { label: "Mi perfil", to: "/artista/perfil" },
  { label: "Mi agenda", to: "/artista/citas" },
];

const desktopLink =
  "text-xs tracking-widest uppercase transition-colors whitespace-nowrap";
const mobileLink =
  "block py-4 text-sm tracking-[0.2em] uppercase border-b border-white/10 transition-colors";

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Cierra el menú al cambiar de página
  useEffect(() => setOpen(false), [pathname]);

  // Bloquea el scroll del fondo mientras el menú está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Cierra con Escape y si se pasa a pantalla ancha
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/");
  };

  const isArtist = hasRole("artista");
  const isAdmin = hasRole("admin");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-xl bg-ink/80">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-12 lg:py-5">
        {/* Logo */}
        <Link
          to="/"
          className="text-2xl tracking-widest sm:text-3xl font-display text-paper whitespace-nowrap"
        >
          INK<span className="text-red">HAUS</span>
        </Link>

        {/* Links centrales (solo escritorio) */}
        <div className="items-center hidden gap-6 lg:flex xl:gap-8">
          {PUBLIC_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={`${desktopLink} text-muted hover:text-paper`}>
              {l.label}
            </Link>
          ))}
          {isArtist &&
            ARTIST_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={`${desktopLink} text-gold hover:text-paper`}>
                {l.label}
              </Link>
            ))}
          {isAdmin && (
            <Link to="/admin" className={`${desktopLink} text-gold hover:text-paper`}>
              Admin
            </Link>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <>
              <Link to="/mi-cuenta" className="hidden text-xs text-muted xl:block hover:text-paper">
                Hola, <span className="font-medium text-paper">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className={`hidden lg:block ${desktopLink} text-muted hover:text-paper`}
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`hidden lg:block ${desktopLink} text-muted hover:text-paper`}>
                Ingresar
              </Link>
              <BookingCTALink className="px-4 py-2.5 text-[11px] sm:px-6 sm:text-xs lg:px-7 lg:py-3 font-medium tracking-widest text-white uppercase whitespace-nowrap transition-colors bg-red hover:bg-red-hover">
                Reservar cita
              </BookingCTALink>
            </>
          )}

          {/* Botón hamburguesa (móvil y tablet) */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="menu-movil"
            className="relative flex items-center justify-center w-11 h-11 -mr-2 lg:hidden text-paper"
          >
            <span
              className={`absolute h-px w-6 bg-current transition-transform duration-200 ${
                open ? "rotate-45" : "-translate-y-[7px]"
              }`}
            />
            <span
              className={`absolute h-px w-6 bg-current transition-opacity duration-200 ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute h-px w-6 bg-current transition-transform duration-200 ${
                open ? "-rotate-45" : "translate-y-[7px]"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Menú desplegable (móvil y tablet) */}
      {open && (
        <div
          id="menu-movil"
          className="lg:hidden absolute top-full left-0 right-0 overflow-y-auto border-b border-white/10 bg-ink px-4 pb-6 sm:px-6"
          style={{ maxHeight: "calc(100dvh - 4rem)" }}
        >
          <Link to="/" className={`${mobileLink} text-paper`}>Inicio</Link>
          {PUBLIC_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={`${mobileLink} text-paper/80 hover:text-paper`}>
              {l.label}
            </Link>
          ))}

          {isArtist &&
            ARTIST_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={`${mobileLink} text-gold`}>
                {l.label}
              </Link>
            ))}
          {isAdmin && (
            <Link to="/admin" className={`${mobileLink} text-gold`}>
              Admin
            </Link>
          )}

          <div className="pt-5">
            {user ? (
              <div className="flex items-center justify-between gap-4">
                <Link to="/mi-cuenta" className="text-sm text-muted hover:text-paper">
                  Hola, <span className="font-medium text-paper">{user.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 text-xs tracking-widest uppercase border border-paper/20 text-paper hover:border-paper/50"
                >
                  Salir
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="block w-full px-5 py-3 text-xs tracking-widest text-center uppercase border border-paper/20 text-paper hover:border-paper/50"
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
