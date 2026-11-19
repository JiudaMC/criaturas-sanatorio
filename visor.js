// Visor 3D en vivo de una criatura (mismo motor que "Expediente 317"): el modelo con su rig y sus animaciones de
// la Fase 4, botones por clip, cámaras, noche VHS, cámara lenta, R15 y puerta del juego, y la ficha del clip.
// Página única: exporta iniciar(CFG, base). base es la carpeta de la criatura ("the-vermin/"); de ahí lee
// anim_info.json y los modelos. Devuelve destruir(), que apaga el ciclo y suelta el contexto WebGL.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// three.js lee las texturas con fetch(blob:) si hay createImageBitmap, y el artefacto lo bloquea.
try { window.createImageBitmap = undefined; } catch (e) {}

export function iniciar(CFG, base) {
let vivo = true;
const $ = (id) => document.getElementById(id);
const visor = $("vv-visor"), aviso = $("vv-aviso"), etiqueta = $("vv-etiqueta"), marcaViva = $("vv-marca");
const barra = $("vv-barra"), barraAvance = $("vv-avance");

const GRUPOS_CLIP = CFG.grupos ? CFG.grupos.map(([t, r]) => [t, new RegExp(r)]) : [
  ["Quieto y acecho", /^(Quieto|Reposo|Acecho\w*|Busca|CabezaGiro|TechoQuieto|PreparaEspera|AcechoQuieto)$/],
  ["Cazar y moverse", /^(Caza\w*|Carga|Prepara|Embiste|TechoAvanza|Trepa\w*|AlTecho|Cae|Esquina\w*|Relevo\w*|ACaza|DeCaza)$/],
  ["Ataques", /^(Zarpazo\w*|Remate\w*|Cornada|TrampaTecho|Despliega)$/],
  ["Puertas", /^(Agachada|Forcejeo|PuertaRota|Puerta)$/],
  ["Cáscaras", /Cascara/],
  ["Poses", /.*/],
];
const corto = (n) => n.replace(CFG.quitar ? new RegExp(CFG.quitar) : /^[A-Za-z]+_/, "");
const bonito = (n) => (CFG.nombres && CFG.nombres[n]) || corto(n).replace(/_/g, " ").replace(/([a-záéíóú])([A-Z])/g, "$1 $2");
const ideaDe = (n) => {
  const t = CFG.ideas && CFG.ideas[n];
  if (t) return t;
  const d = info.clips[n];
  return d && d.nota ? d.nota : "";
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  aviso.textContent = "Este navegador no pudo abrir el visor 3D (WebGL). Abajo están los videos.";
  return () => {};
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
visor.prepend(renderer.domElement);

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
escena.add(camara);
const controles = new OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
controles.dampingFactor = 0.08;
controles.minDistance = 2;
controles.maxDistance = 80;
controles.maxPolarAngle = Math.PI * 0.495;
controles.autoRotateSpeed = 1.2;

const cielo = new THREE.HemisphereLight(0xd3dae2, 0x3b362d, 1.15);
const sol = new THREE.DirectionalLight(0xfff1e0, 2.3);
sol.position.set(12, 24, 16);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 22, bottom: -6, near: 1, far: 80 });
sol.shadow.bias = -0.0004;
escena.add(cielo, sol);
const linterna = new THREE.SpotLight(0xffe0b0, 0, 120, 0.5, 0.65, 1.1);
linterna.castShadow = true;
linterna.shadow.mapSize.set(1024, 1024);
linterna.position.set(0.5, -0.4, 0);
camara.add(linterna);
linterna.target.position.set(0, 0, -10);
camara.add(linterna.target);

