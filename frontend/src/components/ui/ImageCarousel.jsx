import { useEffect, useRef, useState } from "react";

export default function ImageCarousel({ images = [], alt = "", className = "", intervalMs = 5000 }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    setIndex(0); // si cambian las imágenes (nuevo item), reinicia al principio
  }, [images]);

  // Se reprograma cada vez que cambia el índice, ya sea por el propio
  // temporizador, por un click en los puntos, o por un swipe -> el
  // cooldown de 5s siempre arranca de nuevo desde la última imagen mostrada.
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearTimeout(t);
  }, [index, images.length, intervalMs]);

  if (!images.length) return null;

  const goTo = (i) => {
    setIndex(((i % images.length) + images.length) % images.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || images.length <= 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 40; // px mínimos para considerarlo un swipe intencional
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX < 0) goTo(index + 1); // swipe hacia la izquierda -> siguiente
      else goTo(index - 1); // swipe hacia la derecha -> anterior
    }
    touchStartX.current = null;
  };

  return (
    <div
      className={`relative w-full h-full ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {images.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute left-0 right-0 z-10 flex justify-center gap-2.5 bottom-2">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goTo(i);
              }}
              aria-label={`Ver imagen ${i + 1}`}
              className="flex items-center justify-center p-1.5 -m-1.5"
            >
              <span
                className={`block w-2 h-2 rounded-full transition-colors ${
                  i === index ? "bg-white" : "bg-white/30"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}