// The Hollow para el visor (no tiene esqueleto de Blender): se arma aquí, como en el juego (FantasmaClient).
//  - La Silueta de la Cinta: una persona alta (7 studs) hecha solo de líneas horizontales de barrido. Un esqueleto
//    de cápsulas camina y cada cuadro se corta a alturas fijas; cada corte se dibuja a lo ancho de la cámara, así
//    las líneas siempre se ven horizontales. Con bandas que se corren a tirones, huecos y estática.
//  - La Copia Mal Grabada: un R15 (la copia de un jugador) que camina tieso; franjas que se corren de lado,
//    un doble cian corrido y la cara de estática. Al alumbrarla 2.5 s se deshace.
// Devuelve { raiz, acciones, mezclador, util } con la misma forma que usa visor.js para los modelos de Blender.
import * as THREE from "three";

const ALTO = 7, LINEAS = 48;

// Acción hecha a mano con la forma de AnimationAction que usa el visor
class Accion {
  constructor(nombre, dur, fn, loop = true) { this.nombre = nombre; this.dur = dur; this.fn = fn; this.loop = loop; this.time = 0; this.escala = 1; this.activa = false; }
  getClip() { return { duration: this.dur, name: this.nombre }; }
  reset() { this.time = 0; return this; }
  setEffectiveTimeScale(e) { this.escala = e; return this; }
  setEffectiveWeight() { return this; }
  play() { this.activa = true; return this; }
  stop() { this.activa = false; return this; }
  crossFadeTo() { this.activa = false; return this; }
}