const tela = document.createElement("canvas");
tela.width = tela.height = 64;
const tc = tela.getContext("2d");
tc.fillStyle = "#5b5e61"; tc.fillRect(0, 0, 64, 64);
tc.fillStyle = "#4a4d50"; tc.fillRect(0, 0, 32, 32); tc.fillRect(32, 32, 32, 32);
const texPiso = new THREE.CanvasTexture(tela);
texPiso.wrapS = texPiso.wrapT = THREE.RepeatWrapping;
texPiso.repeat.set(40, 40);
texPiso.colorSpace = THREE.SRGBColorSpace;
texPiso.magFilter = THREE.NearestFilter;
texPiso.anisotropy = renderer.capabilities.getMaxAnisotropy();
const piso = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ map: texPiso, roughness: 0.95 }));
piso.rotation.x = -Math.PI / 2;
piso.receiveShadow = true;
escena.add(piso);

// R15 (5.2 studs) y la puerta del juego (8 × 9)
const refs = new THREE.Group();
const r15 = new THREE.Group();
const gris = new THREE.MeshStandardMaterial({ color: 0xa3a2a5, roughness: 0.6 });
const caja = (x, y, z, w, h, d, m = gris) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; r15.add(b); return b;
};
caja(0, 4.62, 0, 1.15, 1.15, 1.15);
caja(0, 3.22, 0, 2.0, 1.55, 1.0);
caja(0, 2.22, 0, 2.0, 0.4, 1.0);
for (const s of [-1, 1]) {
  caja(1.5 * s, 3.55, 0, 0.95, 0.85, 0.95); caja(1.5 * s, 2.7, 0, 0.95, 0.8, 0.95); caja(1.5 * s, 2.15, 0, 0.95, 0.28, 0.95);
  caja(0.5 * s, 1.55, 0, 0.95, 0.85, 0.95); caja(0.5 * s, 0.7, 0, 0.95, 0.8, 0.95); caja(0.5 * s, 0.14, 0.05, 0.95, 0.28, 1.05);
}
const ojo = new THREE.MeshStandardMaterial({ color: 0x222222 });
caja(-0.22, 4.75, 0.58, 0.14, 0.2, 0.02, ojo); caja(0.22, 4.75, 0.58, 0.14, 0.2, 0.02, ojo);
const puerta = new THREE.Group();
const madera = new THREE.MeshStandardMaterial({ color: 0x3e2f24, roughness: 0.85 });
for (const [x, y, w, h] of [[-4.25, 4.75, 0.5, 9.5], [4.25, 4.75, 0.5, 9.5], [0, 9.25, 9.0, 0.5]]) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), madera);
  b.position.set(x, y, 0); b.castShadow = true; puerta.add(b);
}
refs.add(r15, puerta);
escena.add(refs);

// glTF en JSON con los datos en base64: se arma el GLB en memoria (la página no puede pedir enlaces data:)
async function abrirModelo(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  const uri = json.buffers[0].uri;
  const texto = atob(uri.slice(uri.indexOf(",") + 1));
  const bin = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) bin[i] = texto.charCodeAt(i);
  delete json.buffers[0].uri;
  const jb = new TextEncoder().encode(JSON.stringify(json));
  const jl = Math.ceil(jb.length / 4) * 4, bl = Math.ceil(bin.length / 4) * 4;
  const total = 12 + 8 + jl + 8 + bl;
  const buf = new ArrayBuffer(total);
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true);
  u8.fill(0x20, 20, 20 + jl); u8.set(jb, 20);
  dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004E4942, true);
  u8.set(bin, 28 + jl);
  return buf;
}

const cargador = new GLTFLoader();
window.__visor = { get modelos() { return modelos; }, camara, controles };
const modelos = {};
let info = { grupos: {}, clips: {} };
let actual = null, camActual = "tres", lento = false;

function marcar(sel, elegido) {
  document.querySelectorAll(sel).forEach(b => b.setAttribute("aria-pressed", String(b === elegido)));
}

