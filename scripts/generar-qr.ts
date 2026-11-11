/**
 * Genera los QR de impresión (PNG 2048 px y SVG) en salida/qr/.
 *
 *   npm run qr                                    (todos los proyectos, usa VITE_SITIO_URL)
 *   npm run qr -- zonar --url https://mi-dominio  (uno, con URL explícita)
 *
 * También se pueden descargar desde la página /recursos del sitio.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import QRCode from 'qrcode';
import { OPCIONES_QR, nombreArchivoQr } from '../src/qr/qr.ts';
import { normalizarUrlBase, problemasUrlBase, urlProyecto } from '../src/proyectos/urls.ts';
import { DIR_POSTERS, RAIZ, amarillo, leerVariable, negrita, salirConError, verde } from './lib/cli.ts';
import { escanearProyectos } from './lib/escaner.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { url: { type: 'string' }, salida: { type: 'string', default: 'salida/qr' } },
});

const base = normalizarUrlBase(values.url ?? leerVariable('VITE_SITIO_URL'));
if (!base) {
  salirConError('Definí la URL pública: --url https://dominio  (o VITE_SITIO_URL en .env).');
}
for (const p of problemasUrlBase(base)) console.log(amarillo(`⚠ ${p}`));

const { proyectos } = escanearProyectos({ dirPosters: DIR_POSTERS });
const elegidos = positionals.length ? proyectos.filter((p) => positionals.includes(p.slug)) : proyectos;
const desconocidos = positionals.filter((s) => !proyectos.some((p) => p.slug === s));
if (desconocidos.length) salirConError(`Proyectos inexistentes: ${desconocidos.join(', ')}`);
if (elegidos.length === 0) salirConError('No hay proyectos.');

const dirSalida = join(RAIZ, values.salida);
mkdirSync(dirSalida, { recursive: true });

console.log(negrita(`\nGenerando QR con base ${base}`));
for (const p of elegidos) {
  const url = urlProyecto(base, p.slug);
  writeFileSync(join(dirSalida, nombreArchivoQr(p.slug, 'svg')), await QRCode.toString(url, { ...OPCIONES_QR, type: 'svg' }));
  writeFileSync(join(dirSalida, nombreArchivoQr(p.slug, 'png')), await QRCode.toBuffer(url, { ...OPCIONES_QR, type: 'png', width: 2048 }));
  const aviso = p.activo ? '' : amarillo(' (inactivo)');
  console.log(verde(`  ✔ ${p.nombre}${aviso}: ${url}`));
}
console.log(`\nArchivos en ${relative(RAIZ, dirSalida)}/\n`);
