/**
 * Construye las capas Canvas de los pósters (ver PROYECTOS) y, si se pide, renderiza
 * fotogramas de prueba o el MP4 de respaldo (H.264 por WebCodecs en Chromium + mp4-muxer).
 *
 *   node recursos-fuente/construir.mjs capa    [slug...]            → public/posters/<slug>/capa.js
 *   node recursos-fuente/construir.mjs stills  <slug> t1 t2 ...     → PNG póster+capa y sólo capa (en --out)
 *   node recursos-fuente/construir.mjs video   [slug...]            → public/posters/<slug>/animacion.mp4
 *   node recursos-fuente/construir.mjs sprites <slug>               → PNG de cada recorte (en --out), para revisarlos
 *
 * Opciones: --poster <ruta> (póster a usar, sólo con un slug)   --out <dir> (stills, por defecto ./salida/stills)
 * Requisitos: `npm ci` (Playwright + Chromium) y, para video, mp4-muxer (devDependency).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FUENTE = join(RAIZ, 'recursos-fuente');
const PROYECTOS = {
  agrolink: { global: 'AgroLinkAnim' },
  arbiter: { global: 'ArbiterAnim' },
  infrabot: { global: 'InfrabotAnim' },
  victoriax: { global: 'VictoriaXAnim' },
  drhero: { global: 'DrHeroAnim' },
  pretriage: { global: 'PreTriageAnim' },
  adaliza: { global: 'AdalizaAnim' },
  ceci: { global: 'CeciAnim' },
  // Los MP4 de AssistVet, Learn To Lead, EnerScope y VigIA salen de videos de IA (assistvet/componer-video.py
  // y _comun/componer-video-ia.py), no de la capa: `video` no los pisa.
  assistvet: { global: 'AssistVetAnim', videoPropio: true },
  'learn-to-lead': { global: 'LearnToLeadAnim', videoPropio: true },
  enerscope: { global: 'EnerScopeAnim', videoPropio: true }, // póster 2:3 (1066×1600): diseño 990×1486
  vialis: { global: 'VialisAnim' },
  aeroinspect: { global: 'AeroInspectAnim' },
  hydropilot: { global: 'HydroPilotAnim' },
  syntaxlearn: { global: 'SyntaxLearnAnim' },
  drino: { global: 'DrinoAnim' },
  vigia: { global: 'VigIAAnim', videoPropio: true },
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { poster: { type: 'string' }, out: { type: 'string', default: join(RAIZ, 'salida/stills') } },
});
const [modo, ...resto] = positionals;

/**
 * Recortes del póster (sprites.json, coords de diseño: 990 de ancho y el alto proporcional al póster,
 * 1400 para los 1131×1600). Cada entrada es:
 *   [x, y, w, h, izq, arr, der, aba]                         → rectángulo con bordes difuminados
 * o un objeto con:
 *   r: [x, y, w, h]          rectángulo del recorte
 *   pluma: [izq, arr, der, aba]  difuminado de bordes del rectángulo (al cargar)
 *   zona: [[x, y], ...]      silueta (polígono). Sin `auto`, es la máscara del recorte.
 *   auto: umbral (0..255)    máscara automática: lo que NO es fondo claro conectado al borde (∩ zona)
 *         o { claro, colores: [[r,g,b]...], tol }: además cuentan como fondo los colores dados (± tol)
 *   huecos: [forma, ...]     se restan de la máscara (forma = polígono [[x,y],...] o círculo [x, y, r])
 *   dilatar, suavizar        crecimiento y desenfoque de la máscara (unidades de diseño)
 *   limpiar: [forma, ...]    zonas que se rellenan con el entorno (inpainting) antes de recortar
 *   limpiarSprite: nombre    rellena la máscara de otro recorte (placa limpia detrás de algo que se mueve)
 *   margen                   crecimiento extra de esa máscara al limpiar (por defecto 3)
 *   ignorar: [forma, ...]    zonas que NO se usan como fuente al limpiar (p. ej. un pie blanco junto al hueco)
 *   soloMascara: true        no se publica (sólo sirve de máscara para limpiarSprite o para sus sombras)
 *   sombras: true            genera además <nombre>Hueco (sombra interior del hueco que deja en el papel
 *                            al salir) y <nombre>Sombra (sombra proyectada al "levantarse" del papel)
 */
