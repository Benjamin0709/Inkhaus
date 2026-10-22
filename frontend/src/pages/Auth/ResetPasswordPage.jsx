import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { resetPasswordAPI } from "../../api/auth.api";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Mínimo 8 caracteres");
    if (password !== confirm) return setError("Las contraseñas no coinciden");
    try {
      setLoading(true);
      await resetPasswordAPI(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "El enlace es inválido o expiró");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-8 pt-20">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-3xl tracking-wide font-display">NUEVA <span className="text-red">CONTRASEÑA</span></h1>

        {success ? (
          <p className="text-sm text-muted">¡Listo! Tu contraseña fue actualizada. Te llevamos a iniciar sesión...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="px-4 py-3 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva contraseña"
              className="w-full px-4 py-3 text-sm transition-colors border outline-none bg-paper/5 border-paper/10 focus:border-red text-paper placeholder-muted" />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar contraseña"
              className="w-full px-4 py-3 text-sm transition-colors border outline-none bg-paper/5 border-paper/10 focus:border-red text-paper placeholder-muted" />
            <button type="submit" disabled={loading}
              className="w-full py-4 text-sm font-medium tracking-widest text-white uppercase transition-colors bg-red hover:bg-red-hover disabled:opacity-60">
              {loading ? "Guardando..." : "Restablecer contraseña"}
            </button>
            <Link to="/login" className="block text-xs text-center text-muted hover:text-paper">Cancelar</Link>
          </form>
        )}
      </div>
    </div>
  );
}