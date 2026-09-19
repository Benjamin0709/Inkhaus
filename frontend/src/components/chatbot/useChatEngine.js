import { useCallback, useRef, useState } from "react";
import { getQuoteAPI } from "../../api/pricing.api";
import { getArtistsAPI } from "../../api/artists.api";
import { useAuth } from "../../context/AuthContext";
import { getPortfolioAPI } from "../../api/portfolio.api";
import {
  QUICK_ZONES,
  getSizeOptionsForZone,
  SIZE_TO_DB_ENUM,
  STYLE_OPTIONS,
  FALLBACK_PRICES,
  getZoneTip,
  zoneBase,
  matchArtistsByStyle,
  CAMBIAR_ZONA,
  STEPS,
  findFaqAnswer,
  isQuoteIntent,
} from "./chatbotEngine";

let uid = 0;
const nextId = () => `m${++uid}`;

// Índice de cada paso lógico dentro de STEPS, para la barra de progreso
const STEP_INDEX = STEPS.reduce((acc, s, i) => ({ ...acc, [s]: i }), {});
STEP_INDEX.freeform = STEP_INDEX.cotizacion;
STEP_INDEX.portafolio = STEP_INDEX.artista;

const SIN_ASIGNAR = "Continuar sin elegir (según disponibilidad)";

/**
 * Máquina de estados del chatbot de cotización guiado por planimetría.
 * Desacoplada del visor 3D: éste solo llama a `selectZonaFrom3D`.
 *
 * @param {Object} [options]
 * @param {() => void} [options.onExit] - se llama cuando el usuario elige
 *   "Salir": el widget lo usa para cerrar el panel flotante.
 */
