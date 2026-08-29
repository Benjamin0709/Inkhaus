import { useAuth } from "../../context/AuthContext";

export default function AdminPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen pt-24 px-12">
      <h1 className="font-display text-5xl tracking-wide mb-2">PANEL <span className="text-red">ADMIN</span></h1>
      <p className="text-muted text-sm mb-10">Bienvenido, {user?.name}. Módulos disponibles próximamente (TS-5).</p>
      <div className="grid md:grid-cols-3 gap-6">
        {["Gestión de artistas","Tabla de precios","Reportes y citas"].map((t) => (
          <div key={t} className="border border-paper/10 p-8 opacity-40 cursor-not-allowed">
            <div className="font-display text-xl tracking-wider mb-2">{t}</div>
            <div className="text-xs tracking-widest text-muted uppercase">Próximamente — TS-5</div>
          </div>
        ))}
      </div>
    </div>
  );
}
