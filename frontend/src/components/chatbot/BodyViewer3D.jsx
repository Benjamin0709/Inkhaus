import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { analyzeBody, zoneLabel, ZONE } from "./bodyZones.js";

// ── Modelos disponibles por género ─────────────────────────────
const MODELS = {
  male: "/models/Manniqui_M_final.glb",
  female: "/models/Manniqui_F_final.glb",
};

// ── Multiplicador de escala manual por género (déjalo en 1 salvo que
// necesites compensar una malla exportada con transform sin aplicar) ──
const MODEL_SCALE_MULTIPLIER = {
  male: 1,
  female: 1,
};

// ── Modo debug: el tooltip muestra el código de zona y se imprimen en
// consola los puntos de referencia medidos en cada modelo ──
const DEBUG_ZONES = false;

// ── Si en tu pantalla "izquierda/derecha" salen al revés, ponlo en true ──
const MIRROR_SIDES = false;

// ── Ajustes finos opcionales (ver DEFAULT_PARAMS en bodyZones.js).
// Normalmente NO hace falta tocar nada: los puntos de referencia se miden
// solos a partir de la geometría de cada modelo. Ejemplo si el codo cae
// mal en un modelo concreto:  { armElbowT: 0.45 }
const ZONE_PARAMS = {};

// ── Zonas que distinguen izquierda/derecha ──────────────────────
const LATERAL = new Set([
  ZONE.THIGH, ZONE.CALF, ZONE.FOOT,
  ZONE.UPPER_ARM, ZONE.FOREARM, ZONE.WRIST, ZONE.HAND,
]);

// ── Colores del resaltado por zona ──────────────────────────────
const BASE_COLOR = new THREE.Color(0xd6c3a3);
const HOVER_COLOR = new THREE.Color(0xd6c3a3).lerp(new THREE.Color(0x5577ff), 0.5);
const SELECT_COLOR = new THREE.Color(0xd6c3a3).lerp(new THREE.Color(0x22cc88), 0.6);

/**
 * Visor 3D del maniquí + raycasting para clasificar la zona corporal
 * tocada por el usuario.
 *
 * Las zonas ya NO se calculan con umbrales fijos: al cargar cada GLB se
 * miden sus propios puntos de referencia (entrepierna, axila, cuello, brazos)
 * y se etiqueta cada vértice (ver bodyZones.js). Un clic solo consulta la
 * etiqueta del vértice más cercano al punto tocado.
 *
 * Props:
 *  - onZoneSelect(zonaLabel: string)  -> clic válido sobre el maniquí
 *  - onInvalidClick()                 -> clic fuera del cuerpo
 *  - active: boolean                  -> si es false, ignora clics
 */