function llenarFicha(nombre) {
  const d = info.clips[nombre] || {};
  $("vv-nombre").textContent = bonito(nombre);
  $("vv-idea").textContent = ideaDe(nombre);
  const cuadros = d.cuadros;
  const seg = d.segundos != null ? d.segundos : (cuadros || 0) / 30;
  $("vv-medidas").innerHTML =
    `<div class="vv-medida"><b>${cuadros ?? "—"}</b><span>cuadros (30 por segundo)</span></div>` +
    `<div class="vv-medida"><b>${seg ? seg.toFixed(1) + " s" : "—"}</b><span>${d.loop ? "en bucle" : (cuadros ? "una vez" : "pose")}</span></div>` +
    `<div class="vv-medida"><b>${d.prioridad ?? "—"}</b><span>prioridad en Roblox</span></div>` +
    `<div class="vv-medida"><b>${d.velocidad ? d.velocidad + " studs/s" : "—"}</b><span>velocidad de diseño</span></div>`;
  const marcas = (d.marcas || []).map(([f, n, v]) => `${n}${v ? " " + v : ""} (${f})`);
  $("vv-marcas").textContent = marcas.length ? marcas.join(" · ") : "Sin marcas (no suena).";
  const m = actual && modelos[actual];
  const util = (m && m.utilNombres[nombre]) || [];
  $("vv-escena").textContent = util.length ? enEscena(util) : "Nada más: la criatura sola (con el R15 y la puerta de referencia si los prendes).";
  barra.querySelectorAll("b").forEach(x => x.remove());
  for (const [f] of (d.marcas || [])) {
    const t = document.createElement("b");
    t.style.left = (100 * f / Math.max(1, cuadros || 1)) + "%";
    barra.appendChild(t);
  }
}

// Qué utilería hay en escena, dicho en palabras (de los nombres de los objetos de Blender)
function enEscena(nombres) {
  const hay = new Set();
  for (const n of nombres) {
    if (/Rejilla|Pozo/.test(n)) hay.add("la rejilla del piso");
    else if (/Ducto/.test(n)) hay.add("el ducto de lámina");
    else if (/Rata\d/.test(n)) hay.add("las ratas sueltas");
    else if (/Puerta|Hoja|Dintel|Marco(Izq|Der)/.test(n)) hay.add("la puerta que se abre o se rompe");
    if (/R15|Jugador/.test(n)) hay.add("el jugador (R15)");
    if (/Muro/.test(n)) hay.add("el muro");
    if (/Techo/.test(n) && !/Ducto/.test(n)) hay.add("el techo");
    if (/Cascara/.test(n)) hay.add("la cáscara");
    if (/Marca/.test(n)) hay.add("la marca del golpe");
    if (/Bloque/.test(n)) hay.add("la esquina");
    if (/Raya/.test(n)) hay.add("las rayas del piso que dicen cuánto avanza");
    if (/Azulejo|Franja/.test(n)) hay.add("la pared y el techo de azulejo");
    if (n === "Silueta") hay.add("la Silueta de la Cinta (sus líneas)");
    if (n === "Copia") hay.add("la copia mal grabada de un jugador");
    if (n === "Doble") hay.add("su doble cian corrido");
  }
  return [...hay].join(" · ") || nombres.slice(0, 3).join(", ");
}

function botonesClips(g) {
  const cajaClips = $("vv-clips");
  cajaClips.innerHTML = '<div class="vv-titulo">Animación</div>';
  const clips = (modelos[g] && Object.keys(modelos[g].acciones)) || [];
  const orden = CFG.orden || [];
  clips.sort((a, b) => {
    const ia = orden.indexOf(a), ib = orden.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
  });
  const usados = new Set();
  for (const [titulo, re] of GRUPOS_CLIP) {
    const mios = clips.filter(n => !usados.has(n) && re.test(corto(n)));
    if (!mios.length) continue;
    const grupo = document.createElement("div");
    grupo.className = "vv-grupo";
    grupo.innerHTML = `<small>${titulo}</small>`;
    const fila = document.createElement("div");
    fila.className = "vv-fila";
    for (const n of mios) {
      usados.add(n);
      const b = document.createElement("button");
      b.className = "vv-boton vv-clip";
      b.type = "button";
      b.dataset.clip = n;
      b.textContent = bonito(n);
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => tocar(n));
      fila.appendChild(b);
    }
    grupo.appendChild(fila);
    cajaClips.appendChild(grupo);
  }
}

