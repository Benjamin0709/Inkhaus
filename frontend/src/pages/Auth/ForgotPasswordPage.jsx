import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordAPI } from "../../api/auth.api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email) return setError("Ingresa tu correo");
    try {
      setLoading(true);
      await forgotPasswordAPI(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-8 pt-20">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-block mb-8 text-xs tracking-widest uppercase transition-colors text-muted hover:text-paper">
          ← Volver a iniciar sesión
        </Link>
        <h1 className="mb-2 text-3xl tracking-wide font-display">RECUPERAR <span className="text-red">CONTRASEÑA</span></h1>

        {sent ? (
          <p className="text-sm text-muted">
            Correo enviado a <strong className="text-paper">{email}</strong>, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <p className="text-sm text-muted">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
            {error && <div className="px-4 py-3 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com"
              className="w-full px-4 py-3 text-sm transition-colors border outline-none bg-paper/5 border-paper/10 focus:border-red text-paper placeholder-muted" />
            <button type="submit" disabled={loading}
              className="w-full py-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60">
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}