import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-5 border-b border-white/10 backdrop-blur-xl bg-ink/70">
      {/* Logo */}
      <Link to="/" className="text-3xl tracking-widest font-display text-paper">
        INK<span className="text-red">HAUS</span>
      </Link>

      {/* Links centrales */}
      <div className="items-center hidden gap-8 md:flex">
        {[
          { label: "PORTAFOLIO", href: "/portfolio" },
          { label: "ARTISTAS",   href: "/artists" },
          { label: "PROCESO",    href: "/#process" },
          { label: "CONTACTO",   href: "/#contact" },
        ].map((l) => (
          <a key={l.label} href={l.href}
            className="text-xs tracking-widest uppercase transition-colors text-muted hover:text-paper">
            {l.label}
          </a>
        ))}
        {hasRole("artista") && (
          <>
            <Link to="/artista/portafolio" className="text-xs tracking-widest uppercase transition-colors text-gold hover:text-paper">
              SUBIR TRABAJO
            </Link>
            <Link to="/artista/perfil" className="text-xs tracking-widest uppercase transition-colors text-gold hover:text-paper">
              MI PERFIL
            </Link>
          </>
        )}
        {hasRole("admin") && (
          <Link to="/admin"
            className="text-xs tracking-widest uppercase transition-colors text-gold hover:text-paper">
            ADMIN
          </Link>
        )}
      </div>

      {/* Auth actions */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <span className="hidden text-xs text-muted sm:block">
              Hola, <span className="font-medium text-paper">{user.name}</span>
            </span>
            <button onClick={handleLogout}
              className="text-xs tracking-widest uppercase transition-colors text-muted hover:text-paper">
              Salir
            </button>
          </>
        ) : (
          <>
            <Link to="/login"
              className="text-xs tracking-widest uppercase transition-colors text-muted hover:text-paper">
              Ingresar
            </Link>
            <Link to="/register"
              className="px-5 py-2 text-xs font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover">
              Reservar cita
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}