async function recortes(slug) {
  const archivo = join(FUENTE, slug, 'sprites.json');
  if (!existsSync(archivo)) return {};
  const defs = JSON.parse(readFileSync(archivo, 'utf8'));
  const poster = readFileSync(rutaPoster(slug)).toString('base64');
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage();
    return await pagina.evaluate(procesarRecortes, { defs, poster });
  } finally {
    await navegador.close();
  }
}

/** Corre dentro de Chromium: recorta, enmascara y limpia (push-pull) los sprites. */
async function procesarRecortes({ defs, poster }) {
  const img = new Image(); img.src = 'data:image/jpeg;base64,' + poster; await img.decode();
  const IW = img.naturalWidth, IH = img.naturalHeight, k = IW / 990;
  const base = document.createElement('canvas'); base.width = IW; base.height = IH;
  const bctx = base.getContext('2d'); bctx.drawImage(img, 0, 0);
  const pix = bctx.getImageData(0, 0, IW, IH).data;
  const norm = d => (Array.isArray(d) ? { r: d.slice(0, 4), pluma: d.length > 4 ? d.slice(4) : null } : d);

  /** Rasteriza formas (coords de diseño) en una máscara Float32 de la imagen completa. */
  function rasterizar(formas, valor = 1, sobre) {
    const c = document.createElement('canvas'); c.width = IW; c.height = IH;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.scale(k, k);
    for (const f of formas) {
      x.beginPath();
      if (typeof f[0] === 'number') x.arc(f[0], f[1], f[2], 0, Math.PI * 2);
      else f.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
      x.closePath(); x.fill();
    }
    const d = x.getImageData(0, 0, IW, IH).data, m = sobre ?? new Float32Array(IW * IH);
    for (let i = 0; i < m.length; i++) if (d[i * 4 + 3] > 127) m[i] = valor;
    return m;
  }
  /** Máximo (dilatar) separable de radio r px. */
  function dilatar(m, r) {
    r = Math.round(r); if (r <= 0) return m;
    const t = new Float32Array(m.length), o = new Float32Array(m.length);
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
      let v = 0; for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < IW) v = Math.max(v, m[y * IW + xx]); }
      t[y * IW + x] = v;
    }
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
      let v = 0; for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < IH) v = Math.max(v, t[yy * IW + x]); }
      o[y * IW + x] = v;
    }
    return o;
  }
  /** Desenfoque gaussiano de la máscara (vía canvas). */
  function desenfocar(m, r) {
    if (r <= 0) return m;
    const c = document.createElement('canvas'); c.width = IW; c.height = IH;
    const x = c.getContext('2d'), id = x.createImageData(IW, IH);
    for (let i = 0; i < m.length; i++) { id.data[i * 4 + 3] = Math.round(m[i] * 255); }
    x.putImageData(id, 0, 0);
    const c2 = document.createElement('canvas'); c2.width = IW; c2.height = IH;
    const x2 = c2.getContext('2d'); x2.filter = `blur(${r}px)`; x2.drawImage(c, 0, 0);
    const d = x2.getImageData(0, 0, IW, IH).data, o = new Float32Array(m.length);
    for (let i = 0; i < o.length; i++) o[i] = d[i * 4 + 3] / 255;
    return o;
  }
  /** Máscara (0..1, imagen completa) de un recorte. */
  function mascara(d) {
    if (!d.zona && d.auto == null) return null;
    const [rx, ry, rw, rh] = d.r.map(v => v * k);
    const x0 = Math.max(0, Math.floor(rx)), y0 = Math.max(0, Math.floor(ry));
    const x1 = Math.min(IW, Math.ceil(rx + rw)), y1 = Math.min(IH, Math.ceil(ry + rh));
    const zona = d.zona ? rasterizar([d.zona]) : null;
    let m = new Float32Array(IW * IH);
    if (d.auto != null) {
      // Fondo = píxeles claros conectados al borde del rectángulo (o a lo que queda fuera de la zona)
      const a = typeof d.auto === 'number' ? { claro: d.auto, colores: [], tol: 0 } : { claro: 256, colores: [], tol: 30, ...d.auto };
      const fondo = new Uint8Array(IW * IH), cola = [];
      const claro = i => {
        const r = pix[i * 4], g = pix[i * 4 + 1], b = pix[i * 4 + 2];
        if (Math.min(r, g, b) >= a.claro) return true;
        for (const c of a.colores) if (Math.hypot(r - c[0], g - c[1], b - c[2]) <= a.tol) return true;
        return false;
      };
      const sembrar = (x, y) => { const i = y * IW + x; if (!fondo[i] && (claro(i) || (zona && !zona[i]))) { fondo[i] = 1; cola.push(i); } };
      for (let x = x0; x < x1; x++) { sembrar(x, y0); sembrar(x, y1 - 1); }
      for (let y = y0; y < y1; y++) { sembrar(x0, y); sembrar(x1 - 1, y); }
      while (cola.length) {
        const i = cola.pop(), x = i % IW, y = (i / IW) | 0;
        if (x > x0) sembrar(x - 1, y); if (x < x1 - 1) sembrar(x + 1, y);
        if (y > y0) sembrar(x, y - 1); if (y < y1 - 1) sembrar(x, y + 1);
      }
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * IW + x; m[i] = !fondo[i] && (!zona || zona[i]) ? 1 : 0; }
    } else m = zona;
    if (d.huecos) rasterizar(d.huecos, 0, m);
    m = dilatar(m, (d.dilatar ?? (d.auto != null ? 1.5 : 0)) * k);
    if (d.huecos) rasterizar(d.huecos, 0, m);
    return desenfocar(m, (d.suavizar ?? 1) * k);
  }
  /** Inpainting push-pull: rellena `hueco` (>0) con el entorno, dentro de un rectángulo con margen. */
  function limpiar(rgba, hueco, [rx, ry, rw, rh], ignorar) {
    const mg = 40 * k;
    const x0 = Math.max(0, Math.floor(rx - mg)), y0 = Math.max(0, Math.floor(ry - mg));
    const w = Math.min(IW, Math.ceil(rx + rw + mg)) - x0, h = Math.min(IH, Math.ceil(ry + rh + mg)) - y0;
    let niveles = [];
    let W = w, H = h, val = new Float32Array(W * H * 3), pes = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y0 + y) * IW + x0 + x, j = y * W + x;
      if (hueco[i] > 0.001 || (ignorar && ignorar[i])) continue;
      pes[j] = 1; val[j * 3] = rgba[i * 4]; val[j * 3 + 1] = rgba[i * 4 + 1]; val[j * 3 + 2] = rgba[i * 4 + 2];
    }
    niveles.push({ W, H, val, pes });
    while (W > 2 || H > 2) {
      const W2 = Math.ceil(W / 2), H2 = Math.ceil(H / 2), v2 = new Float32Array(W2 * H2 * 3), p2 = new Float32Array(W2 * H2);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const j = y * W + x, j2 = (y >> 1) * W2 + (x >> 1), p = pes[j];
        if (!p) continue;
        p2[j2] += p; v2[j2 * 3] += val[j * 3] * p; v2[j2 * 3 + 1] += val[j * 3 + 1] * p; v2[j2 * 3 + 2] += val[j * 3 + 2] * p;
      }
      for (let j = 0; j < W2 * H2; j++) if (p2[j]) { v2[j * 3] /= p2[j]; v2[j * 3 + 1] /= p2[j]; v2[j * 3 + 2] /= p2[j]; p2[j] = Math.min(1, p2[j]); }
      W = W2; H = H2; val = v2; pes = p2; niveles.push({ W, H, val, pes });
    }
    for (let n = niveles.length - 2; n >= 0; n--) {
      const f = niveles[n], c = niveles[n + 1];
      for (let y = 0; y < f.H; y++) for (let x = 0; x < f.W; x++) {
        const j = y * f.W + x, p = f.pes[j];
        if (p >= 1) continue;
        // bilineal del nivel grueso
        const cx = Math.min(c.W - 1, Math.max(0, (x - 0.5) / 2)), cy = Math.min(c.H - 1, Math.max(0, (y - 0.5) / 2));
        const ix = Math.floor(cx), iy = Math.floor(cy), fx = cx - ix, fy = cy - iy, ix1 = Math.min(c.W - 1, ix + 1), iy1 = Math.min(c.H - 1, iy + 1);
        for (let ch = 0; ch < 3; ch++) {
          const a = c.val[(iy * c.W + ix) * 3 + ch], b = c.val[(iy * c.W + ix1) * 3 + ch], cc = c.val[(iy1 * c.W + ix) * 3 + ch], d = c.val[(iy1 * c.W + ix1) * 3 + ch];
          const up = (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy;
          f.val[j * 3 + ch] = f.val[j * 3 + ch] * p + up * (1 - p);
        }
        f.pes[j] = 1;
      }
    }
    const f = niveles[0];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y0 + y) * IW + x0 + x, j = y * w + x, a = Math.min(1, hueco[i] * 1.5);
      if (a <= 0) continue;
      for (let ch = 0; ch < 3; ch++) rgba[i * 4 + ch] = Math.round(rgba[i * 4 + ch] * (1 - a) + f.val[j * 3 + ch] * a);
    }
  }

  const ds = Object.fromEntries(Object.entries(defs).map(([n, d]) => [n, norm(d)]));
  const mascaras = {};
  for (const [n, d] of Object.entries(ds)) mascaras[n] = mascara(d);
  const out = {};
  for (const [nombre, d] of Object.entries(ds)) {
    const [x, y, w, h] = d.r;
    let fuente = img;
    const huecos = [];
    let alfaHueco = null; // placa limpia sin máscara propia: sólo se dibuja donde se borró algo
    if (d.limpiar) huecos.push(desenfocar(dilatar(rasterizar(d.limpiar), 1 * k), 1 * k));
    if (d.limpiarSprite) {
      const m = mascaras[d.limpiarSprite];
      if (!m) throw new Error(`limpiarSprite: ${d.limpiarSprite} no tiene máscara`);
      const b = new Float32Array(m.length); for (let i = 0; i < m.length; i++) b[i] = m[i] > 0.02 ? 1 : 0;
      huecos.push(desenfocar(dilatar(b, (d.margen ?? 3) * k), 1 * k));
    }
    if (huecos.length) {
      const rgba = new Uint8ClampedArray(pix);
      const hueco = new Float32Array(IW * IH);
      for (const hm of huecos) for (let i = 0; i < hueco.length; i++) hueco[i] = Math.max(hueco[i], hm[i]);
      limpiar(rgba, hueco, d.r.map(v => v * k), d.ignorar ? rasterizar(d.ignorar) : null);
      if (!mascaras[nombre]) {
        const b = new Float32Array(hueco.length); for (let i = 0; i < b.length; i++) b[i] = hueco[i] > 0.001 ? 1 : 0;
        alfaHueco = desenfocar(dilatar(b, 2 * k), 1 * k);
      }
      const c = document.createElement('canvas'); c.width = IW; c.height = IH;
      c.getContext('2d').putImageData(new ImageData(rgba, IW, IH), 0, 0);
      fuente = c;
    }
    // Las placas limpias son difusas por naturaleza: a media resolución pesan 4 veces menos.
    const res = alfaHueco ? 0.5 : 1;
    const pw = Math.round(w * k * res), ph = Math.round(h * k * res);
    const c = document.createElement('canvas'); c.width = pw; c.height = ph;
    const cx = c.getContext('2d');
    cx.drawImage(fuente, x * k, y * k, w * k, h * k, 0, 0, pw, ph);
    const m = mascaras[nombre] ?? alfaHueco;
    if (m) {
      const id = cx.getImageData(0, 0, pw, ph), sx = (w * k) / pw, sy = (h * k) / ph;
      for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
        const gx = Math.min(IW - 1, Math.max(0, Math.floor(x * k + i * sx))), gy = Math.min(IH - 1, Math.max(0, Math.floor(y * k + j * sy)));
        id.data[(j * pw + i) * 4 + 3] = Math.round(m[gy * IW + gx] * 255);
      }
      cx.putImageData(id, 0, 0);
    }
    out[nombre] = { x, y, w, h, pw, ph, feather: d.pluma ?? [0, 0, 0, 0], src: m ? c.toDataURL('image/webp', 0.88) : c.toDataURL('image/jpeg', 0.9) };
    if (d.sombras && mascaras[nombre]) Object.assign(out, sombrasDe(nombre, d.r, mascaras[nombre]));
    if (d.soloMascara) delete out[nombre];
  }
  return out;

  /** Imagen (PNG) de un color con el alfa dado, recortada a un rectángulo de diseño. */
  function imagenAlfa([x, y, w, h], alfa, [r, g, b], res = 0.5) {
    const pw = Math.round(w * k * res), ph = Math.round(h * k * res);
    const c = document.createElement('canvas'); c.width = pw; c.height = ph;
    const cx = c.getContext('2d'), id = cx.createImageData(pw, ph);
    for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
      const gx = Math.floor((x + (i / pw) * w) * k), gy = Math.floor((y + (j / ph) * h) * k), o = (j * pw + i) * 4;
      const a = gx >= 0 && gy >= 0 && gx < IW && gy < IH ? alfa(gy * IW + gx) : 0;
      id.data[o] = r; id.data[o + 1] = g; id.data[o + 2] = b; id.data[o + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
    cx.putImageData(id, 0, 0);
    return { x, y, w, h, pw, ph, feather: [0, 0, 0, 0], src: c.toDataURL('image/webp', 0.85) };
  }

  /** Hueco (sombra interior, más marcada arriba, como un recorte en el papel) y sombra proyectada. */
  function sombrasDe(nombre, r, m) {
    const corrida = new Float32Array(m.length), dy = Math.round(6 * k);
    for (let y = dy; y < IH; y++) for (let x = 0; x < IW; x++) corrida[y * IW + x] = m[(y - dy) * IW + x];
    const borde = desenfocar(corrida, 9 * k);
    const sombra = desenfocar(m, 8 * k);
    const p = 30, rs = [r[0] - p, r[1] - p, r[2] + 2 * p, r[3] + 2 * p];
    return {
      [nombre + 'Hueco']: imagenAlfa(r, (i) => m[i] * (0.28 + (1 - borde[i]) * 1.6), [12, 14, 22]),
      [nombre + 'Sombra']: imagenAlfa(rs, (i) => sombra[i] * 0.6, [0, 0, 0]),
    };
  }
}

