import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) { setError("Completa todos los campos"); return; }
    try {
      setLoading(true);
      await login(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen pt-20">
      {/* Panel visual izquierdo */}
      <div className="relative flex-col justify-end hidden w-1/2 p-16 overflow-hidden lg:flex bg-ink2">
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink2 to-black" />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(#f2ede8 1px,transparent 1px),linear-gradient(90deg,#f2ede8 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="absolute right-[-1rem] top-1/2 -translate-y-1/2 font-display text-[20vw] text-paper/5 select-none leading-none">
          INK  HAUS
        </div>
        <div className="relative z-10">
          <div className="text-xs tracking-[0.3em] uppercase text-muted mb-4">Bienvenido de vuelta</div>
          <div className="mb-4 text-6xl leading-tight tracking-wide font-display text-paper">
            ACCEDE<br />A TU <em className="italic text-red" style={{ fontFamily: "'Playfair Display',serif" }}>cuenta</em>
          </div>
          <p className="max-w-sm text-sm font-light leading-relaxed text-muted">
            Gestiona tus citas, revisa el progreso de tu diseño y comunícate con tu artista.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex flex-col justify-center flex-1 w-full max-w-lg px-8 mx-auto md:px-16 lg:mx-0">
        <Link to="/" className="mb-12 text-xs tracking-widest uppercase transition-colors text-muted hover:text-paper">
          ← Volver al inicio
        </Link>

        <h1 className="mb-2 text-4xl tracking-wide font-display">INICIAR SESIÓN</h1>
        <p className="mb-10 text-sm text-muted">
          ¿Sin cuenta aún?{" "}
          <Link to="/register" className="underline transition-colors text-paper hover:text-red underline-offset-4">
            Regístrate gratis
          </Link>
        </p>

        {error && (
          <div className="px-4 py-3 mb-6 text-sm tracking-wide border bg-red/10 border-red/30 text-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Correo electrónico">
            <input name="email" type="email" placeholder="tu@email.com"
              value={form.email} onChange={handleChange}
              className="w-full px-4 py-3 text-sm transition-colors border outline-none bg-paper/5 border-paper/10 focus:border-red text-paper placeholder-muted" />
          </Field>

          <Field label="Contraseña">
            <input name="password" type="password" placeholder="••••••••"
              value={form.password} onChange={handleChange}
              className="w-full px-4 py-3 text-sm transition-colors border outline-none bg-paper/5 border-paper/10 focus:border-red text-paper placeholder-muted" />
          </Field>

          <div className="flex justify-end">
            <a href="#" className="text-xs tracking-wide transition-colors text-muted hover:text-paper">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60">
            {loading ? "Ingresando..." : "Entrar al estudio"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs tracking-widest uppercase text-muted">{label}</label>
      {children}
    </div>
  );
}