export function construirHollow(camara) {
  const raiz = new THREE.Group();
  raiz.name = "Hollow";

  // ---------------- Silueta ----------------
  const silueta = new THREE.Group();
  silueta.name = "Silueta";
  raiz.add(silueta);
  const MAX_SEG = LINEAS * 8;
  const pos = new Float32Array(MAX_SEG * 2 * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const lineas = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc9cfc6, transparent: true, opacity: 0.92 }));
  lineas.frustumCulled = false;
  silueta.add(lineas);
  // halo de estática: puntitos alrededor
  const nPuntos = 160;
  const ppos = new Float32Array(nPuntos * 3);
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute("position", new THREE.BufferAttribute(ppos, 3));
  const puntos = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0xe6ebe2, size: 0.06, transparent: true, opacity: 0.8 }));
  puntos.frustumCulled = false;
  silueta.add(puntos);

  // esqueleto de cápsulas (de un humano alto y flaco): [nombre, padre, largo, radio]
  const huesos = {};
  const H = (n, padre, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); (padre ? huesos[padre] : silueta).add(o); huesos[n] = o; return o; };
  H("cadera", null, 0, 3.45, 0);
  H("pecho", "cadera", 0, 0.05, 0);
  H("cuello", "pecho", 0, 2.25, 0);
  H("cabeza", "cuello", 0, 0.42, 0);
  for (const s of [-1, 1]) {
    const L = s < 0 ? "I" : "D";
    H("hombro" + L, "pecho", 0.62 * s, 2.0, 0);
    H("codo" + L, "hombro" + L, 0, -1.35, 0);
    H("muslo" + L, "cadera", 0.32 * s, -0.05, 0);
    H("rodilla" + L, "muslo" + L, 0, -1.7, 0);
  }
  // cápsulas: [hueso, punta (local), radio]
  const capsulas = [
    ["cadera", [0, 0.35, 0], 0.48], ["pecho", [0, 2.0, 0], 0.62], ["pecho", [0, 1.1, 0], 0.55], ["cuello", [0, 0.42, 0], 0.16],
    ["cabeza", [0, 0.72, 0.05], 0.38],
  ];
  for (const L of ["I", "D"]) {
    capsulas.push(["hombro" + L, [0, -1.35, 0], 0.16], ["codo" + L, [0, -1.5, 0], 0.13],
      ["muslo" + L, [0, -1.7, 0], 0.22], ["rodilla" + L, [0, -1.72, 0], 0.17]);
  }
  const A = new THREE.Vector3(), B = new THREE.Vector3(), derecha = new THREE.Vector3();

  function cortar(t, apagadas, salto) {
    silueta.updateMatrixWorld(true);
    camara.updateMatrixWorld();
    derecha.setFromMatrixColumn(camara.matrixWorld, 0);
    derecha.y = 0; derecha.normalize();
    const segs = capsulas.map(([h, p, r]) => {
      const o = huesos[h];
      A.setFromMatrixPosition(o.matrixWorld);
      B.set(p[0], p[1], p[2]).applyMatrix4(o.matrixWorld);
      return [A.clone(), B.clone(), r];
    });
    let k = 0;
    for (let i = 0; i < LINEAS; i++) {
      if (i < apagadas) continue;
      const y = (i + 0.5) * (ALTO / LINEAS);
      const banda = Math.floor(i / 6);
      const corre = (Math.sin(t * 7 + banda * 2.3) > 0.82 ? 0.35 : 0) * (banda % 2 ? 1 : -1) + salto;
      if (Math.random() < 0.04) continue;           // huecos
      for (const [a, b, r] of segs) {
        const y0 = Math.min(a.y, b.y) - r, y1 = Math.max(a.y, b.y) + r;
        if (y < y0 || y > y1 || k >= MAX_SEG) continue;
        const u = Math.abs(b.y - a.y) > 1e-3 ? THREE.MathUtils.clamp((y - a.y) / (b.y - a.y), 0, 1) : 0.5;
        const c = a.clone().lerp(b, u);
        let medio = r;
        const borde = Math.min(y - y0, y1 - y);
        if (borde < r) medio = Math.sqrt(Math.max(0, r * r - (r - borde) * (r - borde)));
        medio *= 1 + (Math.random() < 0.05 ? 0.8 : 0);   // líneas que se estiran
        const izq = c.clone().addScaledVector(derecha, -medio + corre), der = c.clone().addScaledVector(derecha, medio + corre);
        pos.set([izq.x, y, izq.z, der.x, y, der.z], k * 6);
        k++;
      }
    }
    geo.setDrawRange(0, k * 2);
    geo.attributes.position.needsUpdate = true;
    // estática alrededor
    for (let i = 0; i < nPuntos; i++) {
      const yy = Math.random() * ALTO, ang = Math.random() * Math.PI * 2, rr = 0.6 + Math.random() * 0.9;
      ppos.set([Math.cos(ang) * rr, yy, Math.sin(ang) * rr], i * 3);
    }
    pgeo.attributes.position.needsUpdate = true;
  }

  function caminar(t, ritmo, paso, inclina, tirones) {
    const f = tirones ? Math.floor(t * 8) / 8 : t;   // a tirones (stop-motion)
    const s = Math.sin(f * ritmo);
    huesos.cadera.position.y = 3.45 + Math.abs(Math.cos(f * ritmo)) * 0.08;
    huesos.pecho.rotation.x = inclina;
    huesos.cabeza.rotation.z = 0.35 + Math.sin(f * 0.9) * 0.12;    // la cabeza ladeada
    huesos.cuello.rotation.x = 0.25;
    for (const [L, sg] of [["I", 1], ["D", -1]]) {
      huesos["muslo" + L].rotation.x = s * paso * sg;
      huesos["rodilla" + L].rotation.x = Math.max(0, -s * sg) * paso * 1.2;
      huesos["hombro" + L].rotation.x = -s * paso * 0.4 * sg;
      huesos["hombro" + L].rotation.z = 0.08 * (L === "I" ? -1 : 1);
      huesos["codo" + L].rotation.x = -0.25;
    }
  }

  // ---------------- Copia ----------------
  const copia = new THREE.Group();
  copia.name = "Copia";
  raiz.add(copia);
  const piezas = {};
  const colores = { cabeza: 0xf5cd30, torso: 0x0d69ac, brazo: 0xf5cd30, pierna: 0xa4bd47 };
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const pieza = (n, padre, w, h, d, x, y, z, color) => {
    const g = new THREE.Group(); g.name = n; g.position.set(x, y, z); (padre ? piezas[padre] : copia).add(g);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); m.position.y = -h / 2; m.castShadow = true; g.add(m);
    piezas[n] = g; g.userData.malla = m; return g;
  };
  pieza("torso", null, 2.0, 2.0, 1.0, 0, 4.0, 0, colores.torso);
  pieza("cabeza", "torso", 1.15, 1.15, 1.15, 0, 0.6, 0, colores.cabeza);   // centro de la cabeza, sobre el torso
  piezas.cabeza.userData.malla.position.y = -0.0;
  for (const s of [-1, 1]) {
    pieza("brazo" + s, "torso", 0.95, 2.0, 0.95, 1.5 * s, 0, 0, colores.brazo);
    pieza("pierna" + s, "torso", 0.95, 2.0, 0.95, 0.5 * s, -2.0, 0, colores.pierna);
  }
  // posición de reposo de cada pieza: poseCopia la recupera en cada cuadro (si no, el desarme se acumula y la copia queda rota)
  const bases = {};
  for (const [k, g] of Object.entries(piezas)) bases[k] = [g.position.x, g.position.y, g.position.z];
  // cara de estática
  const lienzo = document.createElement("canvas"); lienzo.width = lienzo.height = 32;
  const lc = lienzo.getContext("2d");
  const texCara = new THREE.CanvasTexture(lienzo); texCara.magFilter = THREE.NearestFilter;
  const cara = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: texCara }));
  cara.position.set(0, 0, 0.58); piezas.cabeza.add(cara);
  // el doble cian corrido
  const doble = copia.clone(true);
  doble.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: 0x47d6e0, transparent: true, opacity: 0.22, depthWrite: false }); o.castShadow = false; } });
  doble.name = "Doble";
  raiz.add(doble);
  const piezasDoble = {};
  for (const k of Object.keys(piezas)) piezasDoble[k] = doble.getObjectByName(k);

  function poseCopia(P, t, tieso, deshace) {
    for (const [k, g] of Object.entries(P)) { const b = bases[k]; if (b) { g.position.set(b[0], b[1], b[2]); g.rotation.set(0, 0, 0); } }
    const f = Math.floor(t * 6) / 6;
    const s = Math.sin(f * 5.5);
    P.torso.position.set(0, 4.0 + Math.abs(s) * 0.05, 0);
    P.torso.rotation.set(0, 0, 0);
    P.cabeza.rotation.z = 0.32 + (Math.random() < 0.03 ? 0.4 : 0);   // ladeada, con un tirón a ratos
    for (const sg of [-1, 1]) {
      P["pierna" + sg].rotation.x = s * 0.35 * sg * tieso;   // piernas rectas
      P["brazo" + sg].rotation.x = 0;                          // brazos pegados
    }
    if (deshace > 0) {
      for (const [k, g] of Object.entries(P)) {
        const r = (k.length * 13.7) % 1;
        g.position.x += (Math.random() - 0.5) * deshace * 0.6 + Math.sin(r * 9) * deshace * 1.2;
        g.rotation.z += (r - 0.5) * deshace * 1.4;
      }
    }
  }
  function fallaCopia(t, fuerza) {
    // franjas del cuerpo que se corren de lado a tirones
    for (const g of Object.values(piezas)) {
      const m = g.userData.malla;
      m.position.x = Math.random() < 0.08 * fuerza ? (Math.random() - 0.5) * 0.8 * fuerza : 0;
    }
    doble.position.x = 0.25 + Math.random() * 0.15 * fuerza;
    // cara de estática
    const img = lc.createImageData(32, 32);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    lc.putImageData(img, 0, 0); texCara.needsUpdate = true;
  }

  // ---------------- Clips ----------------
  const util = {}, acciones = {};
  const clip = (nombre, dur, partes, fn, loop = true) => { acciones[nombre] = new Accion(nombre, dur, fn, loop); util[nombre] = partes; };
  clip("Hollow_SiluetaAcecho", 6, [silueta], (t) => { caminar(t, 2.4, 0.38, 0.12, true); cortar(t, 0, 0); });
  clip("Hollow_SiluetaCaza", 3, [silueta], (t) => { caminar(t, 6.5, 0.7, 0.32, true); cortar(t, 0, Math.random() < 0.08 ? 0.4 : 0); });
  clip("Hollow_SiluetaQuieta", 6, [silueta], (t) => { caminar(0, 0, 0, 0.05, false); huesos.cabeza.rotation.z = 0.35 + (Math.floor(t * 2) % 5 === 0 ? 0.5 : 0); cortar(t, 0, 0); });
  clip("Hollow_Aturdida", 4, [silueta], (t) => { caminar(0, 0, 0, 0.0, false); cortar(t, Math.min(LINEAS, Math.floor((t / 2.5) * LINEAS)), 0); }, false);
  clip("Hollow_Golpe", 1.6, [silueta], (t) => {
    caminar(0, 0, 0, 0.1 + Math.min(1, t / 0.5) * 0.45, false);
    const a = Math.min(1, t / 0.45);
    for (const L of ["I", "D"]) { huesos["hombro" + L].rotation.x = -a * 1.9; huesos["codo" + L].rotation.x = -0.1; }
    cortar(t, 0, t > 0.4 && t < 0.7 ? 0.5 : 0);
  }, false);
  clip("Hollow_Copia", 4, [copia, doble], (t) => {
    poseCopia(piezas, t, 1, 0); poseCopia(piezasDoble, t, 1, 0); fallaCopia(t, 1);
  });
  clip("Hollow_CopiaFalla", 4, [copia, doble], (t) => {
    poseCopia(piezas, t, 1, 0); poseCopia(piezasDoble, t, 1, 0); fallaCopia(t, 3);
  });
  clip("Hollow_Deshace", 3.2, [copia, doble, silueta], (t) => {
    const d = Math.min(1, Math.max(0, (t - 0.6) / 1.8));
    poseCopia(piezas, 0, 0, d * 3); poseCopia(piezasDoble, 0, 0, d * 3); fallaCopia(t, 3 + d * 4);
    copia.visible = d < 0.95; doble.visible = d < 0.95;
    caminar(0, 0, 0, 0.05, false); cortar(t, Math.floor((1 - d) * LINEAS), 0);
  }, false);

  const mezclador = {
    update(dt) {
      for (const a of Object.values(acciones)) {
        if (!a.activa) continue;
        a.time += dt * a.escala;
        if (a.time > a.dur) a.time = a.loop ? a.time % a.dur : a.time % a.dur;   // en el visor todo se repite
        a.fn(a.time);
      }
    },
  };
  silueta.visible = copia.visible = doble.visible = false;
  return { raiz, acciones, mezclador, util };
}
