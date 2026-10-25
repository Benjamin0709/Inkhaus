import { useEffect, useState } from "react";
import { assetUrl, withoutCloudinaryTransform } from "../../utils/assetUrl";

/**
 * <img> que no se queda roto:
 *  1) intenta la URL resuelta (assetUrl),
 *  2) si falla, reintenta sin la transformación de Cloudinary,
 *  3) si vuelve a fallar, muestra `fallback` y deja la URL en la consola.
 */
export default function SafeImage({ src, alt = "", className = "", fallback = null, ...rest }) {
  const [stage, setStage] = useState(0); // 0 normal · 1 sin transformación · 2 falló
  useEffect(() => setStage(0), [src]);

  const base = assetUrl(src);
  const retry = withoutCloudinaryTransform(base);

  if (!base || stage === 2) return fallback;

  return (
    <img
      {...rest}
      src={stage === 0 ? base : retry}
      alt={alt}
      className={className}
      onError={() => {
        if (stage === 0 && retry !== base) return setStage(1);
        console.warn("[SafeImage] No se pudo cargar la imagen:", stage === 0 ? base : retry);
        setStage(2);
      }}
    />
  );
}
