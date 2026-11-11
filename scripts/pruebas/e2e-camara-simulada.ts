/**
 * Prueba de punta a punta del build de producción en navegadores reales
 * (Playwright), con una CÁMARA SIMULADA que filma el póster.
 *
 *   npm run build && npm run test:e2e [-- --proyecto zonar] [-- --sin-webkit] [-- --visible]
 *
 * Qué valida (Chromium):
 *   - El catálogo no descarga videos, capas, targets ni el motor de RA.
 *   - Flujo QR → página → "Activar cámara" (modo configurado) → detección real
 *     con MindAR → cerrar libera cámara, WebGL y animación.
 *   - Cada formato disponible (capa Canvas / video MP4), forzado con ?modo=:
 *     inicia al detectar, pausa al perder, retoma al recuperar, "Repetir".
 *   - Alineación: esquinas del plano proyectado vs. posición real del póster.
 *   - Respaldo: si la capa no carga, o falla en pleno uso, se usa el MP4.
 *   - Rendimiento con la CPU limitada 4× (aprox. celular de gama media):
 *     costo de dibujar la capa y cuadros por segundo, Canvas vs. video.
 *   - Fugas: abrir/cerrar varias veces no deja cámaras, lienzos, scripts
 *     duplicados ni crecimiento de memoria significativo.
 *   - Permiso denegado → mensaje, alternativa sin RA y reintento.
 *   - Vista previa (capa y video) y QR de /recursos legible.
 * WebKit (motor de Safari, en escritorio): las páginas cargan sin errores.
 *
 * LIMITACIÓN: es una simulación (WebGL por software, cámara sintética). No
 * reemplaza la prueba con teléfonos reales (docs/PRUEBAS-EN-DISPOSITIVOS.md).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createCanvas, loadImage } from 'canvas';
import * as moduloJsQR from 'jsqr';
import { chromium, webkit, type Browser, type BrowserContext, type Page } from 'playwright';
import type { TipoAnimacion } from '../../src/proyectos/modelo.ts';
import { DIR_POSTERS, RAIZ, gris, negrita, rojo, salirConError, verde } from '../lib/cli.ts';
import { escanearProyectos } from '../lib/escaner.ts';
import { CAMARA, POSE_FIJA, esquinasCamara, generarCamaraSimulada } from './camara-simulada.ts';

const { values } = parseArgs({
  options: {
    proyecto: { type: 'string', default: 'zonar' },
    'sin-webkit': { type: 'boolean', default: false },
    visible: { type: 'boolean', default: false },
    puerto: { type: 'string', default: '4180' },
  },
});

// jsqr es CommonJS: según el cargador, la función queda en .default o en el módulo.
const jsQR = ((moduloJsQR as unknown as { default?: unknown }).default ?? moduloJsQR) as (datos: Uint8ClampedArray, ancho: number, alto: number) => { data: string } | null;

const SALIDA = join(RAIZ, 'salida/e2e');
const BASE = `http://localhost:${values.puerto}`;
const VIEWPORT = { width: 390, height: 844 };
const NOMBRE: Record<TipoAnimacion, string> = { canvas: 'Capa Canvas', video: 'Video MP4' };

const resultados: { nombre: string; ok: boolean; detalle?: string }[] = [];
async function prueba(nombre: string, fn: () => Promise<string | void>) {
  const inicio = Date.now();
  try {
    const detalle = await fn();
    resultados.push({ nombre, ok: true, detalle: detalle || undefined });
    console.log(`${verde('✔')} ${nombre} ${gris(`(${((Date.now() - inicio) / 1000).toFixed(1)} s)`)}${detalle ? gris(` — ${detalle}`) : ''}`);
  } catch (e) {
    resultados.push({ nombre, ok: false, detalle: (e as Error).message });
    console.log(`${rojo('✖')} ${nombre}\n   ${rojo((e as Error).message.split('\n').join('\n   '))}`);
  }
}

function afirmar(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

async function textoEstado(page: Page) {
  return (await page.locator('.ra-estado').textContent({ timeout: 1000 }).catch(() => '')) ?? '';
}

async function esperarEstado(page: Page, patron: RegExp, ms: number) {
  const limite = Date.now() + ms;
  let ultimo = '';
  while (Date.now() < limite) {
    ultimo = await textoEstado(page);
    if (patron.test(ultimo)) return;
    const error = await page.locator('[role=alertdialog] h2').textContent({ timeout: 200 }).catch(() => null);
    if (error) throw new Error(`Error en pantalla: "${error}"`);
    await page.waitForTimeout(150);
  }
  throw new Error(`No apareció ${patron} en ${ms / 1000} s (último estado: "${ultimo}")`);
}

/** Registra los MediaStream que pide la página para verificar que se liberen. */
const SCRIPT_STREAMS = () => {
  const w = window as unknown as { __streams: MediaStream[]; __denegar?: boolean };
  w.__streams = [];
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) return;
  const original = md.getUserMedia.bind(md);
  md.getUserMedia = async (c?: MediaStreamConstraints) => {
    if (w.__denegar) throw new DOMException('Permiso denegado (simulado)', 'NotAllowedError');
    const s = await original(c);
    w.__streams.push(s);
    return s;
  };
};