// Lo que hay que encuadrar: la criatura y, si el clip tiene utilería (puerta, muro, techo, jugador), también eso
function cajaDe(m) {
  const caja3 = new THREE.Box3(new THREE.Vector3(-m.ancho / 2, 0, -m.ancho / 2), new THREE.Vector3(m.ancho / 2, m.alto, m.ancho / 2));
  const util = (m.tocando && m.util[m.tocando]) || [];
  for (const o of util) {
    o.updateMatrixWorld(true);
    o.traverse(x => {
      if (x.isMesh) {
        x.geometry.computeBoundingBox();
        caja3.union(x.geometry.boundingBox.clone().applyMatrix4(x.matrixWorld));
      }
    });
  }
  return caja3;
}

function encuadre(tipo) {
  if (!actual) return;
  const m = modelos[actual];
  const caja3 = cajaDe(m);
  const t = caja3.getSize(new THREE.Vector3()), c = caja3.getCenter(new THREE.Vector3());
  const h = Math.min(30, t.y), ancho = Math.min(40, Math.max(t.x, t.z));
  const vf = THREE.MathUtils.degToRad(camara.fov) / 2;
  const hf = Math.atan(Math.tan(vf) * camara.aspect);
  const dist = Math.max((h * 0.6) / Math.tan(vf), (ancho * 0.5 + 2.2) / Math.tan(hf)) + ancho * 0.35;
  const objetivo = new THREE.Vector3(c.x, caja3.min.y + h * 0.48, c.z);
  let pos;
  if (tipo === "frente") pos = new THREE.Vector3(c.x, h * 0.5, c.z + dist);
  else if (tipo === "lado") pos = new THREE.Vector3(c.x + dist, h * 0.5, c.z);
  else if (tipo === "jugador") { pos = new THREE.Vector3(2.0, 4.6, Math.max(9, m.ancho * 1.25)); objetivo.set(0, m.alto * 0.62, 0); }
  else pos = new THREE.Vector3(c.x + dist * 0.62, h * 0.62, c.z + dist * 0.82);
  // Si hay un muro en escena, la cámara se pone del lado de la acción (no detrás del muro)
  if (tipo !== "jugador") {
    const muros = ((m.tocando && m.util[m.tocando]) || []).filter(o => /Muro|Pared/.test(o.name));
    if (muros.length) {
      const cm = new THREE.Box3();
      for (const o of muros) o.traverse(x => { if (x.isMesh) { x.geometry.computeBoundingBox(); cm.union(x.geometry.boundingBox.clone().applyMatrix4(x.matrixWorld)); } });
      const mc = cm.getCenter(new THREE.Vector3());
      // el lado del muro donde está la criatura (el origen)
      const n = new THREE.Vector3(-mc.x, 0, -mc.z);
      if (n.lengthSq() > 1e-4) {
        n.normalize();
        const off = pos.clone().sub(mc); off.y = 0;
        const d = off.dot(n);
        if (d < 0) pos.addScaledVector(n, -2 * d);
      }
    }
  }
  camara.position.copy(pos);
  controles.target.copy(objetivo);
  controles.update();
}

