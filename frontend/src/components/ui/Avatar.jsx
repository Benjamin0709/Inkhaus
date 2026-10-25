import SafeImage from "./SafeImage";

/**
 * Avatar circular. Si no hay foto, o la foto falla al cargar,
 * muestra las iniciales en lugar del ícono de imagen rota.
 * `className` define tamaño y tipografía (ej: "w-14 h-14 text-lg").
 */
export default function Avatar({ src, name = "", className = "" }) {
  const initials = name.slice(0, 2) || "?";

  return (
    <div className={`flex items-center justify-center flex-shrink-0 overflow-hidden border rounded-full border-white/15 font-display bg-ink2 ${className}`}>
      <SafeImage
        src={src}
        alt={name}
        className="object-cover w-full h-full"
        fallback={initials}
      />
    </div>
  );
}