async function codigoCapa(slug) {
  const { global } = PROYECTOS[slug];
  const sprites = await recortes(slug);
  const comun = readFileSync(join(FUENTE, '_comun/efectos.js'), 'utf8');
  const propio = readFileSync(join(FUENTE, slug, 'animacion.js'), 'utf8');
  return (
    `/* ${slug} · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */\n` +
    `(function (global) {\n'use strict';\n${comun}\nconst SPRITES_SRC = ${JSON.stringify(sprites)};\n${propio}\n` +
    `const _M = typeof MARGEN !== 'undefined' ? MARGEN : 0;\n` +
    `global.${global} = { WIDTH: W * (1 + 2 * _M), HEIGHT: H * (1 + 2 * _M), MARGIN: _M, DURATION: DUR, load, render };\n` +
    `})(typeof window !== 'undefined' ? window : globalThis);\n`
  );
}

const rutaPoster = slug => values.poster ?? join(RAIZ, 'public/posters', slug, 'poster.jpg');

async function conPagina(slug, fn) {
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1132, height: 1600 } });
    // Origen http://localhost para tener contexto seguro (WebCodecs)
    await pagina.route('**/*', r => r.fulfill({ body: '<!doctype html><html><body style="margin:0"></body></html>', contentType: 'text/html' }));
    await pagina.goto('http://localhost:9999/');
    const poster = readFileSync(rutaPoster(slug)).toString('base64');
    await pagina.addScriptTag({ content: await codigoCapa(slug) });
    await pagina.evaluate(async ({ g, poster }) => {
      const img = new Image(); img.src = 'data:image/jpeg;base64,' + poster; await img.decode();
      window.__img = img; window.__anim = window[g]; await window.__anim.load();
    }, { g: PROYECTOS[slug].global, poster });
    return await fn(pagina);
  } finally {
    await navegador.close();
  }
}

