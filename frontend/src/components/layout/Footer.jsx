export default function Footer() {
  return (
    <footer className="flex flex-col items-center justify-between gap-4 px-12 py-10 border-t border-paper/10 md:flex-row">
      <div className="text-2xl tracking-widest font-display">
        INK<span className="text-red">.</span>HAUS
      </div>
      <div className="text-xs tracking-widest text-center text-muted">
        © 2026 Ink Haus Studio · Santiago, Chile · Todos los derechos reservados
      </div>
    </footer>
  );
}