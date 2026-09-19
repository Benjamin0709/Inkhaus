import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ── Modelos disponibles por género ─────────────────────────────
const MODELS = {
  male: "/models/maniqui_M.glb",
  female: "/models/maniqui_F.glb",
};

// ── Multiplicador de escala manual por género (déjalo en 1 salvo que
// necesites compensar una malla exportada con transform sin aplicar) ──
const MODEL_SCALE_MULTIPLIER = {
  male: 1,
  female: 1,
};

// ── Modo debug de calibración de zonas (tooltip muestra yFrac/xFrac) ──
const DEBUG_ZONES = false;

// ── Umbrales de clasificación de zona ───────────────────────────
// Validados contra el esqueleto real (huesos Bip001) de ambos GLB:
// maniqui_M y maniqui_F comparten EXACTAMENTE el mismo rig/bind-pose
// (mismas posiciones de hueso), por eso un solo set de umbrales sirve
// para ambos cuerpos.
//
// El brazo ahora usa una BANDA de Y (armYFracMin/Max), no solo un
// mínimo. Antes, con solo un mínimo (0.47), cualquier punto ancho de
// cadera/abdomen (que llega hasta yFrac 0.56) con xFrac>0.275 se
// clasificaba como brazo por error. La banda [0.57, 0.83] coincide
// con el rango real hombro→muñeca de este rig y no se solapa con
// torso/cadera ni con cuello/cabeza.
//
// forearm/wrist/hand vueltos a los valores que coinciden con los
// huesos reales (codo≈0.574, muñeca≈0.849): antes los había ensanchado
// "a ojo" para hacerlos más fáciles de tocar, pero eso desplazaba mano
// y muñeca fuera de su lugar real.
const THRESHOLDS = {
  head: 0.879,
  neck: 0.846,
  chestFront: 0.676,
  abdomen: 0.56,
  hip: 0.46,
  thigh: 0.291,
  calf: 0.065,
  armXFrac: 0.275,
  armYFracMin: 0.57,   // por debajo de esto: cadera/abdomen, nunca brazo
  armYFracMax: 0.83,   // por encima de esto: cuello/cabeza, nunca brazo
  forearm: 0.566,      // codo real ≈ 0.574
  wrist: 0.846,        // muñeca real ≈ 0.849
  hand: 0.9,
};