async function camarasAbiertas(page: Page) {
  return page.evaluate(() =>
    (window as unknown as { __streams: MediaStream[] }).__streams.flatMap((s) => s.getTracks()).filter((t) => t.readyState !== 'ended').length,
  );
}

interface InfoAnimacion {
  tipo: TipoAnimacion;
  tiempo: number;
  pausado: boolean;
  stats?: { cuadros: number; msPromedio: number; msMaximo: number; anchoTextura: number; altoTextura: number };
}
async function infoAnimacion(page: Page): Promise<InfoAnimacion | null> {
  return page.evaluate(() => {
    const a = (window as unknown as { __animacionRA?: { tipo: 'canvas' | 'video'; tiempo: number; pausado: boolean; estadisticas?: () => InfoAnimacion['stats'] } }).__animacionRA;
    return a ? { tipo: a.tipo, tiempo: a.tiempo, pausado: a.pausado, stats: a.estadisticas?.() } : null;
  });
}

async function iniciarServidor(): Promise<ChildProcess> {
  const vite = join(RAIZ, 'node_modules/vite/bin/vite.js');
  const proc = spawn(process.execPath, [vite, 'preview', '--port', values.puerto, '--strictPort'], { cwd: RAIZ, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return proc;
    } catch {
      /* todavía no */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill();
  throw new Error('No arrancó vite preview');
}

async function main() {
  if (!existsSync(join(RAIZ, 'dist/index.html'))) salirConError('Falta el build: ejecutá "npm run build" primero.');
  const proyecto = escanearProyectos({ dirPosters: DIR_POSTERS }).proyectos.find((p) => p.slug === values.proyecto);
  if (!proyecto) salirConError(`No existe el proyecto "${values.proyecto}".`);
  if (!proyecto.estado.listoParaRA) salirConError(`"${proyecto.slug}" no tiene todos los recursos (faltan: ${proyecto.estado.faltantes.join(', ')}).`);
  const slug = proyecto.slug;
  const formatos = proyecto.estado.animaciones;
  const preferido = formatos[0];

  mkdirSync(SALIDA, { recursive: true });
  const y4m = join(SALIDA, `camara-${slug}.y4m`);
  console.log(gris(`Generando cámara simulada (${CAMARA.ancho}×${CAMARA.alto}) con el póster de ${proyecto.nombre}…`));
  const rutaPoster = resolve(DIR_POSTERS, slug, decodeURIComponent(proyecto.urls.poster!.split('/').pop()!.split('?')[0]));
  const proporcion = await generarCamaraSimulada(rutaPoster, y4m);
  console.log(gris(`Formatos de animación: ${formatos.map((f) => NOMBRE[f]).join(' → respaldo ')} (modo "${proyecto.animacion.modo}")`));

  const servidor = await iniciarServidor();
  let navegador: Browser | undefined;
  try {
    console.log(negrita('\nChromium (cámara simulada)'));
    navegador = await chromium.launch({
      headless: !values.visible,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${y4m}`,
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--autoplay-policy=no-user-gesture-required',
        '--js-flags=--expose-gc',
      ],
    });
    const nuevoContexto = async (): Promise<BrowserContext> => {
      const ctx = await navegador!.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ['camera'] });
      await ctx.addInitScript(SCRIPT_STREAMS);
      return ctx;
    };
    const conErrores = (page: Page) => {
      const errores: string[] = [];
      page.on('pageerror', (e) => errores.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
      return () => errores.filter((e) => !/WebGL|GPU stall|swiftshader|Automatic fallback|Error en la capa Canvas|Failed to load resource/i.test(e));
    };

    // ---------------------------------------------------------------- catálogo
    await prueba('El catálogo no descarga videos, capas, targets ni el motor de RA', async () => {
      const ctx = await nuevoContexto();
      const page = await ctx.newPage();
      const pedidos: string[] = [];
      page.on('request', (r) => pedidos.push(r.url()));
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: /Proyectos que cobran vida/ }).waitFor();
      const pesados = pedidos.filter((u) => /\/posters\/.*\.(mp4|mind|js)(\?|$)|mindar|ExperienciaRA/.test(u));
      await ctx.close();
      afirmar(pesados.length === 0, `Se descargó: ${pesados.join(', ')}`);
      return `${pedidos.length} pedidos, ninguno pesado`;
    });

    // ---------------------------------------------------------------- flujo QR (modo configurado)
    await prueba(`Flujo QR → ${proyecto.nombre} → cámara → detección (${NOMBRE[preferido]}) → cerrar`, async () => {
      const ctx = await nuevoContexto();
      const page = await ctx.newPage();
      const errores = conErrores(page);
      const pedidos: string[] = [];
      page.on('request', (r) => pedidos.push(new URL(r.url()).pathname));

      await page.goto(`${BASE}/p/${slug}`);
      await page.getByRole('heading', { level: 1, name: proyecto.nombre }).waitFor();
      const t0 = Date.now();
      await page.getByRole('link', { name: /Activar cámara/ }).click();
      await page.waitForURL(`**/p/${slug}/ra`);
      await esperarEstado(page, /Póster detectado/, 120_000);
      const segundos = ((Date.now() - t0) / 1000).toFixed(1);

      afirmar(pedidos.includes(`/posters/${slug}/target.mind`), 'No pidió el target.mind del proyecto');
      afirmar(!pedidos.some((p) => p.startsWith('/posters/') && !p.startsWith(`/posters/${slug}/`)), 'Pidió recursos de otro proyecto');
      const pidioCapa = pedidos.some((p) => p.startsWith(`/posters/${slug}/`) && p.endsWith('.js'));
      const pidioVideo = pedidos.some((p) => p.startsWith(`/posters/${slug}/`) && p.endsWith('.mp4'));
      if (preferido === 'canvas') {
        afirmar(pidioCapa, 'No pidió la capa Canvas');
        afirmar(!pidioVideo, 'Con la capa Canvas funcionando no debería descargar el MP4');
      } else {
        afirmar(pidioVideo, 'No pidió el video');
      }

      const cubre = await page.evaluate(() => {
        const r = document.querySelector('video.ra-camara')!.getBoundingClientRect();
        return r.left <= 0.5 && r.top <= 0.5 && r.right >= innerWidth - 0.5 && r.bottom >= innerHeight - 0.5 ? null : JSON.stringify(r);
      });
      afirmar(cubre === null, `La cámara no cubre la pantalla: ${cubre}`);
      await page.screenshot({ path: join(SALIDA, 'ra-flujo-qr.png') });

      await page.getByRole('button', { name: 'Cerrar cámara' }).click();
      await page.waitForURL(`**/p/${slug}`);
      await page.waitForTimeout(1500);
      const abiertas = await camarasAbiertas(page);
      const restos = await page.evaluate(() => document.querySelectorAll('video, canvas').length);
      await ctx.close();
      afirmar(abiertas === 0, `Quedaron ${abiertas} pistas de cámara abiertas`);
      afirmar(restos === 0, `Quedaron ${restos} elementos video/canvas`);
      const e = errores();
      afirmar(e.length === 0, `Errores en consola: ${e.join(' | ')}`);
      return `detectado a los ${segundos} s; descargó ${pidioCapa ? 'capa' : ''}${pidioCapa && pidioVideo ? ' y ' : ''}${pidioVideo ? 'MP4' : ''}`;
    });

    // ---------------------------------------------------------------- cada formato
    for (const formato of formatos) {
      await prueba(`${NOMBRE[formato]}: inicia al detectar, pausa al perder, retoma, Repetir`, async () => {
        const ctx = await nuevoContexto();
        const page = await ctx.newPage();
        const errores = conErrores(page);
        await page.goto(`${BASE}/p/${slug}/ra?modo=${formato}&depurar`);
        await esperarEstado(page, /Póster detectado/, 120_000);
        const etiqueta = (await page.locator('.ra-modo').textContent())?.trim();
        afirmar(etiqueta === NOMBRE[formato], `Formato en uso: "${etiqueta}", esperado "${NOMBRE[formato]}"`);

        const a1 = (await infoAnimacion(page))!;
        afirmar(a1.tipo === formato, `Animación ${a1.tipo}`);
        await page.waitForTimeout(1200);
        const a2 = (await infoAnimacion(page))!;
        afirmar(!a2.pausado && a2.tiempo > a1.tiempo, `La animación no avanza (${a1.tiempo.toFixed(2)} → ${a2.tiempo.toFixed(2)})`);

        const dom = await page.evaluate(() => ({
          fuentes: document.querySelectorAll('video.ra-fuente').length,
          camaras: document.querySelectorAll('video.ra-camara').length,
          lienzos: document.querySelectorAll('canvas.ra-lienzo').length,
        }));
        afirmar(dom.camaras === 1 && dom.lienzos === 1, `Instancias duplicadas: ${JSON.stringify(dom)}`);
        afirmar(dom.fuentes === (formato === 'video' ? 1 : 0), `Videos fuente: ${dom.fuentes}`);
        await page.screenshot({ path: join(SALIDA, `ra-${formato}-detectado.png`) });

        await esperarEstado(page, /Perdimos el póster/, 30_000);
        await page.waitForTimeout(300);
        const perdido1 = (await infoAnimacion(page))!;
        await page.waitForTimeout(800);
        const perdido2 = (await infoAnimacion(page))!;
        afirmar(perdido1.pausado && Math.abs(perdido2.tiempo - perdido1.tiempo) < 0.05, 'La animación no se pausó al perder el póster');

        await esperarEstado(page, /Póster detectado/, 30_000);
        await page.waitForTimeout(600);
        const retomada = (await infoAnimacion(page))!;
        afirmar(!retomada.pausado && retomada.tiempo >= perdido2.tiempo, 'La animación no se retomó al recuperar el póster');

        await page.getByRole('button', { name: /Repetir/ }).click();
        const tras = (await infoAnimacion(page))!;
        afirmar(tras.tiempo < 1, `"Repetir" no volvió al inicio (t=${tras.tiempo.toFixed(2)})`);

        const stats = (await infoAnimacion(page))!.stats;
        await page.getByRole('button', { name: 'Cerrar cámara' }).click();
        await page.waitForURL(`**/p/${slug}`);
        await page.waitForTimeout(1200);
        afirmar((await camarasAbiertas(page)) === 0, 'Quedó la cámara abierta');
        afirmar((await page.evaluate(() => document.querySelectorAll('video, canvas').length)) === 0, 'Quedaron video/canvas');
        await ctx.close();
        const e = errores();
        afirmar(e.length === 0, `Errores en consola: ${e.join(' | ')}`);
        return stats ? `textura ${stats.anchoTextura}×${stats.altoTextura}, ${stats.cuadros} cuadros dibujados` : undefined;
      });
    }

    // ---------------------------------------------------------------- alineación
    await prueba(`Alineación del plano (${NOMBRE[preferido]}) con el póster`, async () => {
      const ctx = await nuevoContexto();
      const page = await ctx.newPage();
      await page.goto(`${BASE}/p/${slug}/ra?depurar`);
      await esperarEstado(page, /Póster detectado/, 120_000);
      const camara = await page.evaluate(() => {
        const v = document.querySelector<HTMLVideoElement>('video.ra-camara')!;
        return { w: v.videoWidth, h: v.videoHeight };
      });
      const { width: cw, height: ch } = VIEWPORT;
      const k = Math.max(cw / camara.w, ch / camara.h);
      const izq = (cw - camara.w * k) / 2;
      const sup = (ch - camara.h * k) / 2;
      const escala = camara.w / CAMARA.ancho;
      const esperadas = esquinasCamara(POSE_FIJA, proporcion).map((p) => ({ x: p.x * escala * k + izq, y: p.y * escala * k + sup }));
      const anchoPantalla = Math.hypot(esperadas[1].x - esperadas[0].x, esperadas[1].y - esperadas[0].y);

      const errores: number[] = [];
      const limite = Date.now() + 20_000;
      while (Date.now() < limite) {
        const esquinas = await page.evaluate(() =>
          (window as unknown as { __sesionRA?: { esquinasEnPantalla(): { x: number; y: number }[] | null } }).__sesionRA?.esquinasEnPantalla() ?? null,
        );
        if (esquinas) {
          errores.push(esquinas.reduce((s, p, i) => s + Math.hypot(p.x - esperadas[i].x, p.y - esperadas[i].y), 0) / 4 / anchoPantalla);
        }
        await page.waitForTimeout(100);
      }
      await page.screenshot({ path: join(SALIDA, 'ra-alineacion.png') });
      await ctx.close();
      afirmar(errores.length > 10, `Pocas muestras con póster visible (${errores.length})`);
      const ordenados = [...errores].sort((a, b) => a - b);
      const buenas = ordenados.filter((e) => e < 0.05).length;
      afirmar(buenas >= 5, `Error de alineación alto: mejor ${(ordenados[0] * 100).toFixed(1)} %; ${buenas} muestras < 5 %`);
      return `error de esquinas en tramos fijos: ${(ordenados[Math.floor(buenas / 2)] * 100).toFixed(1)} % del ancho del póster (${errores.length} muestras)`;
    });

    // ---------------------------------------------------------------- respaldo
    if (formatos.includes('canvas') && formatos.includes('video')) {
      await prueba('Respaldo: si la capa Canvas no carga, se usa el MP4', async () => {
        const ctx = await nuevoContexto();
        const page = await ctx.newPage();
        await page.route(`**/posters/${slug}/*.js*`, (r) => r.fulfill({ contentType: 'text/javascript', body: '/* capa rota: no define la API */' }));
        await page.goto(`${BASE}/p/${slug}/ra?modo=canvas&depurar`);
        await esperarEstado(page, /Póster detectado/, 120_000);
        const etiqueta = (await page.locator('.ra-modo').textContent())?.trim();
        const info = await infoAnimacion(page);
        await ctx.close();
        afirmar(info?.tipo === 'video', `Se esperaba el video de respaldo, se usa ${info?.tipo}`);
        afirmar(etiqueta === 'Video MP4 (respaldo)', `Etiqueta: "${etiqueta}"`);
      });

      await prueba('Respaldo: si la capa falla en pleno uso, se reinicia con el MP4', async () => {
        const ctx = await nuevoContexto();
        const page = await ctx.newPage();
        const global = proyecto.animacion.canvas.global;
        const { ancho = 1131, alto = 1600 } = proyecto.animacion.canvas;
        await page.route(`**/posters/${slug}/*.js*`, (r) =>
          r.fulfill({
            contentType: 'text/javascript',
            body: `window.${global} = { WIDTH: ${ancho}, HEIGHT: ${alto}, DURATION: 10, load() {}, render(ctx, t) { if (t > 0.3) throw new Error('falla simulada'); } };`,
          }),
        );
        await page.goto(`${BASE}/p/${slug}/ra?modo=canvas&depurar`);
        await esperarEstado(page, /Póster detectado/, 120_000);
        // La capa falla a los 0,3 s de animación → la sesión se reinicia con el video.
        const limite = Date.now() + 60_000;
        let info = await infoAnimacion(page);
        while (Date.now() < limite && info?.tipo !== 'video') {
          await page.waitForTimeout(300);
          info = await infoAnimacion(page);
        }
        afirmar(info?.tipo === 'video', 'No se cambió al video tras la falla de la capa');
        await esperarEstado(page, /Póster detectado/, 120_000);
        const etiqueta = (await page.locator('.ra-modo').textContent())?.trim();
        afirmar((await camarasAbiertas(page)) === 1, 'Debe quedar exactamente una cámara abierta tras el reinicio');
        await ctx.close();
        afirmar(etiqueta === 'Video MP4 (respaldo)', `Etiqueta: "${etiqueta}"`);
      });
    }

    // ---------------------------------------------------------------- rendimiento
    await prueba('Rendimiento con CPU limitada 4× (aprox. gama media)', async () => {
      const medir = async (formato: TipoAnimacion) => {
        const ctx = await nuevoContexto();
        const page = await ctx.newPage();
        await page.goto(`${BASE}/p/${slug}/ra?modo=${formato}&depurar`);
        await esperarEstado(page, /Póster detectado/, 120_000);
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        // Cuadros por segundo del navegador mientras el póster está a la vista.
        const fps = await page.evaluate(
          () =>
            new Promise<number>((ok) => {
              let n = 0;
              const t0 = performance.now();
              const paso = (t: number) => {
                n++;
                if (t - t0 < 4000) requestAnimationFrame(paso);
                else ok((n * 1000) / (t - t0));
              };
              requestAnimationFrame(paso);
            }),
        );
        const info = await infoAnimacion(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        await ctx.close();
        return { fps, stats: info?.stats };
      };
      const datos: Partial<Record<TipoAnimacion, Awaited<ReturnType<typeof medir>>>> = {};
      for (const f of formatos) datos[f] = await medir(f);
      const partes = formatos.map((f) => {
        const d = datos[f]!;
        const extra = d.stats ? `, dibujo de la capa ${d.stats.msPromedio.toFixed(1)} ms prom. / ${d.stats.msMaximo.toFixed(1)} ms máx.` : '';
        return `${NOMBRE[f]}: ${d.fps.toFixed(0)} fps${extra}`;
      });
      if (datos.canvas?.stats) {
        afirmar(datos.canvas.stats.msPromedio < 12, `Dibujar la capa cuesta ${datos.canvas.stats.msPromedio.toFixed(1)} ms por cuadro (límite 12 ms)`);
      }
      if (datos.canvas && datos.video) {
        afirmar(datos.canvas.fps >= datos.video.fps * 0.7, 'La capa Canvas reduce los fps más de 30 % respecto del video');
      }
      return partes.join(' · ');
    });

    // ---------------------------------------------------------------- fugas
    await prueba(`Abrir y cerrar la RA 4 veces (${NOMBRE[preferido]}) no deja recursos ni memoria retenida`, async () => {
      const ctx = await nuevoContexto();
      const page = await ctx.newPage();
      await page.goto(`${BASE}/p/${slug}`);
      const heap = async () =>
        page.evaluate(async () => {
          const w = window as unknown as { gc?: () => void };
          for (let i = 0; i < 3; i++) {
            w.gc?.();
            await new Promise((r) => setTimeout(r, 200));
          }
          return (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0;
        });
      let heapTras1 = 0;
      for (let i = 0; i < 4; i++) {
        await page.getByRole('link', { name: /Activar cámara/ }).click();
        await esperarEstado(page, /Póster detectado/, 120_000);
        await page.waitForTimeout(800);
        await page.getByRole('button', { name: 'Cerrar cámara' }).click();
        await page.waitForURL(`**/p/${slug}`);
        await page.waitForTimeout(1200);
        if (i === 0) heapTras1 = await heap();
      }
      const heapFinal = await heap();
      const estado = await page.evaluate(() => ({
        streams: (window as unknown as { __streams: MediaStream[] }).__streams.length,
        lienzos: document.querySelectorAll('canvas').length,
        videos: document.querySelectorAll('video').length,
        scriptsCapa: document.querySelectorAll('script[data-capa]').length,
      }));
      const abiertas = await camarasAbiertas(page);
      await ctx.close();
      afirmar(estado.streams === 4, `Se esperaban 4 sesiones de cámara, hubo ${estado.streams}`);
      afirmar(abiertas === 0, `Quedaron ${abiertas} pistas abiertas`);
      afirmar(estado.lienzos === 0 && estado.videos === 0, `Quedaron elementos: ${JSON.stringify(estado)}`);
      if (preferido === 'canvas') afirmar(estado.scriptsCapa === 1, `Script de la capa insertado ${estado.scriptsCapa} veces`);
      const crecimientoMb = (heapFinal - heapTras1) / 1024 / 1024;
      afirmar(crecimientoMb < 15, `La memoria JS creció ${crecimientoMb.toFixed(1)} MB en 3 aperturas extra`);
      return `memoria JS tras la 1.ª apertura ${(heapTras1 / 1048576).toFixed(0)} MB → tras la 4.ª ${(heapFinal / 1048576).toFixed(0)} MB (${crecimientoMb >= 0 ? '+' : ''}${crecimientoMb.toFixed(1)} MB)`;
    });

    // ---------------------------------------------------------------- permisos
    await prueba('Permiso de cámara denegado → mensaje, alternativa sin RA y reintento', async () => {
      const ctx = await nuevoContexto();
      await ctx.addInitScript(() => ((window as unknown as { __denegar: boolean }).__denegar = true));
      const page = await ctx.newPage();
      await page.goto(`${BASE}/p/${slug}/ra`);
      await page.getByRole('alertdialog').getByRole('heading', { name: /No tenemos permiso/ }).waitFor({ timeout: 30_000 });
      afirmar((await camarasAbiertas(page)) === 0, 'Quedó una cámara abierta');
      await page.evaluate(() => ((window as unknown as { __denegar: boolean }).__denegar = false));
      await page.getByRole('button', { name: /Reintentar/ }).click();
      await esperarEstado(page, /Apuntá la cámara|Póster detectado|Perdimos/, 120_000);
      await page.evaluate(() => ((window as unknown as { __denegar: boolean }).__denegar = true));
      await page.goto(`${BASE}/p/${slug}/ra`);
      await page.getByRole('alertdialog').waitFor({ timeout: 30_000 });
      await page.getByRole('link', { name: /Ver animación sin RA/ }).click();
      await page.waitForURL(`**/p/${slug}/video`);
      await page.getByText(/Modo sin realidad aumentada/).waitFor();
      const media = await page.locator('video, canvas').first().evaluate((e) => e.tagName);
      await page.screenshot({ path: join(SALIDA, 'vista-sin-ra.png') });
      await ctx.close();
      return `vista sin RA con <${media.toLowerCase()}>`;
    });

    // ---------------------------------------------------------------- vista previa y QR
    await prueba('Vista previa: capa y video se reproducen; la capa es transparente', async () => {
      const ctx = await nuevoContexto();
      const page = await ctx.newPage();
      const errores = conErrores(page);
      await page.goto(`${BASE}/recursos/vista-previa/${slug}`);
      await page.getByRole('heading', { name: `Vista previa: ${proyecto.nombre}` }).waitFor();
      await page.waitForTimeout(3000);
      const r = await page.evaluate(() => {
        const lienzos = [...document.querySelectorAll<HTMLCanvasElement>('canvas.capa-poster__lienzo')];
        const analizar = (c: HTMLCanvasElement) => {
          const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
          let transparentes = 0;
          for (let i = 3; i < d.length; i += 4) if (d[i] === 0) transparentes++;
          return { w: c.width, h: c.height, fraccionTransparente: transparentes / (d.length / 4) };
        };
        const videos = [...document.querySelectorAll('video')].map((v) => ({ t: v.currentTime, paused: v.paused }));
        return { lienzos: lienzos.map(analizar), videos };
      });
      await page.screenshot({ path: join(SALIDA, 'vista-previa.png'), fullPage: true });
      await ctx.close();
      if (proyecto.urls.capa) {
        afirmar(r.lienzos.length === 2, `Se esperaban 2 lienzos de capa, hay ${r.lienzos.length}`);
        const [sobrePoster, sola] = r.lienzos;
        afirmar(sobrePoster.fraccionTransparente < 0.01, 'La capa sobre el póster debería ser opaca (póster debajo)');
        afirmar(sola.fraccionTransparente > 0.5, `La capa sola debería ser mayormente transparente (${(sola.fraccionTransparente * 100).toFixed(0)} %)`);
      }
      if (proyecto.urls.video) afirmar(r.videos.some((v) => !v.paused && v.t > 0.5), 'El video de la vista previa no se reproduce');
      const e = errores();
      afirmar(e.length === 0, `Errores: ${e.join(' | ')}`);
      return r.lienzos[1] ? `capa sola: ${(r.lienzos[1].fraccionTransparente * 100).toFixed(0)} % de píxeles transparentes` : undefined;
    });

    await prueba('El QR de /recursos se lee y abre la URL del proyecto', async () => {
      const ctx = await nuevoContexto();
      const page = await ctx.newPage();
      const base = 'https://museos.ejemplo.edu.ar';
      await page.goto(`${BASE}/recursos`);
      const campo = page.getByLabel(/URL pública del sitio/);
      await campo.fill(base);
      const img = page.getByRole('article', { name: proyecto.nombre }).getByAltText(`Código QR que abre ${base}/p/${slug}`);
      await img.waitFor();
      const src = (await img.getAttribute('src'))!;
      await ctx.close();
      const svg = decodeURIComponent(src.split(',')[1]).replace('<svg ', '<svg width="600" height="600" ');
      const imagen = await loadImage(Buffer.from(svg));
      const lienzo = createCanvas(600, 600);
      const c = lienzo.getContext('2d');
      c.fillStyle = '#fff';
      c.fillRect(0, 0, 600, 600);
      c.drawImage(imagen, 0, 0, 600, 600);
      const datos = c.getImageData(0, 0, 600, 600);
      const leido = jsQR(new Uint8ClampedArray(datos.data), 600, 600)?.data;
      afirmar(leido === `${base}/p/${slug}`, `El QR contiene "${leido}"`);
      return leido;
    });

    await navegador.close();
    navegador = undefined;

    // ---------------------------------------------------------------- WebKit
    if (!values['sin-webkit']) {
      console.log(negrita('\nWebKit (motor de Safari, escritorio — sin cámara)'));
      navegador = await webkit.launch();
      await prueba('Páginas principales, vista sin RA y vista previa cargan sin errores en WebKit', async () => {
        const ctx = await navegador!.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        const page = await ctx.newPage();
        const errores: string[] = [];
        page.on('pageerror', (e) => errores.push(e.message));
        await page.goto(BASE + '/');
        await page.getByRole('heading', { name: /Proyectos que cobran vida/ }).waitFor();
        await page.screenshot({ path: join(SALIDA, 'webkit-inicio.png'), fullPage: true });
        await page.goto(`${BASE}/p/${slug}`);
        await page.getByRole('heading', { level: 1, name: proyecto.nombre }).waitFor();
        await page.screenshot({ path: join(SALIDA, 'webkit-proyecto.png') });
        await page.goto(`${BASE}/p/${slug}/video`);
        await page.getByText(/Modo sin realidad aumentada/).waitFor();
        await page.goto(`${BASE}/recursos/vista-previa/${slug}`);
        await page.getByRole('heading', { name: `Vista previa: ${proyecto.nombre}` }).waitFor();
        await page.waitForTimeout(2000);
        const lienzosOk = await page.evaluate(() => [...document.querySelectorAll<HTMLCanvasElement>('canvas.capa-poster__lienzo')].every((c) => c.width > 0));
        await page.screenshot({ path: join(SALIDA, 'webkit-vista-previa.png'), fullPage: true });
        await page.goto(`${BASE}/recursos`);
        await page.getByRole('heading', { name: 'Recursos para impresión' }).waitFor();
        await page.goto(`${BASE}/p/${slug}/ra`);
        await page.locator('.ra-panel, .ra-estado').first().waitFor();
        await ctx.close();
        afirmar(lienzosOk, 'La capa no se dibujó en WebKit');
        afirmar(errores.length === 0, `Errores: ${errores.join(' | ')}`);
      });
    }
  } finally {
    await navegador?.close();
    servidor.kill();
  }

  const fallidas = resultados.filter((r) => !r.ok).length;
  console.log(
    `\n${fallidas ? rojo(`${fallidas} prueba(s) fallida(s)`) : verde(`${resultados.length} pruebas OK`)} ${gris(`· capturas en ${SALIDA}`)}\n`,
  );
  process.exit(fallidas ? 1 : 0);
}

await main();