export default function BodyViewer3D({ onZoneSelect, onInvalidClick, active = true }) {
  const mountRef = useRef(null);
  const [tip, setTip] = useState(null); // {text,x,y}
  const [badge, setBadge] = useState(null);
  const [flash, setFlash] = useState(false);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState(null);
  const [gender, setGender] = useState("male");

  const stateRef = useRef({ activeProp: active, onZoneSelect, onInvalidClick });
  stateRef.current.activeProp = active;
  stateRef.current.onZoneSelect = onZoneSelect;
  stateRef.current.onInvalidClick = onInvalidClick;

  const loadModelRef = useRef(null);
  const zoomRef = useRef(null); // { zoomIn, zoomOut }

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 280;
    let height = mount.clientHeight || 320;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setClearColor(0x070712);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);

    // ── Zoom: distancia de cámara controlada por rueda/botones ──────
    const ZOOM_MIN = 4.5;
    const ZOOM_MAX = 16;
    let camDist = 10;
    camera.position.set(0, 0.5, camDist);
    camera.lookAt(0, 0.3, 0);

    function applyZoom(delta) {
      camDist = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camDist + delta));
      camera.position.z = camDist;
      camera.lookAt(0, 0.3, 0);
    }
    zoomRef.current = {
      zoomIn: () => applyZoom(-1.1),
      zoomOut: () => applyZoom(1.1),
    };

    scene.add(new THREE.AmbientLight(0x7080b0, 1.0));
    const dL = new THREE.DirectionalLight(0xffffff, 1.1);
    dL.position.set(5, 10, 8);
    scene.add(dL);
    const rL = new THREE.PointLight(0x2244ff, 0.75, 24);
    rL.position.set(-5, 4, -5);
    scene.add(rL);
    const fL = new THREE.PointLight(0xff7030, 0.3, 18);
    fL.position.set(4, -3, 4);
    scene.add(fL);

    const plat = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.7, 0.07, 40),
      new THREE.MeshPhongMaterial({ color: 0x12122a, shininess: 20 })
    );
    plat.position.set(0, -3.9, 0);
    scene.add(plat);

    for (let r = 0.6; r <= 1.5; r += 0.45) {
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x2035b0, transparent: true, opacity: 0.35 })
      ));
    }

    const body = new THREE.Group();
    scene.add(body);
    const meshes = [];
    let maniquiReady = false;

    // Estado de interacción (declarado antes de loadModel para poder reiniciarlo)
    const ray = new THREE.Raycaster();
    const mv = new THREE.Vector2();
    const tmpV = new THREE.Vector3();
    let drag = false, px = 0, py = 0, dragD = 0, rotY = 0.2, rotX = -0.04;
    let hovered = null;     // objeto bajo el cursor (detiene el giro automático)
    let hoverKey = -1;      // zona resaltada por hover
    let selKey = -1;        // zona seleccionada
    const dom = renderer.domElement;

    // ── Resaltado por zona (colores de vértice) ─────────────────────
    function repaint() {
      meshes.forEach((m) => {
        const col = m.geometry.attributes.color;
        const keys = m.userData.zoneKeys;
        if (!col || !keys) return;
        const arr = col.array;
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          const c = k === selKey ? SELECT_COLOR : k === hoverKey ? HOVER_COLOR : BASE_COLOR;
          arr[i * 3] = c.r;
          arr[i * 3 + 1] = c.g;
          arr[i * 3 + 2] = c.b;
        }
        col.needsUpdate = true;
      });
    }

    // ── Carga de modelo, reutilizable para cambio de género ─────────
    function loadModel(url, g) {
      hovered = null;
      hoverKey = -1;
      selKey = -1;
      dom.style.cursor = "grab";
      setTip(null);
      setBadge(null);
      setWarning(null);
      setReady(false);
      maniquiReady = false;

      meshes.forEach((m) => {
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
        else m.material?.dispose();
      });
      meshes.length = 0;
      while (body.children.length) body.remove(body.children[0]);

      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((o) => {
            if (o.isMesh) {
              // Color blanco: el color real viene de los colores de vértice
              // (así se puede resaltar solo la zona tocada).
              o.material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                vertexColors: true,
                shininess: 26,
                specular: 0x1a1a33,
              });
              meshes.push(o);
            }
          });

          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const dist = camDist;
          const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
          const visibleW = visibleH * camera.aspect;
          const margin = 0.78;
          const autoScale = Math.min((visibleH * margin) / size.y, (visibleW * margin) / size.x);
          const scale = autoScale * (MODEL_SCALE_MULTIPLIER[g] ?? 1);
          model.scale.setScalar(scale);

          const box2 = new THREE.Box3().setFromObject(model);
          model.position.x -= box2.getCenter(new THREE.Vector3()).x;
          model.position.z -= box2.getCenter(new THREE.Vector3()).z;

          const modelH = box2.max.y - box2.min.y;
          const centerY = 0.3;
          model.position.y -= box2.min.y - (centerY - modelH / 2);
          body.add(model);

          const feetY = centerY - modelH / 2;
          const platRatio = modelH / 8.5;
          plat.position.y = feetY - 0.03;
          plat.scale.set(platRatio, 1, platRatio);

          // ── Análisis anatómico del modelo (en espacio local del cuerpo) ──
          body.updateWorldMatrix(true, false);
          model.updateMatrixWorld(true);
          const invBody = new THREE.Matrix4().copy(body.matrixWorld).invert();

          let total = 0;
          meshes.forEach((m) => { total += m.geometry.attributes.position.count; });
          const allPos = new Float32Array(total * 3);
          let off = 0;
          meshes.forEach((m) => {
            const pa = m.geometry.attributes.position;
            m.userData.zoneOffset = off;
            for (let i = 0; i < pa.count; i++) {
              tmpV.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld).applyMatrix4(invBody);
              allPos[(off + i) * 3] = tmpV.x;
              allPos[(off + i) * 3 + 1] = tmpV.y;
              allPos[(off + i) * 3 + 2] = tmpV.z;
            }
            off += pa.count;
          });

          const result = analyzeBody(allPos, ZONE_PARAMS);
          if (result.warnings.length) {
            console.warn("[BodyViewer3D] " + result.warnings.join(" "));
            setWarning(result.warnings[0]);
          }
          if (DEBUG_ZONES) console.log("[BodyViewer3D] puntos de referencia", g, result.landmarks);

          // Etiquetas y claves por vértice, y atributo de color por malla
          meshes.forEach((m) => {
            const count = m.geometry.attributes.position.count;
            const start = m.userData.zoneOffset;
            const labels = result.labels.subarray(start, start + count);
            const keys = new Uint8Array(count);
            for (let i = 0; i < count; i++) {
              const code = labels[i];
              const xLocal = allPos[(start + i) * 3];
              keys[i] = code * 2 + (LATERAL.has(code) && xLocal >= 0 ? 1 : 0);
            }
            m.userData.zoneLabels = labels;
            m.userData.zoneKeys = keys;
            m.geometry.setAttribute(
              "color",
              new THREE.BufferAttribute(new Float32Array(count * 3), 3)
            );
          });
          repaint();

          maniquiReady = true;
          setReady(true);
        },
        undefined,
        (err) => console.error("Error cargando el maniquí GLB:", err)
      );
    }
    loadModelRef.current = loadModel;

    // ── Raycasting y clasificación de zona ──────────────────────────
    function ndc(ex, ey) {
      const r = renderer.domElement.getBoundingClientRect();
      mv.x = ((ex - r.left) / r.width) * 2 - 1;
      mv.y = -((ey - r.top) / r.height) * 2 + 1;
    }
    function castRay(ex, ey) {
      if (!maniquiReady) return null;
      ndc(ex, ey);
      ray.setFromCamera(mv, camera);
      const h = ray.intersectObjects(meshes);
      return h.length ? h[0] : null;
    }

    // Vértice del triángulo tocado que queda más cerca del punto de impacto
    function nearestVertex(h) {
      const pa = h.object.geometry.attributes.position;
      let best = h.face.a, bd = Infinity;
      for (const idx of [h.face.a, h.face.b, h.face.c]) {
        tmpV.fromBufferAttribute(pa, idx).applyMatrix4(h.object.matrixWorld);
        const d = tmpV.distanceToSquared(h.point);
        if (d < bd) { bd = d; best = idx; }
      }
      return best;
    }

    // Devuelve { name, key, code } para el punto tocado
    function classify(h) {
      const vi = nearestVertex(h);
      const code = h.object.userData.zoneLabels?.[vi];
      const key = h.object.userData.zoneKeys?.[vi] ?? -1;
      if (code === undefined) return { name: "Zona desconocida", key: -1, code: -1 };

      const lado = ((key & 1) === 0) !== MIRROR_SIDES ? "izq" : "der";
      const nMat = new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld);
      const nWorld = h.face.normal.clone().applyMatrix3(nMat).normalize();
      const invBodyRot = new THREE.Matrix4().extractRotation(body.matrixWorld).invert();
      const n = nWorld.applyMatrix4(invBodyRot);
      const esFrente = n.z >= 0;

      return { name: zoneLabel(code, lado, esFrente), key, code };
    }

    function handleDown(e) { drag = true; px = e.clientX; py = e.clientY; dragD = 0; }
    function handleUp() { drag = false; }
    function handleLeave() {
      drag = false;
      setTip(null);
      if (hoverKey !== -1) { hoverKey = -1; repaint(); }
    }

    function handleMove(e) {
      if (drag) {
        const dx = e.clientX - px, dy = e.clientY - py;
        dragD += Math.abs(dx) + Math.abs(dy);
        rotY += dx * 0.011;
        rotX = Math.max(-0.44, Math.min(0.44, rotX + dy * 0.006));
        px = e.clientX; py = e.clientY;
        setTip(null);
      } else {
        const h = castRay(e.clientX, e.clientY);
        if (h) {
          hovered = h.object;
          dom.style.cursor = "pointer";
          const r = mount.getBoundingClientRect();
          const c = classify(h);
          if (c.key !== hoverKey) { hoverKey = c.key; repaint(); }
          const text = DEBUG_ZONES ? `${c.name}  (código ${c.code})` : c.name;
          setTip({
            text,
            x: Math.min(e.clientX - r.left + 14, width - 120),
            y: Math.max(e.clientY - r.top - 26, 4),
          });
        } else {
          hovered = null;
          dom.style.cursor = "grab";
          if (hoverKey !== -1) { hoverKey = -1; repaint(); }
          setTip(null);
        }
      }
    }

    function selectAt(h) {
      const c = classify(h);
      selKey = c.key;
      repaint();
      setBadge(c.name);
      stateRef.current.onZoneSelect && stateRef.current.onZoneSelect(c.name);
    }
    function invalidClick() {
      setFlash(true);
      setTimeout(() => setFlash(false), 1400);
      stateRef.current.onInvalidClick && stateRef.current.onInvalidClick();
    }

    function handleClick(e) {
      if (dragD > 8) return;
      if (!stateRef.current.activeProp) return;
      const h = castRay(e.clientX, e.clientY);
      if (h) selectAt(h);
      else invalidClick();
    }

    // ── Zoom con rueda del mouse ─────────────────────────────────────
    function handleWheel(e) {
      e.preventDefault();
      applyZoom(e.deltaY * 0.0035 * camDist * 0.5);
    }

    let tpx = 0, tpy = 0, td = 0;
    function handleTouchStart(e) { e.preventDefault(); const t = e.touches[0]; tpx = t.clientX; tpy = t.clientY; td = 0; }
    function handleTouchMove(e) {
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - tpx, dy = t.clientY - tpy;
      td += Math.abs(dx) + Math.abs(dy);
      rotY += dx * 0.011;
      rotX = Math.max(-0.44, Math.min(0.44, rotX + dy * 0.006));
      tpx = t.clientX; tpy = t.clientY;
    }
    function handleTouchEnd(e) {
      if (td < 10 && stateRef.current.activeProp) {
        const t = e.changedTouches[0];
        const h = castRay(t.clientX, t.clientY);
        if (h) selectAt(h);
        else invalidClick();
      }
    }

    dom.addEventListener("mousedown", handleDown);
    dom.addEventListener("mouseup", handleUp);
    dom.addEventListener("mouseleave", handleLeave);
    dom.addEventListener("mousemove", handleMove);
    dom.addEventListener("click", handleClick);
    dom.addEventListener("wheel", handleWheel, { passive: false });
    dom.addEventListener("touchstart", handleTouchStart, { passive: false });
    dom.addEventListener("touchmove", handleTouchMove, { passive: false });
    dom.addEventListener("touchend", handleTouchEnd);

    let raf = null;
    function loop() {
      raf = requestAnimationFrame(loop);
      if (!drag && !hovered) rotY += 0.00085;
      body.rotation.y = rotY;
      body.rotation.x = rotX;
      renderer.render(scene, camera);
    }
    loop();

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      width = entry.contentRect.width || width;
      height = entry.contentRect.height || height;
      if (width < 10 || height < 10) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dom.removeEventListener("mousedown", handleDown);
      dom.removeEventListener("mouseup", handleUp);
      dom.removeEventListener("mouseleave", handleLeave);
      dom.removeEventListener("mousemove", handleMove);
      dom.removeEventListener("click", handleClick);
      dom.removeEventListener("wheel", handleWheel);
      dom.removeEventListener("touchstart", handleTouchStart);
      dom.removeEventListener("touchmove", handleTouchMove);
      dom.removeEventListener("touchend", handleTouchEnd);
      meshes.forEach((m) => {
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
        else m.material?.dispose();
      });
      renderer.dispose();
      if (mount.contains(dom)) mount.removeChild(dom);
      loadModelRef.current = null;
      zoomRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loadModelRef.current) loadModelRef.current(MODELS[gender], gender);
  }, [gender]);

  return (
    <div ref={mountRef} className="relative w-full h-full bg-[#070712] overflow-hidden select-none">
      {/* Toggle Hombre / Mujer */}
      <div className="absolute z-10 flex gap-1 p-1 -translate-x-1/2 border rounded-full top-2 left-1/2 bg-black/60 border-white/20 backdrop-blur">
        {["male", "female"].map((g) => (
          <button
            key={g}
            type="button"
            onClick={(e) => { e.stopPropagation(); setGender(g); }}
            className={`px-3 py-1 rounded-full text-[10.5px] font-medium tracking-wide transition-all
              ${gender === g ? "bg-[rgba(100,120,255,0.35)] text-white" : "text-white/50 hover:text-white"}`}
          >
            {g === "male" ? "♂ Hombre" : "♀ Mujer"}
          </button>
        ))}
      </div>

      {/* Controles de zoom */}
      <div className="absolute z-10 flex flex-col gap-1 top-2 right-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); zoomRef.current?.zoomIn(); }}
          aria-label="Acercar"
          className="w-6 h-6 rounded-md bg-black/60 border border-white/20 text-white/80 hover:text-white hover:bg-black/80 text-[13px] leading-none flex items-center justify-center backdrop-blur"
        >
          +
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); zoomRef.current?.zoomOut(); }}
          aria-label="Alejar"
          className="w-6 h-6 rounded-md bg-black/60 border border-white/20 text-white/80 hover:text-white hover:bg-black/80 text-[13px] leading-none flex items-center justify-center backdrop-blur"
        >
          −
        </button>
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white/40">
          Cargando modelo 3D…
        </div>
      )}
      {badge && (
        <div className="absolute top-2 left-2 bg-black/60 border border-white/20 px-2.5 py-1 rounded-md text-[10.5px] text-white/90 pointer-events-none">
          {badge}
        </div>
      )}
      {warning && (
        <div className="absolute left-2 right-2 bottom-7 bg-amber-900/80 border border-amber-400/40 px-2.5 py-1 rounded-md text-[10px] text-amber-100 pointer-events-none">
          {warning}
        </div>
      )}
      {tip && (
        <div
          className="absolute bg-[rgba(5,5,20,0.85)] text-[#e8e8ff] px-2 py-1 rounded text-[10.5px] pointer-events-none whitespace-nowrap border border-[rgba(100,120,255,0.3)]"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      )}
      <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/25 pointer-events-none select-none">
        Arrastrá para rotar · Rueda del mouse o +/− para zoom · Tocá para elegir zona
      </div>
      {flash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-red-900/10">
          <div className="bg-red-900/90 text-white px-4 py-1.5 rounded-md text-[11.5px] font-medium">
            Zona no válida — clic fuera del cuerpo
          </div>
        </div>
      )}
    </div>
  );
}
