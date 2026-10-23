import { useEffect, useState } from "react";
import { assetUrl } from "../../utils/assetUrl";

/**
 * Avatar circular. Si no hay foto, o la foto falla al cargar,
 * muestra las iniciales en lugar del ícono de imagen rota.
 * `className` define tamaño y tipografía (ej: "w-14 h-14 text-lg").
 */
export default function Avatar({ src, name = "", className = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const url = assetUrl(src);
  const showImg = url && !failed;

  return (
    <div className={`flex items-center justify-center flex-shrink-0 overflow-hidden border rounded-full border-white/15 font-display bg-ink2 ${className}`}>
      {showImg ? (
        <img
          src={url}
          alt={name}
          className="object-cover w-full h-full"
          onError={() => {
            console.warn("[Avatar] No se pudo cargar la imagen:", url);
            setFailed(true);
          }}
        />
      ) : (
        name.slice(0, 2) || "?"
      )}
    </div>
  );
}
