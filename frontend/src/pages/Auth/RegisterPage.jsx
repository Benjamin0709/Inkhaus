import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function passwordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

const STRENGTH_LABELS = ["", "Débil", "Regular", "Buena", "Fuerte"];
const STRENGTH_COLORS = ["", "bg-red", "bg-yellow-500", "bg-blue-400", "bg-green-500"];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: "", lastname: "", email: "", phone: "", password: "" });
  const [terms, setTerms]   = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const pwdScore = passwordStrength(form.password);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) { setError("Completa los campos obligatorios"); return; }
    if (form.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (!terms) { setError("Debes aceptar los términos de servicio"); return; }
    try {
      setLoading(true);
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen pt-20">
      {/* Panel visual */}
      <div className="relative flex-col justify-end hidden w-1/2 p-16 overflow-hidden lg:flex bg-ink2">
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink2 to-black" />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(#f2ede8 1px,transparent 1px),linear-gradient(90deg,#f2ede8 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="absolute right-[-1rem] top-1/2 -translate-y-1/2 font-display text-[20vw] text-paper/5 select-none leading-none">
          INK  HAUS
        </div>
        <div className="relative z-10">
          <div className="text-xs tracking-[0.3em] uppercase text-muted mb-4">Únete al estudio</div>
          <div className="mb-4 text-6xl leading-tight tracking-wide font-display text-paper">
            COMIENZA<br />TU <em className="italic text-red" style={{ fontFamily: "'Playfair Display',serif" }}>historia</em>
          </div>
          <p className="max-w-sm text-sm font-light leading-relaxed text-muted">
            Crea tu cuenta para agendar citas, subir referencias y seguir el estado de tu próximo tatuaje.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex flex-col justify-center flex-1 w-full max-w-lg px-8 py-12 mx-auto md:px-16 lg:mx-0">
        <Link to="/" className="mb-10 text-xs tracking-widest uppercase transition-colors text-muted hover:text-paper">
          ← Volver al inicio
        </Link>

        <h1 className="mb-2 text-4xl tracking-wide font-display">CREAR CUENTA</h1>
        <p className="mb-8 text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="underline transition-colors text-paper hover:text-red underline-offset-4">
            Inicia sesión
          </Link>
        </p>

        {error && (
          <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre *">
              <input name="name" type="text" placeholder="Tu nombre"
                value={form.name} onChange={handleChange} className={inputCls} />
            </Field>
            <Field label="Apellido">
              <input name="lastname" type="text" placeholder="Tu apellido"
                value={form.lastname} onChange={handleChange} className={inputCls} />
            </Field>
          </div>

          <Field label="Correo electrónico *">
            <input name="email" type="email" placeholder="tu@email.com"
              value={form.email} onChange={handleChange} className={inputCls} />
          </Field>

          <Field label="Teléfono (opcional)">
            <input name="phone" type="text" placeholder="+56 9 XXXX XXXX"
              value={form.phone} onChange={handleChange} className={inputCls} />
          </Field>

          <Field label="Contraseña *">
            <input name="password" type="password" placeholder="Mínimo 8 caracteres"
              value={form.password} onChange={handleChange} className={inputCls} />
            {form.password && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${i <= pwdScore ? STRENGTH_COLORS[pwdScore] : "bg-paper/10"}`} />
                  ))}
                </div>
                <span className="text-xs tracking-wide text-muted">{STRENGTH_LABELS[pwdScore]}</span>
              </div>
            )}
          </Field>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)}
              className="mt-1 accent-red" />
            <span className="text-xs leading-relaxed text-muted">
              Acepto los{" "}
              <a href="#" className="underline transition-colors text-paper underline-offset-2 hover:text-red">Términos de servicio</a>
              {" "}y la{" "}
              <a href="#" className="underline transition-colors text-paper underline-offset-2 hover:text-red">Política de privacidad</a>
              {" "}de Ink Haus
            </span>
          </label>

          <button type="submit" disabled={loading}
            className="w-full py-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60">
            {loading ? "Creando cuenta..." : "Crear mi cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls = `w-full bg-paper/5 border border-paper/10 focus:border-red outline-none
                  text-paper placeholder-muted px-4 py-3 text-sm transition-colors`;

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs tracking-widest uppercase text-muted">{label}</label>
      {children}
    </div>
  );
}
