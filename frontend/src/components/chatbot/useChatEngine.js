import { useCallback, useRef, useState } from "react";
import { getQuoteAPI } from "../../api/pricing.api";
import { getArtistsAPI } from "../../api/artists.api";
import { useAuth } from "../../context/AuthContext";
import { getPortfolioAPI } from "../../api/portfolio.api";
import { getStylesAPI } from "../../api/styles.api";
import { logUnansweredQueryAPI } from "../../api/chatbotQuery.api";
import {
  createConversationAPI,
  sendConversationMessageAPI,
} from "../../api/conversation.api";
 
import {
  QUICK_ZONES,
  getSizeOptionsForZone,
  SIZE_TO_DB_ENUM,
  STYLE_OPTIONS,
  FALLBACK_PRICES,
  getZoneTip,
  zoneBase,
  matchArtistsByStyle,
  normalizeStyle,
  CAMBIAR_ZONA,
  STEPS,
  findFaqAnswer,
  findSmallTalkAnswer,
  findArtistQuery,
  findStyleQuery,
  findDesignQuery,
  findMentionedStyle,
  isQuoteIntent,
} from "./chatbotEngine";
 
let uid = 0;
const nextId = () => `m${Date.now()}-${++uid}`;
const API_TIMEOUT = 10000;
 
const SIN_ASIGNAR = "Continuar sin elegir (según disponibilidad)";
const VER_PORTAFOLIO = "Ver portafolio";
const CONTINUAR_COTIZACION = "Continuar con la cotización";
const CONSULTAR_ARTISTAS = "Consultar artistas";
 
// ── Funciones auxiliares ──────────────────────────────────────────────
 
const getArtistsWithTimeout = async () => {
  let timeoutId;
 
  try {
    const request = getArtistsAPI();
 
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error("La API de artistas tardó demasiado en responder.")
        );
      }, API_TIMEOUT);
    });
 
    const response = await Promise.race([request, timeout]);
    const data = response?.data;
 
    const artists = Array.isArray(data)
      ? data
      : data?.info || data?.artists || [];
 
    if (!Array.isArray(artists)) {
      throw new Error("La API no devolvió una lista válida de artistas.");
    }
 
    return artists;
  } finally {
    clearTimeout(timeoutId);
  }
};
 
const getAvailableStyles = (artists) => [
  ...new Set(
    artists
      .flatMap((artist) =>
        Array.isArray(artist.especialidades)
          ? artist.especialidades
          : []
      )
      .filter(
        (style) =>
          typeof style === "string" && style.trim().length > 0
      )
      .map((style) => style.trim())
  ),
];
 
const getPortfolioWithTimeout = async (params) => {
  let timeoutId;
 
  try {
    const request = getPortfolioAPI(params);
 
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error("La API del portafolio tardó demasiado en responder.")
        );
      }, API_TIMEOUT);
    });
 
    const response = await Promise.race([request, timeout]);
 
    return response?.data;
  } finally {
    clearTimeout(timeoutId);
  }
};
 
const getPortfolioItems = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.info)) return data.info;
  if (Array.isArray(data?.portfolio)) return data.portfolio;
  if (Array.isArray(data?.items)) return data.items;
 
  return [];
};
 
// ── Estilos desde la base de datos ────────────────────────────────────
// Fuente principal: colección Style (/styles), la misma que administra el admin
// y que se asigna a cada trabajo del portafolio.
// Respaldo: especialidades de los artistas → lista fija del código.
 
const STYLES_CACHE_MS = 60 * 1000;
let stylesCache = { at: 0, names: [] };
 
const getDbStyleNames = async () => {
  if (stylesCache.names.length > 0 && Date.now() - stylesCache.at < STYLES_CACHE_MS) {
    return stylesCache.names;
  }
 
  let timeoutId;
 
  try {
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("La API de estilos tardó demasiado en responder.")),
        API_TIMEOUT
      );
    });
 
    const response = await Promise.race([getStylesAPI(), timeout]);
    const data = response?.data;
    const list = Array.isArray(data) ? data : data?.info || [];
 
    const names = [
      ...new Set(
        list
          .map((style) => (typeof style === "string" ? style : style?.nombre))
          .filter((name) => typeof name === "string" && name.trim().length > 0)
          .map((name) => name.trim())
      ),
    ];
 
    stylesCache = { at: Date.now(), names };
    return names;
  } finally {
    clearTimeout(timeoutId);
  }
};
 