export function useChatEngine({ onExit } = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputEnabled, setInputEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const stepRef = useRef("idle");
  const selectionRef = useRef({
    zona: null,
    tamanio: null,
    tamanioLabel: null,
    estilo: null,
    artista: null, // { id, nombre } | null (null = "por asignar")
  });
  const artistCandidatesRef = useRef([]);
  const [progressIndex, setProgressIndex] = useState(0);
  const startedRef = useRef(false);

  const setStep = (s) => {
    stepRef.current = s;
    setProgressIndex(STEP_INDEX[s] ?? 0);
  };

  const pushBot = useCallback((text, extra = {}) => {
    setMessages((prev) => [...prev, { id: nextId(), from: "bot", text, ...extra }]);
  }, []);

  const pushUser = useCallback((text) => {
    setMessages((prev) => [...prev, { id: nextId(), from: "user", text }]);
  }, []);

  const attachOptions = useCallback((choices) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], options: choices, answered: null };
      return copy;
    });
  }, []);

  const markAnswered = useCallback((msgId, choice) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, answered: choice } : m)));
  }, []);

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── Paso 5: cotización real (con fallback local de precio) ──────────
  const runQuote = useCallback(async () => {
    setStep("cotizacion");
    setBusy(true);
    pushBot("Calculando cotización…");
    await delay(500);

    const { zona, tamanio, estilo, artista } = selectionRef.current;
    const zonaParaTarifa = zoneBase(zona);
    let precio = null;
    let fuente = "estimado";

    try {
      const { data } = await getQuoteAPI(zonaParaTarifa, tamanio, estilo);
      if (data?.success && data?.info) {
        precio = { min: data.info.precio_min_clp, max: data.info.precio_max_clp };
        fuente = "db";
      }
    } catch (_e) {
      // Sin tarifa registrada aún para esta combinación -> se usa fallback
    }
    if (!precio) {
      precio = FALLBACK_PRICES[tamanio] || { min: 80000, max: 200000 };
    }

    const artistaLabel = artista?.nombre || "Por asignar según disponibilidad";

    setMessages((prev) => [
      ...prev,
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
        JSON.stringify({ ...selectionRef.current, precio, fecha: Date.now() })
      );
    } catch (_e) {}

    setBusy(false);
    await delay(500);
    pushBot(
      artista
        ? `¿Quieres agendar con ${artistaLabel}? La reserva confirma tu hora.`
        : "¿Quieres avanzar con la reserva? Un artista disponible confirmará tu hora."
    );
    attachOptions(["Agendar y pagar reserva", "Más información", "Volver a empezar"]);
  }, [attachOptions, pushBot]);

  const normalizeForMatch = (s) => (s || "").trim().toLowerCase();

  const VER_PORTAFOLIO = "Ver portafolio";
  const CONTINUAR_COTIZACION = "Continuar con la cotización";

  // ── Tras elegir un artista concreto, ofrece un botón para ver SU
  // portafolio (trabajos que coincidan con el estilo elegido) antes de
  // seguir a la cotización final. El usuario decide si quiere verlo. ──
  const offerPortfolio = useCallback(
    (artistName) => {
      setStep("portafolio");
      pushBot(`Elegiste a ${artistName}. ¿Quieres ver su portafolio antes de continuar?`);
      attachOptions([VER_PORTAFOLIO, CONTINUAR_COTIZACION]);
    },
    [attachOptions, pushBot]
  );

  // ── Al presionar "Ver portafolio", busca en el portafolio del artista
  // trabajos que coincidan con el estilo elegido y los muestra como
  // galería. Si no hay coincidencias, avisa y sigue igual. Al terminar,
  // deja el botón para continuar con la cotización. ──
  const showArtistReferences = useCallback(
    async (artistId, estilo) => {
      setBusy(true);
      try {
        const { data } = await getPortfolioAPI({ artist: artistId });
        const items = data?.info || [];
        const target = normalizeForMatch(estilo);
        const matches = items
          .filter((it) => (it.styles || []).some((s) => normalizeForMatch(s.nombre) === target))
          .slice(0, 4);

        if (matches.length > 0) {
          pushBot(`Estos son algunos trabajos de ${selectionRef.current.artista?.nombre} en ${estilo}:`);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              from: "bot",
              gallery: matches.map((m) => ({
                imagen_url: m.imagenes_urls?.[0],
                titulo: m.titulo,
              })),
            },
          ]);
        } else {
          pushBot(`${selectionRef.current.artista?.nombre} todavía no tiene trabajos cargados en ese estilo.`);
        }
        await delay(500);
      } catch (_e) {
        pushBot("No pudimos cargar el portafolio en este momento.");
      } finally {
        setBusy(false);
        attachOptions([CONTINUAR_COTIZACION]);
      }
    },
    [attachOptions, pushBot]
  );

  // ── Paso 4: elegir artista real según el estilo (sin auto-asignar) ──
  const stepArtista = useCallback(async () => {
    setStep("artista");
    setBusy(true);
    pushBot(`Buscando artistas especializados en ${selectionRef.current.estilo}…`);
    await delay(400);

    let candidatos = [];
    try {
      const { data } = await getArtistsAPI();
      const lista = data?.info || data?.artists || [];
      candidatos = matchArtistsByStyle(lista, selectionRef.current.estilo);
    } catch (_e) {
      // Sin conexión a la API -> se sigue sin artistas reales
    }
    artistCandidatesRef.current = candidatos;
    setBusy(false);

    if (candidatos.length > 0) {
      pushBot("Elige con quién te gustaría trabajar:");
      attachOptions([...candidatos.map((a) => a.nombre_artistico), SIN_ASIGNAR]);
    } else {
      pushBot(
        "Por ahora no hay artistas cargados para ese estilo en el sistema — vas a poder elegir uno al confirmar tu cita."
      );
      selectionRef.current.artista = null;
      setTimeout(runQuote, 400);
    }
  }, [attachOptions, pushBot, runQuote]);

  // ── Paso 3: estilo ───────────────────────────────────────────────────
  const stepEstilo = useCallback(() => {
    setStep("estilo");
    pushBot(`Tamaño: ${selectionRef.current.tamanioLabel} ✓  ¿Qué estilo te interesa?`);
    attachOptions(STYLE_OPTIONS);
  }, [attachOptions, pushBot]);

  // ── Paso 2: tamaño (depende de la zona; incluye "elegir otra zona") ─
  const stepTamanio = useCallback(() => {
    setStep("tamanio");
    const tip = getZoneTip(selectionRef.current.zona);
    pushBot(`Zona: ${selectionRef.current.zona} ✓${tip ? "  " + tip : ""}`);
    setTimeout(() => {
      pushBot("¿Qué tamaño buscas?");
      attachOptions([
        ...getSizeOptionsForZone(selectionRef.current.zona).map((s) => s.label),
        CAMBIAR_ZONA,
      ]);
    }, 400);
  }, [attachOptions, pushBot]);

  // ── Paso 1: zona ──────────────────────────────────────────────────────
  const stepZona = useCallback(() => {
    setStep("zona");
    pushBot("Toca la zona en el modelo 3D ← o elige aquí:");
    attachOptions(QUICK_ZONES);
  }, [attachOptions, pushBot]);

  const stepWelcome = useCallback(() => {
    setStep("welcome");
    pushBot(
      "¡Hola! Rotá el modelo 3D y hacé clic en la zona donde querés el tatuaje. El sistema detecta automáticamente si es frente o espalda."
    );
    setTimeout(() => {
      pushBot("¿Empezamos?");
      attachOptions(["Sí, vamos", "Tengo una consulta"]);
    }, 450);
  }, [attachOptions, pushBot]);

  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    stepWelcome();
  }, [stepWelcome]);

  const restart = useCallback(() => {
    selectionRef.current = { zona: null, tamanio: null, tamanioLabel: null, estilo: null, artista: null };
    artistCandidatesRef.current = [];
    setMessages([]);
    setInputEnabled(false);
    stepWelcome();
  }, [stepWelcome]);

  // ── Cierra la conversación por completo: limpia todo y deja el motor
  // listo para que la próxima vez que se abra el widget arranque desde
  // el paso 0 (welcome) en vez de quedar "congelado" a mitad de flujo. ──
  const exitChat = useCallback(() => {
    selectionRef.current = { zona: null, tamanio: null, tamanioLabel: null, estilo: null, artista: null };
    artistCandidatesRef.current = [];
    setMessages([]);
    setInputEnabled(false);
    setBusy(false);
    stepRef.current = "idle";
    setProgressIndex(0);
    startedRef.current = false; // próximo start() vuelve a disparar stepWelcome
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

  const selectZonaFrom3D = useCallback((zona) => selectZona(zona), [selectZona]);

  // ── Click en una opción de botones ───────────────────────────────────
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
        const opt = getSizeOptionsForZone(selectionRef.current.zona).find((s) => s.label === choice);
        selectionRef.current.tamanioLabel = choice;
        selectionRef.current.tamanio = SIZE_TO_DB_ENUM[opt?.value] || opt?.value;
        setTimeout(stepEstilo, 300);
        return;
      }

      if (step === "estilo") {
        selectionRef.current.estilo = choice;
        setTimeout(stepArtista, 300);
        return;
      }

      if (step === "artista") {
        let chosenArtist = null;
        if (choice === SIN_ASIGNAR) {
          selectionRef.current.artista = null;
        } else {
          const found = artistCandidatesRef.current.find((a) => a.nombre_artistico === choice);
          chosenArtist = found || null;
          selectionRef.current.artista = found
            ? { id: found._id, nombre: found.nombre_artistico }
            : { id: null, nombre: choice };
        }

        if (chosenArtist?._id) {
          setTimeout(() => offerPortfolio(chosenArtist.nombre_artistico), 300);
        } else {
          setTimeout(runQuote, 300);
        }
        return;
      }

      if (step === "portafolio") {
        if (choice === VER_PORTAFOLIO) {
          setTimeout(
            () => showArtistReferences(selectionRef.current.artista?.id, selectionRef.current.estilo),
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
                "Necesitás iniciar sesión para agendar y pagar la reserva. Tu cotización quedó guardada — te esperamos en Ingresar / Reservar cita."
              );
            } else {
              pushBot(
                "Te redirigimos al calendario y Webpay Plus. (Módulo de agenda y pagos — próximamente)"
              );
            }
          }, 300);
        } else if (choice.startsWith("Más información")) {
          setStep("freeform");
          setTimeout(() => {
            pushBot("Escribe tu consulta:");
            setInputEnabled(true);
          }, 300);
        } else {
          setTimeout(restart, 300);
        }
        return;
      }

      // ── freeform: acá vive el botón "Salir" que antes no hacía nada ──
      if (step === "freeform") {
        if (choice.startsWith("Continuar")) {
          setTimeout(stepZona, 300);
        } else if (choice.startsWith("Salir")) {
          setTimeout(exitChat, 300);
        }
        return;
      }
    },
    [markAnswered, pushBot, pushUser, restart, runQuote, showArtistReferences, offerPortfolio, stepArtista, stepEstilo, stepTamanio, stepZona, exitChat, user]
  );

  // ── Texto libre: primero revisa si es intención de cotización (para
  // redirigir directo al flujo guiado), luego busca en la FAQ, y si no
  // encuentra nada ofrece continuar igualmente. ──
  const sendText = useCallback(
    (text) => {
      const v = text.trim();
      if (!v) return;
      pushUser(v);
      setInputEnabled(false);

      if (isQuoteIntent(v)) {
        setTimeout(() => {
          pushBot("¡Claro! Vamos a armar tu cotización — elige la zona corporal para empezar.");
          setTimeout(stepZona, 350);
        }, 400);
        return;
      }

      const faqAnswer = findFaqAnswer(v);
      setTimeout(() => {
        if (faqAnswer) {
          pushBot(faqAnswer);
        } else {
          pushBot(
            "No tengo información exacta sobre eso todavía, pero puedo ayudarte igual con tu cotización — y cualquier duda específica te la resuelve el artista directamente al confirmar tu cita."
          );
        }
        attachOptions(["Continuar con cotización", "Salir"]);
      }, 400);
    },
    [attachOptions, pushBot, pushUser, stepZona]
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