function tocar(nombre) {
  if (!actual) return;
  const m = modelos[actual];
  const nueva = m.acciones[nombre];
  if (!nueva) return;
  const vieja = m.tocando ? m.acciones[m.tocando] : null;
  const conUtil = (n) => !!(n && m.util[n] && m.util[n].length);
  const nombresDe = (n) => ((n && m.utilNombres && m.utilNombres[n]) || []).join("|");
  const reencuadrar = (conUtil(nombre) || conUtil(m.tocando)) && nombresDe(nombre) !== nombresDe(m.tocando);
  nueva.reset().setEffectiveTimeScale(lento ? 0.5 : 1).setEffectiveWeight(1).play();
  if (vieja && vieja !== nueva) vieja.crossFadeTo(nueva, 0.25, false);
  m.tocando = nombre;
  for (const nodos of Object.values(m.util)) for (const o of nodos) o.visible = false;
  for (const o of (m.util[nombre] || [])) o.visible = true;
  refs.visible = verRefs && !(m.util[nombre] && m.util[nombre].length);
  marcar("[data-clip]", document.querySelector(`[data-clip="${CSS.escape(nombre)}"]`));
  etiqueta.textContent = bonito(nombre) + (lento ? " · ½×" : "");
  llenarFicha(nombre);
  m.ultimoT = 0;
  // (después de que la animación ya puso la utilería en su lugar: dos cuadros)
  // (se vuelve a encuadrar cuando termina el fundido de 0.25 s: antes, la utilería todavía no está en su lugar)
  if (reencuadrar) { encuadre(camActual); setTimeout(() => { if (m.tocando === nombre) encuadre(camActual); }, 380); }
}

function medir(raiz) {
  const caja3 = new THREE.Box3();
  raiz.updateMatrixWorld(true);
  raiz.traverse(o => {
    if (o.isMesh && o.isSkinnedMesh) {
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      caja3.union(b);
    }
  });
  const t = caja3.getSize(new THREE.Vector3());
  return { alto: Math.max(2, Math.min(30, t.y)), ancho: Math.max(2, Math.min(30, Math.max(t.x, t.z))) };
}

async function mostrar(g) {
  if (actual && modelos[actual]) escena.remove(modelos[actual].raiz);
  actual = g;
  document.querySelectorAll(".vv-pestana").forEach(b => b.setAttribute("aria-selected", String(b.dataset.g === g)));
  if (CFG.procedural === "hollow" && !modelos[g]) {
    const { construirHollow } = await import("./hollow.js");
    if (!vivo) return;
    const h = construirHollow(camara);
    const utilNombres = {};
    for (const [c, nodos] of Object.entries(h.util)) utilNombres[c] = nodos.map(o => o.name);
    modelos[g] = { raiz: h.raiz, mezclador: h.mezclador, acciones: h.acciones, util: h.util, utilNombres, tocando: null,
      alto: 7.5, ancho: 4, ultimoT: 0 };
  }
  const grupo = info.grupos[g] || (modelos[g] ? {} : null);
  if (!grupo) { aviso.hidden = false; aviso.textContent = "Todavía no hay animaciones de esta parte."; $("vv-clips").innerHTML = ""; return; }
  if (!modelos[g]) {
    aviso.hidden = false;
    aviso.textContent = "Abriendo el expediente…";
    try {
      const buf = await abrirModelo(base + grupo.archivo);
      if (!vivo) return;
      const gltf = await cargador.parseAsync(buf, "");
      if (!vivo) return;
      const raiz = gltf.scene;
      raiz.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
      const mezclador = new THREE.AnimationMixer(raiz);
      const acciones = {};
      for (const clip of gltf.animations) acciones[clip.name] = mezclador.clipAction(clip);
      const util = {}, utilNombres = grupo.utileria || {};
      for (const [c, nombres] of Object.entries(utilNombres)) {
        util[c] = nombres.map(n => raiz.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n))).filter(Boolean);
        for (const o of util[c]) o.visible = false;
      }
      // medir solo a la criatura (sin la utilería)
      const dim = (CFG.medidas && CFG.medidas[g]) || medir(raiz);
      modelos[g] = { raiz, mezclador, acciones, util, utilNombres, tocando: null, alto: dim.alto, ancho: dim.ancho, ultimoT: 0 };
    } catch (e) {
      aviso.textContent = "No se pudo abrir el modelo. Recarga la página. (" + (e && e.message ? e.message : e) + ")";
      return;
    }
  }
  if (!vivo || actual !== g) return;
  const m = modelos[g];
  escena.add(m.raiz);
  aviso.hidden = true;
  r15.position.set(m.ancho / 2 + 2.2, 0, 1.5);
  puerta.position.set(m.ancho / 2 + 9.5, 0, -0.5);
  botonesClips(g);
  const nombres = Object.keys(m.acciones);
  const primero = (CFG.primero && nombres.find(n => n === CFG.primero)) || nombres.find(n => /Acecho$|Quieto$|Reposo$|AcechoGorila$/.test(n)) || nombres[0];
  Object.values(m.acciones).forEach(a => a.stop());
  m.tocando = null;
  tocar(primero);
  encuadre(camActual);
}