/** Lista de estilos para mostrar en el chat. Nunca devuelve una lista vacía. */
const resolveStyleOptions = async () => {
  try {
    const names = await getDbStyleNames();
    if (names.length > 0) return names;
  } catch (error) {
    console.warn("No se pudieron cargar los estilos de la base de datos:", error);
  }
 
  try {
    const fromArtists = getAvailableStyles(await getArtistsWithTimeout());
    if (fromArtists.length > 0) return fromArtists;
  } catch (error) {
    console.warn("No se pudieron cargar las especialidades de los artistas:", error);
  }
 
  return STYLE_OPTIONS;
};
 
const artistKey = (artist) => String(artist?._id ?? artist?.id ?? "");
 
/**
 * Artistas que trabajan un estilo: los que lo declaran como especialidad
 * MÁS los que tienen trabajos del portafolio etiquetados con ese estilo.
 */
const findArtistsForStyle = async (artists, estilo) => {
  const result = new Map();
 
  matchArtistsByStyle(artists, estilo).forEach((artist) => {
    result.set(artistKey(artist), artist);
  });
 
  try {
    const items = getPortfolioItems(await getPortfolioWithTimeout());
 
    const artistIds = new Set(
      items
        .filter((item) => matchesStyle(item, estilo))
        .map((item) => String(item?.artist?._id ?? item?.artist ?? ""))
        .filter(Boolean)
    );
 
    artists.forEach((artist) => {
      if (artistIds.has(artistKey(artist))) result.set(artistKey(artist), artist);
    });
  } catch (error) {
    console.warn("No se pudo cruzar el portafolio con el estilo:", error);
  }
 
  return [...result.values()];
};
 
const matchesStyle = (item, estilo) => {
  const target = normalizeStyle(estilo);
 
  const styles = Array.isArray(item?.styles)
    ? item.styles
    : [];
 
  return styles.some((style) => {
    const styleName =
      typeof style === "string" ? style : style?.nombre;
 
    return normalizeStyle(styleName) === target;
  });
};
 
const getGalleryImages = (items) =>
  items
    .filter((item) => {
      const images = Array.isArray(item?.imagenes_urls)
        ? item.imagenes_urls
        : [];
 
      return images.some(
        (url) => typeof url === "string" && url.trim().length > 0
      );
    })
    .map((item) => {
      const images = Array.isArray(item?.imagenes_urls)
        ? item.imagenes_urls
        : [];
 
      return {
        imagen_url: images.find(
          (url) => typeof url === "string" && url.trim().length > 0
        ),
        titulo: item?.titulo || "Diseño de portafolio",
      };
    })
    .slice(0, 4);
 
// Índice de cada paso lógico dentro de STEPS.
const STEP_INDEX = STEPS.reduce(
  (acc, step, index) => ({ ...acc, [step]: index }),
  {}
);
 
STEP_INDEX.freeform = STEP_INDEX.cotizacion;
STEP_INDEX.portafolio = STEP_INDEX.artista;
STEP_INDEX.referencias_estilo = STEP_INDEX.estilo;
 
// ── Motor principal del chatbot ───────────────────────────────────────
 
