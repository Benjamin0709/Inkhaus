import { Link } from 'react-router-dom';

// Copia aquí los mismos enlaces de tu Navbar (mismo texto y misma ruta)
const NAV_LINKS = [
  { to: '/', label: 'Inicio' },
  { to: '/portfolio', label: 'Portafolio' },
  { to: '/artists', label: 'Artistas' },
  { to: '/proceso', label: 'Proceso' },
  { to: '/cuidados', label: 'Cuidados' },
  { to: '/contact', label: 'Contacto' },
  { to: '/mi-cuenta', label: 'Mi cuenta' },
];

const LEGAL_LINKS = [
  { to: '/terminos', label: 'Términos y condiciones' },
  { to: '/privacidad', label: 'Política de privacidad' },
  { to: '/devoluciones', label: 'Cambios y reembolsos' },
];

const linkClass =
  'text-xs tracking-widest transition-colors text-muted hover:text-paper focus-visible:text-paper focus-visible:outline-none focus-visible:underline';

export default function Footer() {
  return (
    <footer className="px-6 py-10 border-t md:px-12 border-paper/10">
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
        <div className="text-2xl tracking-widest font-display">
          INK<span className="text-red">.</span>HAUS
        </div>

        <nav aria-label="Navegación del sitio">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 md:flex-col md:gap-y-2">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Información legal">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 md:flex-col md:gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="pt-6 mt-8 text-xs tracking-widest text-center border-t text-muted border-paper/10">
        © 2026 Ink Haus Studio · Santiago, Chile · Todos los derechos reservados
      </div>
    </footer>
  );
}
