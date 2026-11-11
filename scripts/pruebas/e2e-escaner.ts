/**
 * Prueba de la portada (escáner) con una cámara simulada que filma cada póster por separado.
 *
 *   npm run build && npm run test:e2e:escaner [-- --proyecto agrolink] [-- --visible]
 *
 * Para cada proyecto listo: abre "/" con la cámara filmando SU póster, espera que se reconozca solo
 * (sin tocar nada), que aparezca su nombre y que arranque la animación; guarda una captura en
 * salida/e2e/escaner-<slug>.png. Falla si se reconoce un póster equivocado.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { DIR_POSTERS, RAIZ, gris, negrita, rojo, salirConError, verde } from '../lib/cli.ts';
import { escanearProyectos } from '../lib/escaner.ts';
import { generarCamaraSimulada } from './camara-simulada.ts';

const { values } = parseArgs({
  options: { proyecto: { type: 'string' }, visible: { type: 'boolean', default: false }, puerto: { type: 'string', default: '4181' } },
});
const BASE = `http://localhost:${values.puerto}`;
const SALIDA = join(RAIZ, 'salida/e2e');

if (!existsSync(join(RAIZ, 'dist/index.html'))) salirConError('Falta el build: ejecutá "npm run build" primero.');
const proyectos = escanearProyectos({ dirPosters: DIR_POSTERS }).proyectos.filter(
  (p) => p.activo && p.estado.listoParaRA && (!values.proyecto || p.slug === values.proyecto),
);
mkdirSync(SALIDA, { recursive: true });

const vite = join(RAIZ, 'node_modules/vite/bin/vite.js');
const servidor = spawn(process.execPath, [vite, 'preview', '--port', values.puerto, '--strictPort'], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch {
    /* todavía no */
  }
  await new Promise((r) => setTimeout(r, 250));
}

let fallos = 0;
for (const p of proyectos) {
  const inicio = Date.now();
  const y4m = join(SALIDA, `camara-${p.slug}.y4m`);
  await generarCamaraSimulada(resolve(DIR_POSTERS, p.slug, decodeURIComponent(p.urls.poster!.split('/').pop()!.split('?')[0])), y4m);
  const navegador = await chromium.launch({
    headless: !values.visible,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${y4m}`,
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  try {
    const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ['camera'] });
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    const estado = page.locator('.ra-estado');
    await estado.filter({ hasText: /detectado|Preparando la animación/ }).waitFor({ timeout: 60_000 });
    const titulo = (await page.locator('.ra-marca').textContent()) ?? '';
    if (!titulo.includes(p.nombre)) throw new Error(`Se reconoció otro póster: "${titulo}" en lugar de "${p.nombre}"`);
    await page.waitForTimeout(3500);
    const texto = (await estado.textContent()) ?? '';
    if (!/detectado/.test(texto)) throw new Error(`La animación no arrancó (estado: "${texto}")`);
    await page.screenshot({ path: join(SALIDA, `escaner-${p.slug}.png`) });
    console.log(`${verde('✔')} ${p.nombre} reconocido solo ${gris(`(${((Date.now() - inicio) / 1000).toFixed(1)} s)`)}`);
  } catch (e) {
    fallos++;
    console.log(`${rojo('✖')} ${p.nombre}: ${(e as Error).message}`);
  } finally {
    await navegador.close();
  }
}
servidor.kill();
console.log(negrita(fallos ? `\n${fallos} con fallos` : '\nTodos reconocidos'));
process.exit(fallos ? 1 : 0);