export function useChatEngine({
  onExit,
  onNavigate,
  onOpenLiveChat,
} = {}) {
  const { user } = useAuth();
 
  const [messages, setMessages] = useState([]);
  const [inputEnabled, setInputEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
 
  const stepRef = useRef("idle");
  const startedRef = useRef(false);
 
  // Indica si el usuario llegó a los estilos desde una consulta libre
  // o desde el proceso guiado de cotización.
  const styleBrowseModeRef = useRef(false);
 
  const selectionRef = useRef({
    zona: null,
    tamanio: null,
    tamanioLabel: null,
    estilo: null,
    artista: null,
  });
 
  const artistCandidatesRef = useRef([]);
  const pendingLiveMessageRef = useRef("");
 
  const setStep = useCallback((step) => {
    stepRef.current = step;
    setProgressIndex(STEP_INDEX[step] ?? 0);
  }, []);
 
  const pushBot = useCallback((text, extra = {}) => {
    setMessages((previous) => [
      ...previous,
      {
        id: nextId(),
        from: "bot",
        text,
        ...extra,
      },
    ]);
  }, []);
 
  const pushUser = useCallback((text) => {
    setMessages((previous) => [
      ...previous,
      {
        id: nextId(),
        from: "user",
        text,
      },
    ]);
  }, []);
 
  const attachOptions = useCallback((choices) => {
    setMessages((previous) => {
      if (previous.length === 0) return previous;
 
      const copy = [...previous];
      const lastIndex = copy.length - 1;
 
      copy[lastIndex] = {
        ...copy[lastIndex],
        options: choices,
        answered: null,
      };
 
      return copy;
    });
  }, []);
 
  const markAnswered = useCallback((messageId, choice) => {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === messageId
          ? { ...message, answered: choice }
          : message
      )
    );
  }, []);
 
  const delay = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));
 
  // ── Cotización ──────────────────────────────────────────────────────
 
  const runQuote = useCallback(async () => {
    setStep("cotizacion");
    setBusy(true);
    setInputEnabled(false);
 
    const { zona, tamanio, estilo, artista } = selectionRef.current;
    const zonaParaTarifa = zoneBase(zona);
    let precio = null;
    let fuente = "estimado";
 
    try {
      const { data } = await getQuoteAPI(zonaParaTarifa, tamanio, artista?.id);
 
      if (data?.success && data?.info) {
        precio = {
          min: data.info.precio_min_clp,
          max: data.info.precio_max_clp,
        };
 
        fuente = data.info.fuente || "estudio";
      }
    } catch (_error) {
      // Si no existe una tarifa o falla la API, se usa el precio estimado.
    }
 
    if (!precio) {
      precio = FALLBACK_PRICES[tamanio] || {
        min: 80000,
        max: 200000,
      };
    }
 
    const artistaLabel =
      artista?.nombre || "Por asignar según disponibilidad";
 
    setMessages((previous) => [
      ...previous,
      {
        id: nextId(),
        from: "bot",
        quote: {
          zona,
          tamanioLabel: selectionRef.current.tamanioLabel,
          estilo,
          artista: artistaLabel,
          min: precio.min,
          max: precio.max,
          esEstimado: fuente === "estimado",
        },
      },
    ]);
 
    try {
      localStorage.setItem(
        "inkhaus_pending_quote",
        JSON.stringify({
          ...selectionRef.current,
          precio,
          fecha: Date.now(),
        })
      );
    } catch (_error) {
      // El almacenamiento local puede no estar disponible.
    }
 
    setBusy(false);
    await delay(500);
 
    pushBot(
      artista
        ? `¿Quieres agendar con ${artistaLabel}? La reserva confirma tu hora.`
        : "¿Quieres avanzar con la reserva? Un artista disponible confirmará tu hora."
    );
 
    attachOptions([
      "Agendar y pagar reserva",
      "Más información",
      "Volver a empezar",
    ]);
 
    setInputEnabled(true);
  }, [attachOptions, pushBot, setStep]);
 
  // ── Portafolio de un artista concreto ───────────────────────────────
 
  const offerPortfolio = useCallback(
    (artistName) => {
      setStep("portafolio");
 
      pushBot(
        `Elegiste a ${artistName}. ¿Quieres ver su portafolio antes de continuar?`
      );
 
      attachOptions([
        VER_PORTAFOLIO,
        CONTINUAR_COTIZACION,
      ]);
    },
    [attachOptions, pushBot, setStep]
  );
 
  const showArtistReferences = useCallback(
    async (artistId, estilo) => {
      setBusy(true);
      setInputEnabled(false);
 
      try {
        if (!artistId) {
          throw new Error("No se encontró el identificador del artista.");
        }
 
        const data = await getPortfolioWithTimeout({
          artist: artistId,
        });
 
        const items = getPortfolioItems(data);
 
        const matches = items
          .filter((item) => matchesStyle(item, estilo));
 
        const gallery = getGalleryImages(matches);
 
        if (gallery.length > 0) {
          pushBot(
            `Estos son algunos trabajos de ${selectionRef.current.artista?.nombre} en ${estilo}:`
          );
 
          setMessages((previous) => [
            ...previous,
            {
              id: nextId(),
              from: "bot",
              gallery,
            },
          ]);
        } else {
          pushBot(
            `${selectionRef.current.artista?.nombre} todavía no tiene trabajos con imágenes cargadas en ese estilo.`
          );
        }
      } catch (error) {
        console.error("Error al cargar el portafolio del artista:", error);
 
        pushBot(
          "No pudimos cargar el portafolio en este momento. Puedes continuar con la cotización."
        );
      } finally {
        setBusy(false);
        setInputEnabled(true);
        attachOptions([CONTINUAR_COTIZACION]);
      }
    },
    [attachOptions, pushBot]
  );
 
  // ── Galería general de un estilo ────────────────────────────────────
  // Se llama al seleccionar Blackwork, Anime, Realismo, etc.
  // Busca diseños del estilo elegido y muestra hasta cuatro miniaturas.
 
  const showStyleReferences = useCallback(
    async (estilo) => {
      setStep("referencias_estilo");
      setBusy(true);
      setInputEnabled(false);
 
      try {
        const data = await getPortfolioWithTimeout();
        const items = getPortfolioItems(data);
 
        const matchingItems = items.filter((item) =>
          matchesStyle(item, estilo)
        );
 
        const gallery = getGalleryImages(matchingItems);
 
        if (gallery.length > 0) {
          pushBot(
            `Mira estos diseños de referencia en estilo ${estilo}:`
          );
 
          setMessages((previous) => [
            ...previous,
            {
              id: nextId(),
              from: "bot",
              gallery,
            },
          ]);
        } else {
          pushBot(
            `No encontré imágenes de referencia cargadas para ${estilo} en este momento. Puedes consultar los artistas o continuar con la cotización.`
          );
        }
      } catch (error) {
        console.error(
          `Error al cargar diseños del estilo ${estilo}:`,
          error
        );
 
        pushBot(
          "No pude cargar las imágenes del portafolio en este momento. Puedes continuar con la cotización."
        );
      } finally {
        setBusy(false);
        setInputEnabled(true);
 
        attachOptions([
          CONSULTAR_ARTISTAS,
          CONTINUAR_COTIZACION,
        ]);
      }
    },
    [attachOptions, pushBot, setStep]
  );
 
  // ── Consultar artistas de un estilo ─────────────────────────────────
 
  const showArtistsForStyle = useCallback(
    async (estilo) => {
      setBusy(true);
      setInputEnabled(false);
 
      try {
        const artists = await getArtistsWithTimeout();
        const matches = await findArtistsForStyle(artists, estilo);
 
        if (matches.length > 0) {
          const names = matches
            .map((artist) => artist.nombre_artistico)
            .filter(Boolean);
 
          pushBot(
            `Estos son los artistas de InkHaus que trabajan con ${estilo}:\n${names
              .map((name) => `• ${name}`)
              .join("\n")}`
          );
        } else {
          pushBot(
            `No encontré artistas registrados que trabajen con ${estilo}.`
          );
        }
      } catch (error) {
        console.error("Error al consultar artistas:", error);
 
        pushBot(
          "No pude consultar los artistas en este momento. Intenta nuevamente más tarde."
        );
      } finally {
        setStep("freeform");
        setBusy(false);
        setInputEnabled(true);
 
        attachOptions([
          CONTINUAR_COTIZACION,
          "Volver a empezar",
        ]);
      }
    },
    [attachOptions, pushBot, setStep]
  );
 
  // ── Paso 4: selección de artista en la cotización guiada ────────────
 
  const stepArtista = useCallback(async () => {
    setStep("artista");
    setBusy(true);
    setInputEnabled(false);
 
    pushBot(
      `Buscando artistas especializados en ${selectionRef.current.estilo}…`
    );
 
    await delay(400);
 
    let candidatos = [];
 
    try {
      const artists = await getArtistsWithTimeout();
 
      candidatos = await findArtistsForStyle(
        artists,
        selectionRef.current.estilo
      );
    } catch (error) {
      console.error("Error al buscar artistas:", error);
    }
 
    artistCandidatesRef.current = candidatos;
 
    setBusy(false);
    setInputEnabled(true);
 
    if (candidatos.length > 0) {
      pushBot("Elige con quién te gustaría trabajar:");
 
      attachOptions([
        ...candidatos.map((artist) => artist.nombre_artistico),
        SIN_ASIGNAR,
      ]);
    } else {
      pushBot(
        "Por ahora no hay artistas cargados para ese estilo en el sistema. Podrás consultar la disponibilidad al confirmar tu cita."
      );
 
      selectionRef.current.artista = null;
      setTimeout(runQuote, 400);
    }
  }, [attachOptions, pushBot, runQuote, setStep]);
 
  // ── Paso 3: selección de estilo durante la cotización ───────────────
 
  const stepEstilo = useCallback(async () => {
    setStep("estilo");
    styleBrowseModeRef.current = false;
 
    setBusy(true);
    setInputEnabled(false);
 
    try {
      const availableStyles = await resolveStyleOptions();
 
      pushBot(
        `Tamaño: ${selectionRef.current.tamanioLabel} ✓ ¿Qué estilo te interesa?`
      );
 
      attachOptions(availableStyles);
    } catch (error) {
      console.error("Error al cargar estilos:", error);
 
      pushBot(
        `Tamaño: ${selectionRef.current.tamanioLabel} ✓ ¿Qué estilo te interesa?`
      );
 
      attachOptions(STYLE_OPTIONS);
    } finally {
      setBusy(false);
      setInputEnabled(true);
    }
  }, [attachOptions, pushBot, setStep]);
 
  // ── Paso 2: tamaño ──────────────────────────────────────────────────
 
  const stepTamanio = useCallback(() => {
    setStep("tamanio");
 
    const tip = getZoneTip(selectionRef.current.zona);
 
    pushBot(
      `Zona: ${selectionRef.current.zona} ✓${tip ? "  " + tip : ""}`
    );
 
    setTimeout(() => {
      pushBot("¿Qué tamaño buscas?");
 
      attachOptions([
        ...getSizeOptionsForZone(selectionRef.current.zona).map(
          (size) => size.label
        ),
        CAMBIAR_ZONA,
      ]);
 
      setInputEnabled(true);
    }, 400);
  }, [attachOptions, pushBot, setStep]);
 
  // ── Paso 1: zona ────────────────────────────────────────────────────
 
  const stepZona = useCallback(() => {
    setStep("zona");
    setInputEnabled(true);
 
    pushBot("Toca la zona en el modelo 3D o elige aquí:");
 
    attachOptions(QUICK_ZONES);
  }, [attachOptions, pushBot, setStep]);
 
  // ── Bienvenida ──────────────────────────────────────────────────────
 
  const stepWelcome = useCallback(() => {
    setStep("welcome");
    setInputEnabled(true);
 
    pushBot(
      "¡Hola! Gira el modelo 3D y haz clic en la zona donde quieres el tatuaje. También puedes elegir una zona de la lista."
    );
 
    setTimeout(() => {
      pushBot("¿Empezamos?");
      attachOptions(["Sí, vamos", "Tengo una consulta"]);
    }, 450);
  }, [attachOptions, pushBot, setStep]);
 
  const start = useCallback(() => {
    if (startedRef.current) return;
 
    startedRef.current = true;
    stepWelcome();
  }, [stepWelcome]);
 
  const restart = useCallback(() => {
    selectionRef.current = {
      zona: null,
      tamanio: null,
      tamanioLabel: null,
      estilo: null,
      artista: null,
    };
 
    artistCandidatesRef.current = [];
    styleBrowseModeRef.current = false;
 
    setMessages([]);
    setInputEnabled(false);
    setBusy(false);
 
    stepWelcome();
  }, [stepWelcome]);
 
  const exitChat = useCallback(() => {
    selectionRef.current = {
      zona: null,
      tamanio: null,
      tamanioLabel: null,
      estilo: null,
      artista: null,
    };
 
    artistCandidatesRef.current = [];
    styleBrowseModeRef.current = false;
 
    setMessages([]);
    setInputEnabled(false);
    setBusy(false);
 
    stepRef.current = "idle";
    setProgressIndex(0);
    startedRef.current = false;
 
    onExit?.();
  }, [onExit]);
 
  const selectZona = useCallback(
    (zona) => {
      if (stepRef.current !== "zona") return;
 
      selectionRef.current.zona = zona;
      pushUser(zona);
 
      setTimeout(stepTamanio, 300);
    },
    [pushUser, stepTamanio]
  );
 
  const selectZonaFrom3D = useCallback(
    (zona) => selectZona(zona),
    [selectZona]
  );
 
  // ── Manejo de botones ──────────────────────────────────────────────
 
  const handleOption = useCallback(
    (msgId, choice) => {
      markAnswered(msgId, choice);
      pushUser(choice);
 
      const step = stepRef.current;
 
      if (step === "welcome") {
        if (choice.startsWith("Sí")) {
          setTimeout(stepZona, 300);
        } else {
          setStep("freeform");
 
          setTimeout(() => {
            pushBot("Escribe tu consulta:");
            setInputEnabled(true);
          }, 300);
        }
 
        return;
      }
 
      if (step === "zona") {
        selectionRef.current.zona = choice;
        setTimeout(stepTamanio, 300);
        return;
      }
 
      if (step === "tamanio") {
        if (choice === CAMBIAR_ZONA) {
          setTimeout(stepZona, 300);
          return;
        }
 
        const option = getSizeOptionsForZone(
          selectionRef.current.zona
        ).find((size) => size.label === choice);
 
        selectionRef.current.tamanioLabel = choice;
        selectionRef.current.tamanio =
          SIZE_TO_DB_ENUM[option?.value] || option?.value;
 
        setTimeout(stepEstilo, 300);
        return;
      }
 
      if (step === "estilo") {
        // Estas opciones también aparecen cuando se consultan estilos
        // escribiendo en el chat, fuera de la cotización guiada.
        if (choice === CONSULTAR_ARTISTAS) {
          if (styleBrowseModeRef.current) {
            setTimeout(
              () => showArtistsForStyle(selectionRef.current.estilo),
              300
            );
          } else {
            setTimeout(stepArtista, 300);
          }
 
          return;
        }
 
        if (choice === CONTINUAR_COTIZACION) {
          styleBrowseModeRef.current = true;
          setStep("freeform");
          setTimeout(stepZona, 300);
          return;
        }
 
        selectionRef.current.estilo = choice;
 
        setTimeout(() => showStyleReferences(choice), 300);
        return;
      }
 
      if (step === "referencias_estilo") {
        if (choice === CONSULTAR_ARTISTAS) {
          if (styleBrowseModeRef.current) {
            setTimeout(
              () => showArtistsForStyle(selectionRef.current.estilo),
              300
            );
          } else {
            setTimeout(stepArtista, 300);
          }
 
          return;
        }
 
        if (choice === CONTINUAR_COTIZACION) {
          if (styleBrowseModeRef.current) {
            setStep("freeform");
            setTimeout(stepZona, 300);
          } else {
            setTimeout(stepArtista, 300);
          }
 
          return;
        }
 
        return;
      }
 
      if (step === "artista") {
        let chosenArtist = null;
 
        if (choice === SIN_ASIGNAR) {
          selectionRef.current.artista = null;
        } else {
          const found = artistCandidatesRef.current.find(
            (artist) => artist.nombre_artistico === choice
          );
 
          chosenArtist = found || null;
 
          selectionRef.current.artista = found
            ? {
                id: found._id,
                nombre: found.nombre_artistico,
              }
            : {
                id: null,
                nombre: choice,
              };
        }
 
        if (chosenArtist?._id) {
          setTimeout(
            () => offerPortfolio(chosenArtist.nombre_artistico),
            300
          );
        } else {
          setTimeout(runQuote, 300);
        }
 
        return;
      }
 
      if (step === "portafolio") {
        if (choice === VER_PORTAFOLIO) {
          setTimeout(
            () =>
              showArtistReferences(
                selectionRef.current.artista?.id,
                selectionRef.current.estilo
              ),
            300
          );
        } else {
          setTimeout(runQuote, 300);
        }
 
        return;
      }
 
      if (step === "cotizacion") {
        if (choice.startsWith("Agendar")) {
          setTimeout(() => {
            if (!user) {
              pushBot(
                "Necesitas iniciar sesión para agendar y pagar la reserva. Tu cotización quedó guardada."
              );
 
              attachOptions(["Ir a iniciar sesión"]);
            } else {
              const artistId = selectionRef.current.artista?.id;
 
              pushBot(
                artistId
                  ? "Perfecto, te llevaremos a elegir día y hora con tu artista."
                  : "Perfecto, elige un artista para ver su disponibilidad."
              );
 
              attachOptions(["Ir a agendar cita"]);
            }
          }, 300);
        } else if (choice.startsWith("Más información")) {
          setStep("freeform");
 
          setTimeout(() => {
            pushBot("Escribe tu consulta:");
            setInputEnabled(true);
          }, 300);
        } else if (choice.startsWith("Ir a iniciar sesión")) {
          setTimeout(() => onNavigate?.("/login"), 200);
        } else if (choice.startsWith("Ir a agendar cita")) {
          const artistId = selectionRef.current.artista?.id;
 
          setTimeout(
            () =>
              onNavigate?.(
                artistId
                  ? `/artists/${artistId}/agendar`
                  : "/artists"
              ),
            200
          );
        } else if (choice.startsWith("Volver a empezar")) {
          setTimeout(restart, 300);
        }
 
        return;
      }
 
      if (step === "freeform") {
        if (choice.startsWith("Continuar")) {
          setTimeout(stepZona, 300);
        } else if (choice.startsWith("Salir")) {
          setTimeout(exitChat, 300);
        } else if (choice.startsWith("Iniciar sesión")) {
          setTimeout(() => onNavigate?.("/login"), 200);
        } else if (choice.startsWith("Abrir chat")) {
          setInputEnabled(false);
          setBusy(true);
 
          setTimeout(async () => {
            try {
              const pendingMessage = pendingLiveMessageRef.current;
 
              if (pendingMessage) {
                const { data } = await createConversationAPI({
                  origen: "chatbot_fallback",
                });
 
                await sendConversationMessageAPI(
                  data.info._id,
                  pendingMessage
                );
 
                pendingLiveMessageRef.current = "";
              }
 
              onOpenLiveChat?.();
            } catch (error) {
              console.error("Error al abrir el chat en vivo:", error);
 
              pushBot(
                "No pude conectar con el equipo en este momento. Puedes seguir escribiendo aquí o intentarlo nuevamente."
              );
 
              setInputEnabled(true);
            } finally {
              setBusy(false);
            }
          }, 200);
        }
 
        return;
      }
    },
    [
      attachOptions,
      exitChat,
      markAnswered,
      offerPortfolio,
      onNavigate,
      onOpenLiveChat,
      pushBot,
      pushUser,
      restart,
      runQuote,
      setStep,
      showArtistReferences,
      showArtistsForStyle,
      showStyleReferences,
      stepArtista,
      stepEstilo,
      stepTamanio,
      stepZona,
      user,
    ]
  );
 
  // ── Consultas escritas en el chat ───────────────────────────────────
 
  const sendText = useCallback(
    async (text) => {
      const value = text.trim();
      if (!value || busy) return;
 
      pushUser(value);
      setInputEnabled(false);
 
      // 1. Intención de cotización.
      if (isQuoteIntent(value)) {
        styleBrowseModeRef.current = false;
 
        setTimeout(() => {
          setStep("freeform");
 
          pushBot(
            "¡Claro! Vamos a armar tu cotización. Elige la zona corporal para empezar."
          );
 
          setTimeout(stepZona, 350);
        }, 400);
 
        return;
      }
 
      // 2. Saludos, agradecimientos y despedidas.
      const smallTalkAnswer = findSmallTalkAnswer(value);
 
      if (smallTalkAnswer) {
        setTimeout(() => {
          pushBot(smallTalkAnswer);
          setInputEnabled(true);
        }, 400);
 
        return;
      }
 
      // 3. Preguntas frecuentes.
      const faqAnswer = findFaqAnswer(value);
 
      if (faqAnswer) {
        setTimeout(() => {
          pushBot(faqAnswer);
          setInputEnabled(true);
        }, 400);
 
        return;
      }
 
      // 4. Detectar consultas sobre artistas, estilos y diseños.
      //    Los estilos reconocidos son los de la base de datos.
      const knownStyles = await resolveStyleOptions();
 
      const artistQuery = findArtistQuery(value);
      const styleQuery = findStyleQuery(value, knownStyles);
      const designQuery = findDesignQuery(value);
      const mentionedStyle = findMentionedStyle(value, knownStyles);
 
      // 5. Consultar artistas.
      if (artistQuery) {
        setBusy(true);
 
        try {
          const artists = await getArtistsWithTimeout();
 
          const filteredArtists = mentionedStyle
            ? await findArtistsForStyle(artists, mentionedStyle)
            : artists;
 
          const names = filteredArtists
            .map((artist) => artist.nombre_artistico)
            .filter(Boolean);
 
          if (names.length > 0) {
            pushBot(
              mentionedStyle
                ? `Estos son los artistas de InkHaus que trabajan con ${mentionedStyle}:\n${names
                    .map((name) => `• ${name}`)
                    .join("\n")}`
                : `Estos son los artistas disponibles en InkHaus:\n${names
                    .map((name) => `• ${name}`)
                    .join("\n")}`
            );
          } else {
            pushBot(
              mentionedStyle
                ? `No encontré artistas registrados que trabajen con ${mentionedStyle}. Puedes consultar por otro estilo.`
                : "Por ahora no encontré artistas registrados en el sistema."
            );
          }
        } catch (error) {
          console.error("Error al consultar artistas:", error);
 
          pushBot(
            "No pude cargar la lista de artistas en este momento. Intenta nuevamente más tarde."
          );
        } finally {
          setBusy(false);
          setInputEnabled(true);
        }
 
        return;
      }
 
      // 6. Consultar estilos disponibles.
      if (styleQuery) {
        setBusy(true);
        styleBrowseModeRef.current = true;
        setStep("estilo");
 
        try {
          const availableStyles = await resolveStyleOptions();
 
          pushBot(
            `Los estilos disponibles actualmente en InkHaus son: ${availableStyles.join(", ")}.`
          );
 
          attachOptions([
            ...availableStyles,
            CONSULTAR_ARTISTAS,
            CONTINUAR_COTIZACION,
          ]);
        } catch (error) {
          console.error("Error al consultar estilos:", error);
 
          pushBot(
            "No pude consultar los estilos en este momento. Intenta nuevamente más tarde."
          );
 
          attachOptions([
            ...STYLE_OPTIONS,
            CONSULTAR_ARTISTAS,
            CONTINUAR_COTIZACION,
          ]);
        } finally {
          setBusy(false);
          setInputEnabled(true);
        }
 
        return;
      }
 
      // 7. Consultar diseños y referencias.
      if (designQuery) {
        setStep("freeform");
        styleBrowseModeRef.current = true;
 
        setTimeout(() => {
          pushBot(
            "¡Puedes explorar los diseños y trabajos de nuestros artistas en sus portafolios! Si buscas referencias de un estilo específico, dime cuál te interesa."
          );
 
          attachOptions([
            "Ver estilos disponibles",
            CONSULTAR_ARTISTAS,
            CONTINUAR_COTIZACION,
          ]);
 
          setInputEnabled(true);
        }, 300);
 
        return;
      }
 
      // 8. Consulta no reconocida: aquí sí se registra en Reportes para
      //    que el equipo pueda agregar una respuesta en el futuro.
      logUnansweredQueryAPI({
        mensaje: value,
        nombre: user?.name || "",
        email: user?.email || "",
        pagina:
          typeof window !== "undefined"
            ? window.location.pathname
            : "",
      }).catch(() => {});
 
      setTimeout(() => {
        setStep("freeform");
 
        if (!user) {
          pushBot(
            "Todavía no tengo una respuesta exacta para eso. Puedes reformular tu pregunta, iniciar sesión para contactar al equipo o comenzar una cotización."
          );
 
          attachOptions([
            "Iniciar sesión",
            CONTINUAR_COTIZACION,
            "Salir",
          ]);
        } else {
          pendingLiveMessageRef.current = value;
 
          pushBot(
            "No tengo una respuesta exacta para eso todavía. Puedes reformular tu pregunta o contactar a nuestro equipo para recibir ayuda."
          );
 
          attachOptions([
            "Abrir chat con el equipo",
            CONTINUAR_COTIZACION,
            "Salir",
          ]);
        }
 
        setInputEnabled(true);
      }, 300);
    },
    [
      attachOptions,
      busy,
      pushBot,
      pushUser,
      setStep,
      stepZona,
      user,
    ]
  );
 
  return {
    messages,
    inputEnabled,
    busy,
    progressIndex,
    start,
    restart,
    exitChat,
    selectZonaFrom3D,
    handleOption,
    sendText,
    currentZona: selectionRef.current.zona,
  };
}