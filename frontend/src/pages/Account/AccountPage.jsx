import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMyAppointmentsAPI, cancelAppointmentAPI } from "../../api/appointment.api";
import { createPaymentAPI } from "../../api/payment.api";
import { createConversationAPI, getMyConversationsAPI } from "../../api/conversation.api";
import { updateMeAPI, changePasswordAPI } from "../../api/auth.api";
import { redirectToWebpay } from "../../utils/webpay";
import { formatCLP } from "../../constants/pricing";
import ConversationThread from "../../components/livechat/ConversationThread";

const TABS = [
  { key: "citas", label: "Mis citas" },
  { key: "mensajes", label: "Mensajes" },
  { key: "datos", label: "Mis datos" },
];

const ESTADO_LABEL = {
  pendiente: { text: "Pendiente", cls: "text-yellow-400 border-yellow-400/40" },
  confirmada: { text: "Confirmada", cls: "text-green-400 border-green-400/40" },
  cancelada: { text: "Cancelada", cls: "text-red/70 border-red/40" },
  completada: { text: "Completada", cls: "text-muted border-white/20" },
};

const inputCls =
  "w-full bg-paper/5 border border-paper/10 focus:border-red outline-none text-paper placeholder-muted px-4 py-3 text-sm transition-colors";

export default function AccountPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "citas";

  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-1 text-4xl tracking-wide font-display">MI <span className="text-red">CUENTA</span></h1>
        <p className="mb-8 text-sm text-muted">Hola, {user?.name}</p>

        <div className="flex gap-1 mb-8 border-b border-white/10">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setParams({ tab: t.key })}
              className={`px-5 py-3 text-xs uppercase tracking-widest transition-colors -mb-px border-b-2 ${
                tab === t.key ? "text-paper border-red" : "text-muted border-transparent hover:text-paper"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "citas" && <AppointmentsTab />}
        {tab === "mensajes" && <MessagesTab />}
        {tab === "datos" && <ProfileTab />}
      </div>
    </div>
  );
}

/* ─────────────────────────── Citas ─────────────────────────── */
function AppointmentsTab() {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getMyAppointmentsAPI()
      .then(({ data }) => setCitas(data.info || []))
      .catch(() => setCitas([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCancel = async (c) => {
    const aviso = c.abono_pagada
      ? "Esta cita tiene la abono pagada. La devolución se coordina con el estudio. ¿Cancelar igualmente?"
      : "¿Cancelar esta cita?";
    if (!window.confirm(aviso)) return;
    setBusyId(c._id);
    setError("");
    try {
      await cancelAppointmentAPI(c._id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cancelar la cita");
    } finally {
      setBusyId(null);
    }
  };

  const handlePay = async (c) => {
    setBusyId(c._id);
    setError("");
    try {
      const { data } = await createPaymentAPI(c._id);
      redirectToWebpay(data.info.url, data.info.token);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo iniciar el pago");
      setBusyId(null);
    }
  };

  if (loading) return <Spinner />;

  const ahora = new Date();
  const proximas = citas.filter((c) => new Date(c.fecha_hora) >= ahora && c.estado !== "cancelada");
  const pasadas = citas.filter((c) => new Date(c.fecha_hora) < ahora || c.estado === "cancelada");

  if (citas.length === 0) {
    return (
      <div className="py-16 text-center text-muted">
        <p className="mb-4 text-sm">Aún no tienes citas agendadas.</p>
        <Link to="/artists" className="inline-block px-6 py-3 text-xs tracking-widest text-white uppercase bg-red hover:bg-red-hover">
          Ver artistas
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && <div className="px-4 py-3 mb-6 text-sm border bg-red/10 border-red/30 text-red">{error}</div>}
      {proximas.length > 0 && (
        <Section title="Próximas">
          {proximas.map((c) => (
            <CitaCard key={c._id} cita={c} busy={busyId === c._id} onCancel={() => handleCancel(c)} onPay={() => handlePay(c)} />
          ))}
        </Section>
      )}
      {pasadas.length > 0 && (
        <Section title="Historial" dim>
          {pasadas.map((c) => <CitaCard key={c._id} cita={c} readOnly />)}
        </Section>
      )}
    </>
  );
}

function CitaCard({ cita, busy, readOnly, onCancel, onPay }) {
  const fecha = new Date(cita.fecha_hora);
  const estado = ESTADO_LABEL[cita.estado] || ESTADO_LABEL.pendiente;
  const activa = !readOnly && ["pendiente", "confirmada"].includes(cita.estado);
  const debeabono = activa && !cita.abono_pagada;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border border-white/10">
      <div>
        <div className="text-sm text-paper">{cita.artista?.nombre_artistico || "Artista"}</div>
        <div className="text-xs text-muted">
          {fecha.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
          {fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted mt-1">
          {cita.tipo === "ajuste" ? "Ajuste de diseño" : "Sesión de tatuaje"}
        </div>
        <div className="mt-1 text-[11px]">
          {cita.abono_pagada ? (
            <span className="text-green-400">abono pagada ✓ {cita.abono_monto ? `· ${formatCLP(cita.abono_monto)}` : ""}</span>
          ) : cita.estado !== "cancelada" && cita.abono_monto ? (
            <span className="text-yellow-400">abono pendiente · {formatCLP(cita.abono_monto)}</span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <span className={`text-[10px] uppercase tracking-widest border px-2 py-1 ${estado.cls}`}>{estado.text}</span>
        <div className="flex gap-3">
          {debeabono && (
            <button onClick={onPay} disabled={busy}
              className="text-[10px] uppercase tracking-widest text-white bg-red hover:bg-red-hover px-3 py-1.5 disabled:opacity-50">
              {busy ? "..." : "Pagar abono"}
            </button>
          )}
          {activa && (
            <button onClick={onCancel} disabled={busy}
              className="text-[10px] uppercase tracking-widest text-red hover:underline disabled:opacity-50">
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Mensajes ─────────────────────────── */
function MessagesTab() {
  const { hasRole } = useAuth();
  const isCliente = !hasRole("artista", "admin");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const load = () =>
    getMyConversationsAPI()
      .then(({ data }) => setConversations(data.info || []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const label = (c) =>
    isCliente ? c.artista?.nombre_artistico || "Equipo Ink Haus" : c.cliente?.name || "Cliente";

  const startTeamChat = async () => {
    try {
      const { data } = await createConversationAPI({});
      await load();
      setActiveId(data.info._id);
    } catch (_e) {}
  };

  if (loading) return <Spinner />;

  return (
    <>
      {isCliente && (
        <div className="flex justify-end mb-3">
          <button onClick={startTeamChat} className="text-xs tracking-widest uppercase text-red hover:underline">
            + Escribir al equipo
          </button>
        </div>
      )}
      <div className="grid md:grid-cols-[260px_1fr] border border-white/10 h-[480px]">
        <div className="overflow-y-auto border-b md:border-b-0 md:border-r border-white/10">
          {conversations.length === 0 ? (
            <p className="p-5 text-xs leading-relaxed text-muted">
              {isCliente
                ? "Aún no tienes conversaciones. Escríbele a un artista desde su perfil o usa \"Escribir al equipo\"."
                : "No tienes conversaciones asignadas por ahora."}
            </p>
          ) : (
            conversations.map((c) => (
              <button key={c._id} onClick={() => setActiveId(c._id)}
                className={`w-full p-3 text-left border-b border-white/5 hover:bg-white/5 ${activeId === c._id ? "bg-white/5" : ""}`}>
                <div className="text-sm truncate text-paper">{label(c)}</div>
                <div className="text-xs truncate text-muted">{c.ultimo_mensaje || "Sin mensajes aún"}</div>
              </button>
            ))
          )}
        </div>
        <div className="min-h-0">
          {activeId ? (
            <ConversationThread key={activeId} conversationId={activeId} onSent={load} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted">Elige una conversación</div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── Datos ─────────────────────────── */
function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", lastname: user?.lastname || "", phone: user?.phone || "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdMsg, setPwdMsg] = useState({ type: "", text: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    if (form.name.trim().length < 2) return setMsg({ type: "error", text: "El nombre debe tener al menos 2 caracteres" });
    setSaving(true);
    try {
      await updateMeAPI(form);
      await refreshUser();
      setMsg({ type: "ok", text: "Datos actualizados" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "No se pudo guardar" });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: "", text: "" });
    if (pwd.next.length < 8) return setPwdMsg({ type: "error", text: "La nueva contraabono debe tener al menos 8 caracteres" });
    if (pwd.next !== pwd.confirm) return setPwdMsg({ type: "error", text: "Las contraabonos no coinciden" });
    setSavingPwd(true);
    try {
      await changePasswordAPI(pwd.current, pwd.next);
      setPwd({ current: "", next: "", confirm: "" });
      setPwdMsg({ type: "ok", text: "Contraabono actualizada. Te enviamos un correo de confirmación." });
    } catch (err) {
      setPwdMsg({ type: "error", text: err.response?.data?.message || "No se pudo cambiar la contraabono" });
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="grid max-w-3xl gap-10 md:grid-cols-2">
      <form onSubmit={saveProfile} className="space-y-4">
        <h2 className="text-xs tracking-widest uppercase text-muted">Datos personales</h2>
        <Flash msg={msg} />
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className={inputCls} />
        <input value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })} placeholder="Apellido" className={inputCls} />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" className={inputCls} />
        <input value={user?.email || ""} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
        <button type="submit" disabled={saving}
          className="w-full py-3 text-xs font-medium tracking-widest text-white uppercase bg-red hover:bg-red-hover disabled:opacity-60">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      <form onSubmit={savePassword} className="space-y-4">
        <h2 className="text-xs tracking-widest uppercase text-muted">Cambiar contraabono</h2>
        <Flash msg={pwdMsg} />
        <input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} placeholder="Contraabono actual" className={inputCls} />
        <input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} placeholder="Nueva contraabono" className={inputCls} />
        <input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} placeholder="Confirmar nueva contraabono" className={inputCls} />
        <button type="submit" disabled={savingPwd}
          className="w-full py-3 text-xs tracking-widest uppercase border border-white/15 text-paper hover:border-white/30 disabled:opacity-60">
          {savingPwd ? "Guardando..." : "Actualizar contraabono"}
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────── Helpers ─────────────────────────── */
function Section({ title, children, dim }) {
  return (
    <div className={`mb-10 ${dim ? "opacity-60" : ""}`}>
      <h2 className="mb-4 text-xs tracking-widest uppercase text-muted">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 rounded-full border-red border-t-transparent animate-spin" />
    </div>
  );
}

function Flash({ msg }) {
  if (!msg.text) return null;
  return (
    <div className={`px-3 py-2 text-xs border ${
      msg.type === "ok" ? "text-green-400 border-green-400/40 bg-green-400/10" : "text-red border-red/40 bg-red/10"
    }`}>
      {msg.text}
    </div>
  );
}