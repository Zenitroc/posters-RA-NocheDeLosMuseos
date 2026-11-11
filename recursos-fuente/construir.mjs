/**
 * Construye las capas Canvas de AgroLink, Arbiter, INFRABOT y VictoriaX y, si se pide, renderiza
 * fotogramas de prueba o el MP4 de respaldo (H.264 por WebCodecs en Chromium + mp4-muxer).
 *
 *   node recursos-fuente/construir.mjs capa    [slug...]            → public/posters/<slug>/capa.js
 *   node recursos-fuente/construir.mjs stills  <slug> t1 t2 ...     → PNG póster+capa y sólo capa (en --out)
 *   node recursos-fuente/construir.mjs video   [slug...]            → public/posters/<slug>/animacion.mp4
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
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { poster: { type: 'string' }, out: { type: 'string', default: join(RAIZ, 'salida/stills') } },
});
const [modo, ...resto] = positionals;

/** Recortes del póster (sprites.json: nombre → [x, y, w, h, izq, arr, der, aba] en coords de diseño 990×1400). */
async function recortes(slug) {
  const archivo = join(FUENTE, slug, 'sprites.json');
  if (!existsSync(archivo)) return {};
  const defs = JSON.parse(readFileSync(archivo, 'utf8'));
  const poster = readFileSync(rutaPoster(slug)).toString('base64');
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage();
    return await pagina.evaluate(async ({ defs, poster }) => {
      const img = new Image(); img.src = 'data:image/jpeg;base64,' + poster; await img.decode();
      const k = img.naturalWidth / 990, out = {};
      for (const [nombre, [x, y, w, h, ...feather]] of Object.entries(defs)) {
        const pw = Math.round(w * k), ph = Math.round(h * k);
        const c = document.createElement('canvas'); c.width = pw; c.height = ph;
        c.getContext('2d').drawImage(img, x * k, y * k, w * k, h * k, 0, 0, pw, ph);
        out[nombre] = { x, y, w, h, pw, ph, feather: feather.length ? feather : [0, 0, 0, 0], src: c.toDataURL('image/jpeg', 0.9) };
      }
      return out;
    }, { defs, poster });
  } finally {
    await navegador.close();
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
    `global.${global} = { WIDTH: W, HEIGHT: H, DURATION: DUR, load, render };\n` +
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
} else if (modo === 'stills') {
  const [slug, ...tiempos] = resto;
  mkdirSync(values.out, { recursive: true });
  await conPagina(slug, async pagina => {
    for (const t of tiempos.map(Number)) {
      for (const soloCapa of [false, true]) {
        const b64 = await pagina.evaluate(({ t, soloCapa }) => {
          const c = document.createElement('canvas'); c.width = 1131; c.height = 1600;
          const x = c.getContext('2d');
          if (!soloCapa) x.drawImage(window.__img, 0, 0, 1131, 1600);
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
    const base64 = await conPagina(slug, async pagina => {
      await pagina.addScriptTag({ content: muxerJs });
      return pagina.evaluate(async () => {
        const FPS = 30, W = 1132, H = 1600, dur = window.__anim.DURATION, n = Math.round(FPS * dur);
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d');
        const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H }, fastStart: 'in-memory' });
        let error = null;
        const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { error = e; } });
        enc.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 5_000_000, framerate: FPS, latencyMode: 'quality' });
        for (let i = 0; i < n; i++) {
          x.clearRect(0, 0, W, H);
          x.drawImage(window.__img, 0, 0, W, H);
          x.save(); x.scale(W / 1131, 1); window.__anim.render(x, i / FPS); x.restore();
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
  console.error('Uso: node recursos-fuente/construir.mjs capa|stills|video [slug...]');
  process.exit(1);
}