if (modo === 'capa') {
  for (const slug of resto.length ? resto : Object.keys(PROYECTOS)) {
    const destino = join(RAIZ, 'public/posters', slug);
    mkdirSync(destino, { recursive: true });
    writeFileSync(join(destino, 'capa.js'), await codigoCapa(slug));
    console.log(`capa ${slug} → public/posters/${slug}/capa.js`);
  }
} else if (modo === 'sprites') {
  const [slug] = resto;
  mkdirSync(values.out, { recursive: true });
  for (const [n, d] of Object.entries(await recortes(slug))) {
    writeFileSync(join(values.out, `${slug}-sprite-${n}.png`), Buffer.from(d.src.split(',')[1], 'base64'));
  }
  console.log('sprites en', values.out);
} else if (modo === 'stills') {
  const [slug, ...tiempos] = resto;
  mkdirSync(values.out, { recursive: true });
  await conPagina(slug, async pagina => {
    for (const t of tiempos.map(Number)) {
      for (const soloCapa of [false, true]) {
        const b64 = await pagina.evaluate(({ t, soloCapa }) => {
          // Con margen se ve también "la pared" alrededor del póster (lo que sale del papel).
          // El tamaño del póster sale de la capa (W×H de su animacion.js, sin el margen).
          const m = window.__anim.MARGIN || 0;
          const PW = Math.round(window.__anim.WIDTH / (1 + 2 * m)), PH = Math.round(window.__anim.HEIGHT / (1 + 2 * m));
          const mx = Math.round(PW * m), my = Math.round(PH * m);
          const c = document.createElement('canvas'); c.width = PW + 2 * mx; c.height = PH + 2 * my;
          const x = c.getContext('2d');
          if (!soloCapa) { x.fillStyle = '#6f7178'; x.fillRect(0, 0, c.width, c.height); x.drawImage(window.__img, mx, my, PW, PH); }
          window.__anim.render(x, t);
          return c.toDataURL('image/png').split(',')[1];
        }, { t, soloCapa });
        writeFileSync(join(values.out, `${slug}-${soloCapa ? 'capa' : 'poster'}-${t.toFixed(2)}.png`), Buffer.from(b64, 'base64'));
      }
    }
  });
  console.log('stills en', values.out);
} else if (modo === 'video') {
  const muxerJs = readFileSync(join(RAIZ, 'node_modules/mp4-muxer/build/mp4-muxer.js'), 'utf8');
  for (const slug of resto.length ? resto : Object.keys(PROYECTOS)) {
    if (PROYECTOS[slug].videoPropio) {
      console.log(`video ${slug}: se omite (su animacion.mp4 sale de un video de IA; ver el README)`);
      continue;
    }
    const base64 = await conPagina(slug, async pagina => {
      await pagina.addScriptTag({ content: muxerJs });
      return pagina.evaluate(async () => {
        // H.264 pide lados pares: 1131×1600 → 1132×1600.
        const m = window.__anim.MARGIN || 0;
        const PW = Math.round(window.__anim.WIDTH / (1 + 2 * m)), PH = Math.round(window.__anim.HEIGHT / (1 + 2 * m));
        const FPS = 30, W = PW + (PW % 2), H = PH + (PH % 2), dur = window.__anim.DURATION, n = Math.round(FPS * dur);
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d');
        const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H }, fastStart: 'in-memory' });
        let error = null;
        const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { error = e; } });
        enc.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 5_000_000, framerate: FPS, latencyMode: 'quality' });
        for (let i = 0; i < n; i++) {
          x.clearRect(0, 0, W, H);
          x.drawImage(window.__img, 0, 0, W, H);
          // El MP4 (respaldo) cubre sólo el póster: lo que sale del papel queda fuera de cuadro.
          x.save(); x.scale(W / PW, H / PH); x.translate(-PW * m, -PH * m); window.__anim.render(x, i / FPS); x.restore();
          const f = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
          enc.encode(f, { keyFrame: i % 30 === 0 }); f.close();
          if (enc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 5));
          if (error) throw error;
        }
        await enc.flush(); muxer.finalize();
        const buf = new Uint8Array(muxer.target.buffer);
        let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        return btoa(s);
      });
    });
    const destino = join(RAIZ, 'public/posters', slug);
    mkdirSync(destino, { recursive: true });
    writeFileSync(join(destino, 'animacion.mp4'), Buffer.from(base64, 'base64'));
    console.log(`video ${slug} → public/posters/${slug}/animacion.mp4`);
  }
} else {
  console.error('Uso: node recursos-fuente/construir.mjs capa|stills|video|sprites [slug...]');
  process.exit(1);
}
