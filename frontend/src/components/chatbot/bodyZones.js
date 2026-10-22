// bodyZones.js
// ─────────────────────────────────────────────────────────────────────────────
// Clasificación de zonas corporales a partir de la GEOMETRÍA real de cada
// modelo (sin umbrales fijos globales).
//
// Idea: al cargar un GLB se miden sus propios puntos de referencia (entrepierna,
// axila, cuello, brazos) y con ellos se etiqueta CADA vértice con una zona.
// Después, un clic solo consulta la etiqueta del vértice más cercano.
//
// Requisitos del modelo:
//   • Un cuerpo humano de pie, de frente al eje +Z, Y hacia arriba, pies cerca de minY.
//   • Brazos SEPARADOS del torso (pose A o pose T). Con los brazos pegados al
//     cuerpo no se pueden distinguir del torso y se avisa en `warnings`.
//   • No necesita esqueleto ni mallas separadas por parte.
//
// Este archivo no depende de three.js: recibe un Float32Array [x,y,z,x,y,z,...]
// ya expresado en el espacio local del cuerpo.
// ─────────────────────────────────────────────────────────────────────────────

export const ZONE = {
  HEAD: 0,
  NECK: 1,
  UPPER_TORSO: 2, // pecho / espalda alta
  MID_TORSO: 3,   // abdomen / espalda baja
  HIP: 4,
  THIGH: 5,
  CALF: 6,
  FOOT: 7,
  UPPER_ARM: 8,   // bíceps
  FOREARM: 9,
  HAND: 10,       // la muñeca ya no es una zona aparte: es parte de la mano
  WRIST: 10,      // alias de HAND (compatibilidad con código anterior)
};

// Todos los valores son fracciones de la altura del modelo (o del tramo indicado).
export const DEFAULT_PARAMS = {
  slices: 100,        // rebanadas horizontales para medir el cuerpo
  gapTol: 0.02,       // hueco mínimo (fracción de H) para separar brazo/torso/pierna
  footTop: 0.05,      // altura del tobillo: por debajo es "pie"
  kneeFrac: 0.55,     // rodilla = pie + kneeFrac * (entrepierna - pie)
  hipTopFrac: 0.30,   // cadera/abdomen, como fracción del tramo entrepierna→axila
  chestFrac: 0.72,    // abdomen/pecho, como fracción del mismo tramo
  neckBelow: 0.03,    // el cuello empieza esto por debajo del punto más fino
  headAbove: 0.01,    // la cabeza empieza esto por encima del punto más fino
  armElbowT: 0.43,    // codo, como fracción del largo hombro→punta del dedo
  armHandT: 0.75,     // donde termina el antebrazo y empieza la mano
  shoulderLift: 0.03, // altura del hombro sobre la axila (fracción de H)
};

export function zoneLabel(code, lado, esFrente) {
  const izq = lado === "izq";
  switch (code) {
    case ZONE.HEAD: return "Cabeza";
    case ZONE.NECK: return "Cuello";
    case ZONE.UPPER_TORSO: return esFrente ? "Pecho" : "Espalda alta";
    case ZONE.MID_TORSO: return esFrente ? "Abdomen" : "Espalda baja";
    case ZONE.HIP: return "Cadera";
    case ZONE.THIGH: return izq ? "Muslo izquierdo" : "Muslo derecho";
    case ZONE.CALF: return izq ? "Pantorrilla izquierda" : "Pantorrilla derecha";
    case ZONE.FOOT: return izq ? "Pie izquierdo" : "Pie derecho";
    case ZONE.UPPER_ARM: return izq ? "Bíceps izquierdo" : "Bíceps derecho";
    case ZONE.FOREARM: return izq ? "Antebrazo izquierdo" : "Antebrazo derecho";
    case ZONE.HAND: return izq ? "Mano izquierda" : "Mano derecha";
    default: return "Zona desconocida";
  }
}