/**
 * Visor 3D del maniquí + raycasting para clasificar la zona corporal
 * tocada por el usuario. Highlight simple (todo el mesh se tiñe, sin
 * fragmentación por shader) y zoom con rueda/botones.
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
    let bbMinY = 0, bbH = 1, bbHalfW = 1;

    // ── Carga de modelo, reutilizable para cambio de género ─────────
    function loadModel(url, g) {
      hovered = null;
      selected = null;
      dom.style.cursor = "grab";
      setTip(null);
      setBadge(null);
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
              o.material = new THREE.MeshPhongMaterial({
                color: 0xd6c3a3,
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

          const box3 = new THREE.Box3().setFromObject(model);
          body.updateWorldMatrix(true, false);
          const invBody = new THREE.Matrix4().copy(body.matrixWorld).invert();
          const localMin = box3.min.clone().applyMatrix4(invBody);
          const localMax = box3.max.clone().applyMatrix4(invBody);
          bbMinY = localMin.y;
          bbH = localMax.y - localMin.y;
          bbHalfW = Math.max(Math.abs(localMin.x), Math.abs(localMax.x));

          maniquiReady = true;
          setReady(true);
        },
        undefined,
        (err) => console.error("Error cargando el maniquí GLB:", err)
      );
    }
    loadModelRef.current = loadModel;

    // ── Raycasting y clasificación de zona ──────────────────────────
    const ray = new THREE.Raycaster();
    const mv = new THREE.Vector2();
    let drag = false, px = 0, py = 0, dragD = 0, rotY = 0.2, rotX = -0.04;
    let hovered = null, selected = null;

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

    function resolveZona(h) {
      const p = h.point.clone();
      body.worldToLocal(p);
      const yFrac = (p.y - bbMinY) / bbH;
      const xFrac = Math.abs(p.x) / bbHalfW;
      const lado = p.x < 0 ? "izq" : "der";
      const nMat = new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld);
      const nWorld = h.face.normal.clone().applyMatrix3(nMat).normalize();
      const invBodyRot = new THREE.Matrix4().extractRotation(body.matrixWorld).invert();
      const n = nWorld.applyMatrix4(invBodyRot);
      const esFrente = n.z >= 0;
      const T = THRESHOLDS;

      // Banda de Y para el brazo: evita que cadera/abdomen anchos
      // (yFrac hasta 0.56) se confundan con brazo, y que hombro/cuello
      // (yFrac desde 0.846) también se confundan.
      if (xFrac > T.armXFrac && yFrac > T.armYFracMin && yFrac < T.armYFracMax) {
        if (xFrac > T.hand) return lado === "izq" ? "Mano izquierda" : "Mano derecha";
        if (xFrac > T.wrist) return lado === "izq" ? "Muñeca izquierda" : "Muñeca derecha";
        if (xFrac > T.forearm) return lado === "izq" ? "Antebrazo izquierdo" : "Antebrazo derecho";
        return lado === "izq" ? "Bíceps izquierdo" : "Bíceps derecho";
      }
      if (yFrac > T.head) return "Cabeza";
      if (yFrac > T.neck) return "Cuello";
      if (yFrac > T.chestFront) return esFrente ? "Pecho" : "Espalda alta";
      if (yFrac > T.abdomen) return esFrente ? "Abdomen" : "Espalda baja";
      if (yFrac > T.hip) return "Cadera";
      if (yFrac > T.thigh) return lado === "izq" ? "Muslo izquierdo" : "Muslo derecho";
      if (yFrac > T.calf) return lado === "izq" ? "Pantorrilla izquierda" : "Pantorrilla derecha";
      return lado === "izq" ? "Pie izquierdo" : "Pie derecho";
    }

    // ── Highlight simple: tiñe todo el mesh (como el prototipo original) ──
    function hl(m, t) {
      if (!m) return;
      m.material.emissive.setHex(t === "h" ? 0x182860 : t === "s" ? 0x003822 : 0x000000);
    }

    const dom = renderer.domElement;

    function handleDown(e) { drag = true; px = e.clientX; py = e.clientY; dragD = 0; }
    function handleUp() { drag = false; }
    function handleLeave() { drag = false; setTip(null); }

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
        if (hovered && hovered !== selected) hl(hovered, "");
        if (h) {
          hovered = h.object;
          if (hovered !== selected) hl(hovered, "h");
          dom.style.cursor = "pointer";
          const r = mount.getBoundingClientRect();
          const zonaText = resolveZona(h);
          const text = DEBUG_ZONES
            ? (() => {
                const p = h.point.clone();
                body.worldToLocal(p);
                const yFrac = (p.y - bbMinY) / bbH;
                const xFrac = Math.abs(p.x) / bbHalfW;
                return `${zonaText}  (y:${yFrac.toFixed(3)} x:${xFrac.toFixed(3)})`;
              })()
            : zonaText;
          setTip({
            text,
            x: Math.min(e.clientX - r.left + 14, width - 120),
            y: Math.max(e.clientY - r.top - 26, 4),
          });
        } else {
          hovered = null;
          dom.style.cursor = "grab";
          setTip(null);
        }
      }
    }

    function handleClick(e) {
      if (dragD > 8) return;
      if (!stateRef.current.activeProp) return;
      const h = castRay(e.clientX, e.clientY);
      if (h) {
        if (selected) hl(selected, "");
        selected = h.object;
        hl(selected, "s");
        const z = resolveZona(h);
        setBadge(z);
        stateRef.current.onZoneSelect && stateRef.current.onZoneSelect(z);
      } else {
        setFlash(true);
        setTimeout(() => setFlash(false), 1400);
        stateRef.current.onInvalidClick && stateRef.current.onInvalidClick();
      }
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
        if (h) {
          if (selected) hl(selected, "");
          selected = h.object;
          hl(selected, "s");
          const z = resolveZona(h);
          setBadge(z);
          stateRef.current.onZoneSelect && stateRef.current.onZoneSelect(z);
        } else {
          setFlash(true);
          setTimeout(() => setFlash(false), 1400);
          stateRef.current.onInvalidClick && stateRef.current.onInvalidClick();
        }
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