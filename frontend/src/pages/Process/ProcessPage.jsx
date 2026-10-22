import { Link } from "react-router-dom";
import BookingCTALink from "../../components/ui/BookingCTALink";

const STEPS = [
  {
    title: "Explora el portafolio",
    text: "Mira los trabajos de cada artista, filtra por estilo y encuentra el que va contigo.",
    link: { to: "/portfolio", label: "Ver portafolio" },
  },
  {
    title: "Cotiza con el asistente 3D",
    text: "Abre el asistente (botón rojo, abajo a la derecha), toca la zona sobre el modelo 3D y elige tamaño y estilo. Recibes un rango de precio en minutos, sin esperar respuesta por WhatsApp.",
  },
  {
    title: "Elige artista y agenda tu hora",
    text: "Revisa el perfil, los trabajos y los precios aproximados de cada artista, y reserva según la disponibilidad que ves en el calendario.",
    link: { to: "/artists", label: "Ver artistas" },
  },
  {
    title: "Paga tu abono",
    text: "Para confirmar la hora se paga un abono en línea con Webpay Plus. El abono se descuenta del valor final, y al pagarlo tu cita queda confirmada automáticamente.",
  },
  {
    title: "Recibe tus recordatorios",
    text: "Te enviamos un correo al reservar y otro 3 días antes de tu cita. Si necesitas cambiar algo, escríbele a tu artista o revisa tus reservas.",
    link: { to: "/mi-cuenta", label: "Ir a Mi cuenta" },
  },
  {
    title: "El día de tu sesión",
    text: "Llega descansado, come antes, usa ropa cómoda que deje la zona accesible y trae tu cédula de identidad. Evita el alcohol las 24 horas previas.",
  },
  {
    title: "Cuida tu tatuaje",
    text: "La curación depende de ti. Sigue la guía de cuidados y, si hace falta, agenda un retoque.",
    link: { to: "/cuidados", label: "Guía de cuidados" },
  },
];

const FAQ = [
  {
    q: "¿Puedo cambiar o cancelar mi hora?",
    a: "Sí. Puedes cancelar desde Mi cuenta o escribirle a tu artista para reagendar. Si ya pagaste el abono, la devolución se coordina con el estudio.",
  },
  {
    q: "¿Qué pasa si no pago el abono?",
    a: "Tu cita queda registrada como pendiente, y solo se confirma cuando se paga el abono.",
  },
  {
    q: "¿Puedo llevar mi propio diseño?",
    a: "Sí. Tu artista lo adapta a su estilo y a la anatomía de la zona antes de tatuarlo.",
  },
];

export default function ProcessPage() {
  return (
    <div className="min-h-screen px-8 pb-20 pt-28 md:px-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="mb-3 text-[clamp(2.5rem,5vw,4rem)] tracking-wide font-display">
          ASÍ <span className="text-red">FUNCIONA</span>
        </h1>
        <p className="max-w-xl mb-12 text-sm leading-relaxed text-muted">
          Del primer vistazo al portafolio hasta el cuidado posterior: este es el camino para tu próximo tatuaje en Ink Haus.
        </p>

        <ol className="mb-16">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-5 pb-8 mb-8 border-b border-white/10 last:border-0 last:mb-0 last:pb-0">
              <div className="flex-shrink-0 w-12 text-5xl leading-none font-display text-red">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <div className="mb-1 text-xl tracking-wide font-display">{s.title}</div>
                <p className="mb-2 text-sm leading-relaxed text-muted">{s.text}</p>
                {s.link && (
                  <Link to={s.link.to} className="text-xs tracking-widest uppercase text-red hover:underline">
                    {s.link.label} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mb-5 text-2xl tracking-wide font-display">PREGUNTAS DEL PROCESO</h2>
        <div className="mb-12 space-y-3">
          {FAQ.map((f) => (
            <div key={f.q} className="p-5 border border-white/10">
              <div className="mb-1 text-sm text-paper">{f.q}</div>
              <p className="text-sm leading-relaxed text-muted">{f.a}</p>
            </div>
          ))}
        </div>

        <BookingCTALink className="inline-block px-8 py-4 text-sm font-medium tracking-widest text-white uppercase bg-red hover:bg-red-hover">
          Reservar cita
        </BookingCTALink>
      </div>
    </div>
  );
}