// Agrupa los x de una rebanada en clústeres separados por huecos > gap.
function buildClusters(pos, idxList, gap) {
  const items = idxList.map((i) => ({ i, x: pos[i * 3] }));
  items.sort((a, b) => a.x - b.x);
  const clusters = [];
  let cur = null;
  for (const it of items) {
    if (!cur || it.x - cur.max > gap) {
      cur = { min: it.x, max: it.x, ids: [it.i] };
      clusters.push(cur);
    } else {
      cur.max = it.x;
      cur.ids.push(it.i);
    }
  }
  return clusters;
}

/**
 * @param {Float32Array|number[]} pos  posiciones xyz en espacio local del cuerpo
 * @param {object} [opts]              sobrescribe DEFAULT_PARAMS
 * @returns {{labels: Uint8Array, landmarks: object, warnings: string[], ok: boolean}}
 */
export function analyzeBody(pos, opts = {}) {
  const P = { ...DEFAULT_PARAMS, ...opts };
  const n = pos.length / 3;
  const warnings = [];

  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const y = pos[i * 3 + 1];
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const H = maxY - minY;
  const nS = P.slices;
  const uOf = (i) => (pos[i * 3 + 1] - minY) / H;
  const sliceOf = (i) => Math.min(nS - 1, Math.max(0, Math.floor(uOf(i) * nS)));

  // 1. Rebanadas horizontales y sus clústeres en X
  const buckets = Array.from({ length: nS }, () => []);
  for (let i = 0; i < n; i++) buckets[sliceOf(i)].push(i);
  const gap = P.gapTol * H;
  const clusters = buckets.map((b) => (b.length ? buildClusters(pos, b, gap) : []));
  const maxAbs = buckets.map((b) => {
    let m = 0;
    for (const i of b) m = Math.max(m, Math.abs(pos[i * 3]));
    return m;
  });

  // 2. Entrepierna: primera rebanada (subiendo) donde aparecen vértices en x≈0
  let crotchS = -1;
  for (let s = Math.floor(0.25 * nS); s < Math.floor(0.65 * nS); s++) {
    let minAbs = Infinity;
    for (const i of buckets[s]) {
      const ax = Math.abs(pos[i * 3]);
      if (ax < 0.17 * H && ax < minAbs) minAbs = ax;
    }
    if (minAbs < 0.004 * H) { crotchS = s; break; }
  }
  if (crotchS < 0) {
    crotchS = Math.floor(0.47 * nS);
    warnings.push("No se detectó la entrepierna; se usó una altura por defecto.");
  }
  const crotchU = (crotchS + 0.5) / nS;

  // 3. Axila: la rebanada más alta donde brazo | torso | brazo están separados
  let armpitS = -1;
  for (let s = Math.floor(0.9 * nS); s > Math.floor((crotchU + 0.08) * nS); s--) {
    if (clusters[s].length >= 3) { armpitS = s; break; }
  }
  let armsOk = armpitS >= 0;
  if (!armsOk) {
    armpitS = Math.floor((crotchU + 0.28) * nS);
    warnings.push(
      "No se detectaron brazos separados del torso. Usa un modelo en pose A o T."
    );
  }
  const armpitU = (armpitS + 1) / nS;

  // 4. Cuello: punto más fino por encima de los hombros
  let neckS = -1, neckW = Infinity;
  for (let s = Math.floor((armpitU + 0.03) * nS); s < Math.floor(0.95 * nS); s++) {
    if (!buckets[s].length) continue;
    if (maxAbs[s] < neckW) { neckW = maxAbs[s]; neckS = s; }
  }
  if (neckS < 0) {
    neckS = Math.floor(0.875 * nS);
    warnings.push("No se detectó el cuello; se usó una altura por defecto.");
  }
  const neckU = (neckS + 0.5) / nS;
  const neckStartU = neckU - P.neckBelow;
  const headStartU = neckU + P.headAbove;

  // 5. Pivotes de hombro y ancho del torso a la altura de la axila
  const pivot = { izq: null, der: null };
  let shoulderX = 0.17 * H;
  if (armsOk) {
    const cl = clusters[armpitS];
    const left = cl[0], right = cl[cl.length - 1];
    let mid = cl[0];
    for (const c of cl) {
      if (Math.abs((c.min + c.max) / 2) < Math.abs((mid.min + mid.max) / 2)) mid = c;
    }
    shoulderX = Math.max(Math.abs(mid.min), Math.abs(mid.max));
    const shoulderY = minY + (armpitU + P.shoulderLift) * H;
    const mk = (c) => {
      let sz = 0;
      for (const i of c.ids) sz += pos[i * 3 + 2];
      return {
        x: (c.min + c.max) / 2,
        y: shoulderY,
        z: sz / c.ids.length,
      };
    };
    // "izq" = lado de X negativo (misma convención que el código original)
    pivot.izq = mk(left);
    pivot.der = mk(right);
  }

  // 6. Mitad de ancho de piernas (para distinguir manos que cuelgan a la altura de las piernas)
  let legHalf = 0;
  for (let s = 0; s < crotchS; s++) {
    if (clusters[s].length && clusters[s].length <= 2) legHalf = Math.max(legHalf, maxAbs[s]);
  }
  legHalf += 0.01 * H;

  // 7. ¿Qué vértices son brazo?
  const isArm = new Uint8Array(n);
  if (armsOk) {
    for (let i = 0; i < n; i++) {
      const s = sliceOf(i);
      const u = uOf(i);
      const x = pos[i * 3];
      let arm = false;
      if (s < crotchS) {
        arm = Math.abs(x) > legHalf;
      } else if (s < armpitS + 1) {
        const cl = clusters[s];
        if (cl.length >= 3) arm = x <= cl[0].max || x >= cl[cl.length - 1].min;
      } else if (u < neckStartU) {
        arm = Math.abs(x) > shoulderX;
      }
      isArm[i] = arm ? 1 : 0;
    }
  }

  // 8. Largo de cada brazo (hombro → punta del dedo)
  const armLen = { izq: 1e-6, der: 1e-6 };
  if (armsOk) {
    for (let i = 0; i < n; i++) {
      if (!isArm[i]) continue;
      const side = pos[i * 3] < 0 ? "izq" : "der";
      const pv = pivot[side];
      const d = Math.hypot(pos[i * 3] - pv.x, pos[i * 3 + 1] - pv.y, pos[i * 3 + 2] - pv.z);
      if (d > armLen[side]) armLen[side] = d;
    }
  }

  // 9. Etiqueta final de cada vértice
  const torsoSpan = armpitU - crotchU;
  const hipTop = crotchU + P.hipTopFrac * torsoSpan;
  const chestBottom = crotchU + P.chestFrac * torsoSpan;
  const kneeU = P.footTop + P.kneeFrac * (crotchU - P.footTop);

  const labels = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const u = uOf(i);
    if (isArm[i]) {
      const side = pos[i * 3] < 0 ? "izq" : "der";
      const pv = pivot[side];
      const d = Math.hypot(pos[i * 3] - pv.x, pos[i * 3 + 1] - pv.y, pos[i * 3 + 2] - pv.z);
      const t = d / armLen[side];
      labels[i] =
        t < P.armElbowT ? ZONE.UPPER_ARM :
        t < P.armHandT ? ZONE.FOREARM : ZONE.HAND;
      continue;
    }
    if (u >= headStartU) labels[i] = ZONE.HEAD;
    else if (u >= neckStartU) labels[i] = ZONE.NECK;
    else if (u >= chestBottom) labels[i] = ZONE.UPPER_TORSO;
    else if (u >= hipTop) labels[i] = ZONE.MID_TORSO;
    else if (u >= crotchU) labels[i] = ZONE.HIP;
    else if (u >= kneeU) labels[i] = ZONE.THIGH;
    else if (u >= P.footTop) labels[i] = ZONE.CALF;
    else labels[i] = ZONE.FOOT;
  }

  return {
    labels,
    ok: armsOk && warnings.length === 0,
    warnings,
    landmarks: {
      minY, height: H,
      crotchU, armpitU, neckU, neckStartU, headStartU,
      hipTop, chestBottom, kneeU,
      shoulderX, legHalf, pivot, armLen,
    },
  };
}