// Noche con filtro VHS
const ruido = $("vv-ruido");
const rc = ruido.getContext("2d");
const img = rc.createImageData(ruido.width, ruido.height);
let noche = false;
function pintarRuido() {
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) { const v = Math.random() * 255; px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255; }
  rc.putImageData(img, 0, 0);
}
function ponerNoche(si) {
  noche = si;
  visor.classList.toggle("noche", si);
  $("vv-vhs").hidden = !si;
  $("vv-rec").hidden = !si;
  $("vv-reloj").hidden = !si;
  escena.background = new THREE.Color(si ? 0x050606 : 0x3b3f44);
  escena.fog = si ? new THREE.FogExp2(0x050606, 0.03) : null;
  cielo.intensity = si ? 0.07 : 1.15;
  sol.intensity = si ? 0.0 : 2.3;
  linterna.intensity = si ? 700 : 0;
  renderer.toneMappingExposure = si ? 1.15 : 1.0;
  if (si) pintarRuido();
}

document.querySelectorAll(".vv-pestana").forEach(b => b.addEventListener("click", () => mostrar(b.dataset.g)));
document.querySelectorAll("[data-cam]").forEach(b => b.addEventListener("click", () => {
  marcar("[data-cam]", b); camActual = b.dataset.cam; encuadre(camActual);
}));
const alternar = (id, fn) => {
  const b = $(id);
  b.addEventListener("click", () => { const si = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(si)); fn(si); });
};
alternar("vv-noche", ponerNoche);
// Cámara con falla (glitch): la imagen se rasga en franjas, se corre de color y a ratos salta, como la cinta
const glitch = $("vv-glitch");
const gc = glitch.getContext("2d");
let conGlitch = !!CFG.glitch, rafaga = 0, proxRafaga = 1.5;
glitch.hidden = !conGlitch;
if (conGlitch) $("vv-falla").setAttribute("aria-pressed", "true");
alternar("vv-falla", si => { conGlitch = si; glitch.hidden = !si; });
function pintarGlitch(dt) {
  const src = renderer.domElement;
  if (glitch.width !== src.width || glitch.height !== src.height) { glitch.width = src.width; glitch.height = src.height; }
  const w = glitch.width, h = glitch.height;
  proxRafaga -= dt;
  if (proxRafaga <= 0) { rafaga = 0.18 + Math.random() * 0.35; proxRafaga = 1.2 + Math.random() * 2.8; }
  if (rafaga > 0) rafaga -= dt;
  const fuerte = rafaga > 0;
  const salto = fuerte && Math.random() < 0.3 ? Math.floor((Math.random() - 0.5) * h * 0.12) : 0;
  gc.globalCompositeOperation = "source-over";
  gc.globalAlpha = 1;
  gc.drawImage(src, 0, salto);
  if (salto) gc.drawImage(src, 0, salto > 0 ? salto - h : salto + h);
  const franjas = fuerte ? 7 + Math.floor(Math.random() * 8) : (Math.random() < 0.35 ? 1 : 0);
  for (let i = 0; i < franjas; i++) {
    const y = Math.floor(Math.random() * h), alto = Math.floor(2 + Math.random() * (fuerte ? h * 0.07 : h * 0.02));
    const dx = Math.floor((Math.random() - 0.5) * w * (fuerte ? 0.12 : 0.03));
    gc.drawImage(src, 0, y, w, alto, dx, y, w, alto);
  }
  // colores corridos: una copia encima, desplazada, en modo "pantalla"
  gc.globalCompositeOperation = "screen";
  gc.globalAlpha = fuerte ? 0.35 : 0.12;
  const corr = Math.floor(w * (fuerte ? 0.012 : 0.004));
  gc.drawImage(src, corr, 0);
  gc.globalAlpha = 1;
  gc.globalCompositeOperation = "source-over";
  // bloques de estática
  if (fuerte) {
    for (let i = 0; i < 6; i++) {
      const bx = Math.random() * w, by = Math.random() * h, bw = 20 + Math.random() * w * 0.25, bh = 2 + Math.random() * 10;
      gc.fillStyle = Math.random() < 0.5 ? "rgba(235,235,225,0.55)" : "rgba(0,0,0,0.6)";
      gc.fillRect(bx, by, bw, bh);
    }
  }
}
alternar("vv-lento", si => {
  lento = si;
  if (actual && modelos[actual] && modelos[actual].tocando) {
    modelos[actual].acciones[modelos[actual].tocando].setEffectiveTimeScale(si ? 0.5 : 1);
    etiqueta.textContent = etiqueta.textContent.replace(" · ½×", "") + (si ? " · ½×" : "");
  }
});
let verRefs = true;
alternar("vv-escala", si => {
  verRefs = si;
  const m = actual && modelos[actual];
  refs.visible = si && !(m && m.tocando && m.util[m.tocando] && m.util[m.tocando].length);
});
alternar("vv-girar", si => { controles.autoRotate = si; });
controles.addEventListener("start", () => { $("vv-pista").hidden = true; });

