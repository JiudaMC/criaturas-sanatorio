// Visor 3D para el teléfono: un solo WebGL para todas las criaturas, en un pasillo del sanatorio.
// Luz "Iluminado" (techo cálido + contorno frío + relleno) o "Noche" (solo la linterna, con VHS).
// crearVisor(caja, avisos) → { mostrar(cfg), tocar(clip), noche(bool), girar(bool) }
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

try { window.createImageBitmap = undefined; } catch (e) {}

function lienzo(w, h, pinta) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; pinta(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function crearVisor(caja, avisos) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  caja.prepend(renderer.domElement);

  const escena = new THREE.Scene();
  const FONDO = new THREE.Color(0x18201c);
  escena.background = FONDO;
  escena.fog = new THREE.Fog(FONDO, 45, 120);
  const camara = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  escena.add(camara);
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true; controles.dampingFactor = 0.09;
  controles.minDistance = 3; controles.maxDistance = 90;
  controles.maxPolarAngle = Math.PI * 0.49;
  controles.enablePan = false;
  controles.autoRotateSpeed = 1.6;

  // ---------------- el pasillo ----------------
  const piso = lienzo(128, 128, (g) => {
    g.fillStyle = "#a59e88"; g.fillRect(0, 0, 128, 128);
    g.fillStyle = "#62705f"; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 2; g.strokeRect(0, 0, 64, 64); g.strokeRect(64, 64, 64, 64);
  });
  piso.repeat.set(60, 60); piso.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: piso, roughness: 0.62, metalness: 0.0 }));
  suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; escena.add(suelo);
  const azulejo = lienzo(128, 128, (g) => {
    g.fillStyle = "#93ab9d"; g.fillRect(0, 0, 128, 128);
    g.fillStyle = "rgba(0,0,0,.16)"; for (let i = 0; i <= 128; i += 32) { g.fillRect(i, 0, 2, 128); g.fillRect(0, i, 128, 2); }
  });
  azulejo.repeat.set(30, 6);
  const muroMat = new THREE.MeshStandardMaterial({ map: azulejo, roughness: 0.55 });
  const yeso = new THREE.MeshStandardMaterial({ color: 0x7d7a6c, roughness: 0.95 });
  const franja = new THREE.MeshStandardMaterial({ color: 0x41594c, roughness: 0.6 });
  const pasillo = new THREE.Group();
  const muro = (w, x, z, ry) => {
    const g = new THREE.Group();
    const bajo = new THREE.Mesh(new THREE.PlaneGeometry(w, 5), muroMat); bajo.position.y = 2.5;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.5), franja); f.position.y = 5.2;
    const alto = new THREE.Mesh(new THREE.PlaneGeometry(w, 16), yeso); alto.position.y = 13.4;
    for (const m of [bajo, f, alto]) { m.receiveShadow = true; g.add(m); }
    g.position.set(x, 0, z); g.rotation.y = ry; pasillo.add(g);
  };
  muro(120, 0, -24, 0);                 // fondo
  muro(120, -17, 0, Math.PI / 2);       // izquierda
  muro(120, 17, 0, -Math.PI / 2);       // derecha
  // puertas del fondo y una banca
  const madera = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.8 });
  const hojaMat = new THREE.MeshStandardMaterial({ color: 0x5f6f62, roughness: 0.6 });
  for (const x of [-9, 9]) {
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(5, 9.5, 0.2), hojaMat); hoja.position.set(x, 4.75, -23.85); hoja.receiveShadow = true; pasillo.add(hoja);
    for (const [px, py, w, h] of [[-2.7, 4.9, 0.4, 9.8], [2.7, 4.9, 0.4, 9.8], [0, 9.8, 5.8, 0.4]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), madera); b.position.set(x + px, py, -23.8); pasillo.add(b);
    }
    const v = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2), new THREE.MeshStandardMaterial({ color: 0x0c0f0e, roughness: 0.2 })); v.position.set(x, 6.8, -23.7); pasillo.add(v);
  }
  // lámparas del techo (solo brillan; la luz la ponen las luces de abajo)
  const tubo = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff2ea, emissiveIntensity: 2.2 });
  const tubos = [];
  for (const z of [-18, -4, 10]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 4.5), tubo); t.position.set(0, 21, z); pasillo.add(t); tubos.push(t); }
  escena.add(pasillo);


  // ---------------- polvo en el aire ----------------
  const NP = 300;
  const dpos = new Float32Array(NP * 3), dvel = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) {
    dpos[i * 3] = (Math.random() - 0.5) * 30; dpos[i * 3 + 1] = Math.random() * 20; dpos[i * 3 + 2] = -22 + Math.random() * 44;
    dvel[i * 3] = (Math.random() - 0.5) * 0.35; dvel[i * 3 + 1] = (Math.random() - 0.35) * 0.22; dvel[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  const puntoTex = lienzo(32, 32, (g) => {
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  });
  puntoTex.wrapS = puntoTex.wrapT = THREE.ClampToEdgeWrapping;
  const dmat = new THREE.PointsMaterial({ color: 0xe8dfc8, size: 0.24, map: puntoTex, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true });
  const polvo = new THREE.Points(dgeo, dmat);
  polvo.frustumCulled = false;
  escena.add(polvo);
  // jirones de niebla baja: planos suaves que se arrastran por el piso
  const nieblaTex = lienzo(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    r.addColorStop(0, "rgba(200,210,200,.55)"); r.addColorStop(1, "rgba(200,210,200,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
  nieblaTex.wrapS = nieblaTex.wrapT = THREE.ClampToEdgeWrapping;
  const jirones = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: nieblaTex, transparent: true, opacity: 0.22, depthWrite: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set((Math.random() - 0.5) * 24, 0.5 + Math.random() * 1.4, -20 + Math.random() * 36);
    m.userData.v = (Math.random() - 0.5) * 0.5; m.userData.fase = Math.random() * 6;
    escena.add(m); jirones.push(m);
  }

  // ---------------- luces ----------------
  const cielo = new THREE.HemisphereLight(0xdde9e3, 0x2a2620, 0.7);
  const llave = new THREE.DirectionalLight(0xfff0dc, 2.6);
  llave.position.set(9, 26, 14); llave.castShadow = true;
  llave.shadow.mapSize.set(1024, 1024);
  Object.assign(llave.shadow.camera, { left: -20, right: 20, top: 24, bottom: -6, near: 1, far: 80 });
  llave.shadow.bias = -0.0005; llave.shadow.radius = 4;
  const contorno = new THREE.DirectionalLight(0x8fd2ff, 2.0); contorno.position.set(-14, 16, -18);
  const relleno = new THREE.PointLight(0xfff6ea, 40, 70, 1.2); relleno.position.set(0, 2, 0); camara.add(relleno);
  const techo1 = new THREE.PointLight(0xdff2ea, 60, 60, 1.4); techo1.position.set(0, 19, -4);
  const linterna = new THREE.SpotLight(0xffe2b8, 0, 140, 0.55, 0.7, 1.05);
  linterna.castShadow = true; linterna.shadow.mapSize.set(1024, 1024);
  linterna.position.set(0.6, -0.5, 0); camara.add(linterna); linterna.target.position.set(0, 0, -10); camara.add(linterna.target);
  escena.add(cielo, llave, llave.target, contorno, techo1);

  // de noche: luz de emergencia ámbar tenue en el techo, contorno frío y la linterna (más suave de cerca)
  const emergencia = new THREE.PointLight(0xffa35a, 0, 70, 1.3); emergencia.position.set(0, 18, 4); escena.add(emergencia);
  let esNoche = false, factorLinterna = 1;
  function noche(si) {
    esNoche = si;
    cielo.intensity = si ? 0.22 : 0.7;
    llave.intensity = si ? 0 : 2.6;
    contorno.intensity = si ? 0.8 : 2.0;
    relleno.intensity = si ? 6 : 40;
    techo1.intensity = si ? 0 : 60;
    emergencia.intensity = si ? 70 : 0;
    tubo.emissiveIntensity = si ? 0.15 : 2.2;
    linterna.intensity = si ? 520 * factorLinterna : 0;
    const f = si ? new THREE.Color(0x070908) : FONDO;
    escena.background = f; escena.fog.color = f; escena.fog.near = si ? 10 : 40; escena.fog.far = si ? 66 : 115;
    dmat.opacity = si ? 0.8 : 0.4; for (const j of jirones) j.material.opacity = si ? 0.3 : 0.14;
    renderer.toneMappingExposure = si ? 1.4 : 1.12;
  }

  // luz propia de las criaturas: el farol, la vela y la luz del pecho del Cabrero (y de su evolución) alumbran de verdad
  const LUZ_PROPIA = [[/Lantern/, 0xffa040, 110, 30], [/CandleLight/, 0xffb357, 60, 18], [/ChestLight/, 0xff7a2e, 35, 14]];
  function lucesPropias(raiz) {
    const luces = [];
    raiz.traverse(o => {
      for (const [re, col, int, dist] of LUZ_PROPIA) {
        if ((o.isBone || o.type === "Object3D") && re.test(o.name)) {
          const l = new THREE.PointLight(col, int, dist, 1.6); l.userData.base = int; o.add(l); luces.push(l); break;
        }
      }
      if (o.isMesh) for (const mat of [].concat(o.material)) {
        if (mat && /Luz|Vela|Flame|Llama/i.test(mat.name || "")) { mat.emissive = new THREE.Color(0xffa54a); mat.emissiveIntensity = 3; }
      }
    });
    return luces;
  }

  // ---------------- modelos ----------------
  const cargador = new GLTFLoader();
  const cache = new Map();              // url → { raiz, mezclador, acciones, util, alto, ancho }
  let actual = null, cfg = null, info = null, tocando = null, modelo = null, turno = 0;

  async function bajar(url, alAvance) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const total = +res.headers.get("content-length") || 0;
    let texto;
    if (res.body && total) {
      const lector = res.body.getReader(); const partes = []; let llevo = 0;
      for (;;) { const { done, value } = await lector.read(); if (done) break; partes.push(value); llevo += value.length; alAvance(llevo / total); }
      const todo = new Uint8Array(llevo); let o = 0; for (const p of partes) { todo.set(p, o); o += p.length; }
      texto = new TextDecoder().decode(todo);
    } else texto = await res.text();
    const json = JSON.parse(texto);
    const uri = json.buffers[0].uri;
    const b64 = atob(uri.slice(uri.indexOf(",") + 1));
    const bin = new Uint8Array(b64.length);
    for (let i = 0; i < b64.length; i++) bin[i] = b64.charCodeAt(i);
    delete json.buffers[0].uri;
    const jb = new TextEncoder().encode(JSON.stringify(json));
    const jl = Math.ceil(jb.length / 4) * 4, bl = Math.ceil(bin.length / 4) * 4, tot = 28 + jl + bl;
    const buf = new ArrayBuffer(tot), dv = new DataView(buf), u8 = new Uint8Array(buf);
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, tot, true);
    dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); u8.fill(0x20, 20, 20 + jl); u8.set(jb, 20);
    dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004E4942, true); u8.set(bin, 28 + jl);
    return buf;
  }

  function medir(raiz) {
    const b = new THREE.Box3(); raiz.updateMatrixWorld(true);
    raiz.traverse(o => { if (o.isSkinnedMesh) { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    const t = b.getSize(new THREE.Vector3());
    return { alto: Math.max(2, Math.min(30, t.y)), ancho: Math.max(2, Math.min(30, Math.max(t.x, t.z))) };
  }

  function soltar(m) {
    escena.remove(m.raiz);
    m.raiz.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; ms.forEach(x => { for (const k in x) if (x[k] && x[k].isTexture) x[k].dispose(); x.dispose(); }); });
  }

  async function cargarGrupo(g) {
    const url = cfg.base + info.grupos[g].archivo;
    if (cache.has(url)) return cache.get(url);
    // en el teléfono: a lo más 2 modelos en memoria
    if (cache.size >= 2) { const [k, v] = cache.entries().next().value; if (v !== modelo) { soltar(v); cache.delete(k); } }
    avisos.cargando(0);
    const buf = await bajar(url, avisos.cargando);
    const gltf = await cargador.parseAsync(buf, "");
    const raiz = gltf.scene;
    raiz.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    const mezclador = new THREE.AnimationMixer(raiz);
    const acciones = {};
    for (const clip of gltf.animations) { const a = mezclador.clipAction(clip); a.setLoop(THREE.LoopRepeat, Infinity); acciones[clip.name] = a; }
    const util = {};
    for (const [c, nombres] of Object.entries(info.grupos[g].utileria || {})) {
      util[c] = nombres.map(n => raiz.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n))).filter(Boolean);
      for (const o of util[c]) o.visible = false;
    }
    const m = { raiz, mezclador, acciones, util, luces: lucesPropias(raiz), ...medir(raiz) };
    cache.set(url, m);
    return m;
  }

  async function hollow() {
    const key = "hollow";
    if (cache.has(key)) return cache.get(key);
    const { construirHollow } = await import("./hollow.js");
    const h = construirHollow(camara);
    const m = { raiz: h.raiz, mezclador: h.mezclador, acciones: h.acciones, util: h.util, alto: 7.5, ancho: 4, hollow: true };
    cache.set(key, m);
    return m;
  }

  function grupoDe(clip) {
    for (const [g, d] of Object.entries(info.grupos || {})) if (d.clips.includes(clip)) return g;
    return null;
  }

  // ---------------- encuadre automático ----------------
  const vObjetivo = new THREE.Vector3(), vPos = new THREE.Vector3();
  let vuelo = 0;
  function encuadre(rapido) {
    if (!modelo) return;
    const b = new THREE.Box3(new THREE.Vector3(-modelo.ancho / 2, 0, -modelo.ancho / 2), new THREE.Vector3(modelo.ancho / 2, modelo.alto, modelo.ancho / 2));
    const tapan = [];                       // utilería que puede quedar entre la cámara y la criatura
    for (const o of (modelo.util[tocando] || [])) {
      o.updateMatrixWorld(true);
      o.traverse(x => {
        if (!x.isMesh) return;
        x.geometry.computeBoundingBox();
        const bx = x.geometry.boundingBox.clone().applyMatrix4(x.matrixWorld);
        const sz = bx.getSize(new THREE.Vector3());
        // fuera del encuadre: lo que está bajo el piso (el pozo) y lo plano en el piso (rayas, rejillas)
        if (bx.max.y <= 0.3 || sz.y < 0.25 || /Pozo/.test(x.name)) return;
        b.union(bx); tapan.push(x);
      });
    }
    const extra = (cfg.encuadre && cfg.encuadre[tocando]) || {};
    if (extra.caja) b.union(new THREE.Box3(new THREE.Vector3(...extra.caja[0]), new THREE.Vector3(...extra.caja[1])));
    // la criatura manda: la utilería (jugador, ratas, rejilla, muros) solo pesa a medias en el encuadre
    const bc = new THREE.Box3(new THREE.Vector3(-modelo.ancho / 2, 0, -modelo.ancho / 2), new THREE.Vector3(modelo.ancho / 2, modelo.alto, modelo.ancho / 2));
    const peso = extra.util != null ? extra.util : 0.4;
    const t = bc.getSize(new THREE.Vector3()).lerp(b.getSize(new THREE.Vector3()), peso);
    const c = bc.getCenter(new THREE.Vector3()).lerp(b.getCenter(new THREE.Vector3()), peso);
    const piso = Math.max(0, b.min.y);
    const h = Math.min(32, t.y), ancho = Math.min(40, Math.max(t.x, t.z));
    const vf = THREE.MathUtils.degToRad(camara.fov) / 2, hf = Math.atan(Math.tan(vf) * camara.aspect);
    const dist = Math.max((h * 0.72) / Math.tan(vf), (ancho * 0.72 + 2.0) / Math.tan(hf)) * (extra.lejos || 1) + ancho * 0.35;
    vObjetivo.set(c.x, Math.max(0.8, piso + h * 0.5), c.z);
    const alto = Math.max(1.4, piso + h * (extra.alto || 0.62));
    // si la utilería (un muro, el jugador, el pozo) tapa a la criatura, la cámara le da la vuelta
    const rayo = new THREE.Raycaster(), dir = new THREE.Vector3();
    let ang = extra.angulo != null ? extra.angulo : 0.62;
    // si hay un muro en escena, la cámara va del lado de la criatura (el origen), no detrás del muro
    const muros = tapan.filter(x => /Muro|Pared|Wall|Bloque/i.test(x.name) || /Muro|Pared|Wall|Bloque/i.test((x.parent && x.parent.name) || ""));
    if (extra.angulo == null && muros.length) {
      const cm = new THREE.Box3(); for (const x of muros) cm.union(new THREE.Box3().setFromObject(x));
      const mc = cm.getCenter(new THREE.Vector3());
      const n = new THREE.Vector3(-mc.x, 0, -mc.z);
      if (n.lengthSq() > 1e-3) ang = Math.atan2(n.x, n.z) + 0.45;
    }
    for (let i = 0; i < 8; i++) {
      vPos.set(c.x + Math.sin(ang) * dist, alto, c.z + Math.cos(ang) * dist);
      if (extra.angulo != null || !tapan.length) break;
      dir.copy(vObjetivo).sub(vPos); const lejos = dir.length(); dir.normalize();
      rayo.set(vPos, dir); rayo.far = lejos * 0.8;
      if (!rayo.intersectObjects(tapan, false).length) break;
      ang += Math.PI / 4;
    }
    // nunca fuera del pasillo (muros en x = ±17 y fondo en z = -24)
    vPos.x = Math.max(-15.5, Math.min(15.5, vPos.x));
    vPos.z = Math.max(-22.5, vPos.z);
    vuelo = rapido ? 1 : 0.0001;
  }

  // ---------------- mostrar y tocar ----------------
  async function mostrar(nuevo) {
    const yo = ++turno;
    cfg = nuevo; tocando = null;
    if (modelo) escena.remove(modelo.raiz);
    modelo = null; actual = null;
    try {
      info = cfg.hollow ? { grupos: {}, clips: {} } : await (await fetch(cfg.base + "anim_info.json")).json();
    } catch (e) { avisos.error("No se pudo abrir esta criatura. Revisa tu conexión y vuelve a tocarla."); return; }
    if (yo !== turno) return;
    factorLinterna = cfg.linterna || 1;
    noche(cfg.dia ? false : true);
    avisos.noche(!cfg.dia);
    await tocar(cfg.primero, yo);
  }

  async function tocar(clip, yo = turno) {
    let m;
    try {
      m = cfg.hollow ? await hollow() : await cargarGrupo(grupoDe(clip));
    } catch (e) { avisos.error("No se pudo cargar el modelo. Revisa tu conexión y vuelve a intentarlo."); return; }
    if (yo !== turno) return;
    avisos.listo();
    if (m !== modelo) {
      if (modelo) { escena.remove(modelo.raiz); Object.values(modelo.acciones).forEach(a => a.stop()); }
      modelo = m; escena.add(m.raiz); tocando = null;
    }
    const nueva = m.acciones[clip];
    if (!nueva) return;
    const vieja = tocando ? m.acciones[tocando] : null;
    nueva.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (vieja && vieja !== nueva) vieja.crossFadeTo(nueva, 0.3, false);
    tocando = clip;
    for (const lista of Object.values(m.util)) for (const o of lista) o.visible = false;
    for (const o of (m.util[clip] || [])) o.visible = true;
    avisos.clip(clip);
    encuadre(true);
    setTimeout(() => { if (tocando === clip) encuadre(true); }, 400);
  }

  // ---------------- tamaño y ciclo ----------------
  function ajustar() {
    const w = caja.clientWidth, h = caja.clientHeight;
    renderer.setSize(w, h, false); camara.aspect = w / h; camara.fov = w < h ? 48 : 40; camara.updateProjectionMatrix();
  }
  new ResizeObserver(() => { ajustar(); encuadre(true); }).observe(caja);
  ajustar();
  camara.position.set(10, 8, 22); controles.target.set(0, 5, 0);
  controles.addEventListener("start", () => { vuelo = 0; avisos.tocado(); });

  const reloj = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(caja);
  renderer.setAnimationLoop(() => {
    const dt = Math.min(reloj.getDelta(), 0.1);
    if (!visible) return;
    if (modelo) {
      modelo.mezclador.update(dt);
      for (const l of (modelo.luces || [])) l.intensity = l.userData.base * (0.82 + 0.18 * Math.sin(reloj.elapsedTime * 13 + l.id) + (Math.random() - 0.5) * 0.12);
    }
    if (vuelo > 0) {                       // la cámara vuela suave a su nuevo encuadre
      camara.position.lerp(vPos, 0.09); controles.target.lerp(vObjetivo, 0.12);
      if (camara.position.distanceTo(vPos) < 0.05) vuelo = 0;
    }
    if (visible) {
      const pa = dgeo.attributes.position.array;
      for (let i = 0; i < NP; i++) {
        pa[i * 3] += dvel[i * 3] * dt; pa[i * 3 + 1] += dvel[i * 3 + 1] * dt; pa[i * 3 + 2] += dvel[i * 3 + 2] * dt;
        if (pa[i * 3 + 1] > 20) pa[i * 3 + 1] = 0; if (pa[i * 3 + 1] < 0) pa[i * 3 + 1] = 20;
        if (pa[i * 3] > 15) pa[i * 3] = -15; if (pa[i * 3] < -15) pa[i * 3] = 15;
        if (pa[i * 3 + 2] > 22) pa[i * 3 + 2] = -22; if (pa[i * 3 + 2] < -22) pa[i * 3 + 2] = 22;
      }
      dgeo.attributes.position.needsUpdate = true;
      for (const j of jirones) { j.position.x += j.userData.v * dt; if (j.position.x > 14) j.position.x = -14; if (j.position.x < -14) j.position.x = 14; j.position.y = 0.7 + Math.sin(reloj.elapsedTime * 0.3 + j.userData.fase) * 0.25; }
    }
    if (esNoche) for (const t of tubos) t.material.emissiveIntensity = Math.random() < 0.04 ? 0.6 : 0.08;
    controles.update();
    renderer.render(escena, camara);
  });

  return {
    mostrar, tocar: (c) => tocar(c), noche,
    girar(si) { controles.autoRotate = si; },
    get noche_() { return esNoche; },
  };
}
