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
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-5
                    border-b border-white/10 backdrop-blur-xl bg-ink/70">
      {/* Logo */}
      <Link to="/" className="font-display text-3xl tracking-widest text-paper">
        INK<span className="text-red">HAUS</span>
      </Link>

      {/* Links centrales */}
      <div className="hidden md:flex gap-8 items-center">
        {[
          { label: "PORTAFOLIO", href: "/#portfolio" },
          { label: "ARTISTAS",   href: "/#artists" },
          { label: "PROCESO",    href: "/#process" },
          { label: "CONTACTO",   href: "/#contact" },
        ].map((l) => (
          <a key={l.label} href={l.href}
            className="text-muted text-xs tracking-widest uppercase hover:text-paper transition-colors">
            {l.label}
          </a>
        ))}
        {hasRole("admin") && (
          <Link to="/admin"
            className="text-gold text-xs tracking-widest uppercase hover:text-paper transition-colors">
            ADMIN
          </Link>
        )}
      </div>

      {/* Auth actions */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <span className="text-muted text-xs hidden sm:block">
              Hola, <span className="text-paper font-medium">{user.name}</span>
            </span>
            <button onClick={handleLogout}
              className="text-xs tracking-widest uppercase text-muted hover:text-paper transition-colors">
              Salir
            </button>
          </>
        ) : (
          <>
            <Link to="/login"
              className="text-xs tracking-widest uppercase text-muted hover:text-paper transition-colors">
              Ingresar
            </Link>
            <Link to="/register"
              className="bg-red hover:bg-red-hover text-white text-xs tracking-widest uppercase
                         px-5 py-2 font-medium transition-colors">
              Reservar cita
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