function ajustar() {
  const w = visor.clientWidth, h = visor.clientHeight;
  renderer.setSize(w, h, false);
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
}
const observador = new ResizeObserver(ajustar);
observador.observe(visor);
ajustar();

const reloj = new THREE.Clock();
const textoReloj = $("vv-reloj");
const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let cuadro = 0, segundos = 0, apagaMarca = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(reloj.getDelta(), 0.1);
  if (actual && modelos[actual]) {
    const m = modelos[actual];
    m.mezclador.update(dt);
    if (m.tocando) {
      const a = m.acciones[m.tocando];
      const dur = a.getClip().duration || 1;
      const t = a.time % dur;
      barraAvance.style.width = (100 * t / dur) + "%";
      const d = info.clips[m.tocando];
      if (d && d.marcas) {
        for (const [f, n, v] of d.marcas) {
          const tm = f / 30;
          const cruzo = m.ultimoT <= t ? (tm > m.ultimoT && tm <= t) : (tm > m.ultimoT || tm <= t);
          if (cruzo) { marcaViva.textContent = n + (v ? " " + v : ""); marcaViva.classList.add("si"); apagaMarca = 0.45; }
        }
      }
      m.ultimoT = t;
    }
  }
  if (apagaMarca > 0) { apagaMarca -= dt; if (apagaMarca <= 0) marcaViva.classList.remove("si"); }
  controles.update();
  renderer.render(escena, camara);
  if (conGlitch) pintarGlitch(dt);
  if (noche) {
    cuadro++;
    if (!quieto && cuadro % 3 === 0) pintarRuido();
    segundos += dt;
    const s = 11820 + Math.floor(segundos);
    textoReloj.textContent = `OCT 14 1987 · ${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }
});

ponerNoche(false);
(async () => {
  try {
    const res = await fetch(base + "anim_info.json");
    if (res.ok) info = await res.json();
  } catch (e) { /* sin info: se ve igual, sin marcas */ }
  info.clips = info.clips || {};
  if (vivo) mostrar(CFG.pestanas[0].g);
})();

return function destruir() {
  vivo = false;
  renderer.setAnimationLoop(null);
  observador.disconnect();
  escena.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; ms.forEach(m => { for (const k in m) { if (m[k] && m[k].isTexture) m[k].dispose(); } m.dispose(); }); });
  for (const m of Object.values(modelos)) m.raiz.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
};
}

