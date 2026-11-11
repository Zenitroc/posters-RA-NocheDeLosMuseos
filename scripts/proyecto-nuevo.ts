/**
 * Crea un proyecto nuevo en public/posters/<slug>/.
 *
 *   npm run proyecto:nuevo -- --nombre "Mi Proyecto" --poster ./poster.png --video ./animacion.mp4 \
 *       [--slug mi-proyecto] [--subtitulo "Lema"] [--descripcion "Texto"] [--equipo "Ana, Juan"] \
 *       [--orden 10] [--inactivo] [--sin-target]
 *       [--capa ./capa.js --capa-global NombreGlobal --capa-ancho 1131 --capa-alto 1600] [--modo auto|video|canvas]
 *
 * Pasos que realiza:
 *   1. Crea la carpeta del proyecto.
 *   2. Copia el póster (poster.jpg|png) y el video (animacion.mp4).
 *   3. Escribe proyecto.json.
 *   4. Genera miniatura.jpg y compila target.mind (MindAR).
 * La animación puede ser un MP4 (--video), una capa Canvas (--capa) o ambas.
 * Póster y animación son opcionales: el proyecto queda "incompleto" hasta agregarlos.
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { ARCHIVOS_POR_DEFECTO, esModoAnimacion, esSlugValido, slugificar } from '../src/proyectos/modelo.ts';
import { urlProyecto } from '../src/proyectos/urls.ts';
import { DIR_POSTERS, amarillo, gris, leerVariable, negrita, salirConError, verde } from './lib/cli.ts';
import { ARCHIVO_MANIFIESTO } from './lib/escaner.ts';
import { prepararProyecto } from './lib/preparar.ts';

const { values } = parseArgs({
  options: {
    nombre: { type: 'string' },
    slug: { type: 'string' },
    subtitulo: { type: 'string' },
    descripcion: { type: 'string' },
    equipo: { type: 'string' },
    orden: { type: 'string' },
    poster: { type: 'string' },
    video: { type: 'string' },
    capa: { type: 'string' },
    'capa-global': { type: 'string' },
    'capa-ancho': { type: 'string' },
    'capa-alto': { type: 'string' },
    modo: { type: 'string' },
    inactivo: { type: 'boolean', default: false },
    'sin-target': { type: 'boolean', default: false },
  },
});

if (!values.nombre?.trim()) {
  salirConError('Falta --nombre. Ejemplo:\n  npm run proyecto:nuevo -- --nombre "ZonAR" --poster ./poster.jpg --video ./animacion.mp4');
}
const nombre = values.nombre.trim();
const slug = values.slug ?? slugificar(nombre);
if (!esSlugValido(slug)) salirConError(`Slug inválido: "${slug}". Usá minúsculas, números y guiones.`);

const dir = join(DIR_POSTERS, slug);
if (existsSync(join(dir, ARCHIVO_MANIFIESTO))) {
  salirConError(
    `Ya existe el proyecto "${slug}". Para actualizar archivos, reemplazalos en public/posters/${slug}/ ` +
      `y ejecutá "npm run proyecto:preparar -- ${slug}".`,
  );
}

const orden = values.orden !== undefined ? Number(values.orden) : undefined;
if (orden !== undefined && !Number.isFinite(orden)) salirConError('--orden debe ser un número.');

const archivos: Record<string, string> = {};

function copiar(origen: string | undefined, tipo: 'poster' | 'video' | 'capa', extensionesValidas: string[]) {
  if (!origen) {
    if (tipo === 'capa') return;
    console.log(amarillo(`  ⚠ Sin --${tipo}: el proyecto quedará incompleto hasta que lo agregues.`));
    return;
  }
  const ruta = resolve(origen);
  if (!existsSync(ruta)) salirConError(`No existe el archivo ${ruta}`);
  let ext = extname(ruta).toLowerCase();
  if (ext === '.jpeg') ext = '.jpg';
  if (!extensionesValidas.includes(ext)) {
    salirConError(`--${tipo} debe ser ${extensionesValidas.join(' o ')} (recibido "${ext || 'sin extensión'}").`);
  }
  const base = ARCHIVOS_POR_DEFECTO[tipo].replace(/\.\w+$/, '');
  const destino = `${base}${ext}`;
  copyFileSync(ruta, join(dir, destino));
  if (destino !== ARCHIVOS_POR_DEFECTO[tipo]) archivos[tipo] = destino;
  console.log(verde(`  ✔ ${tipo} copiado → ${slug}/${destino}`));
}

console.log(negrita(`\nCreando proyecto "${nombre}" (${slug})`));
mkdirSync(dir, { recursive: true });
copiar(values.poster, 'poster', ['.jpg', '.png']);
if (values.video || !values.capa) copiar(values.video, 'video', ['.mp4']);
copiar(values.capa, 'capa', ['.js']);

if (values.modo && !esModoAnimacion(values.modo)) salirConError('--modo debe ser auto, video o canvas.');
if (values.capa && !values['capa-global']) {
  salirConError('Con --capa indicá --capa-global: el nombre del objeto que define el script (ej.: ZonarAnim).');
}
const entero = (v: string | undefined, nombre: string) => {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) salirConError(`--${nombre} debe ser un entero positivo.`);
  return n;
};
const capaAncho = entero(values['capa-ancho'], 'capa-ancho');
const capaAlto = entero(values['capa-alto'], 'capa-alto');

const manifiesto = {
  nombre,
  ...(values.subtitulo ? { subtitulo: values.subtitulo } : {}),
  ...(values.descripcion ? { descripcion: values.descripcion } : {}),
  ...(values.equipo ? { equipo: values.equipo.split(',').map((s) => s.trim()).filter(Boolean) } : {}),
  ...(orden !== undefined ? { orden } : {}),
  activo: !values.inactivo,
  ...(Object.keys(archivos).length ? { archivos } : {}),
  reproduccion: { bucle: true, ajuste: 'auto', alPerderSeguimiento: 'pausar' },
  ...(values.capa || values.modo
    ? {
        animacion: {
          modo: values.modo ?? 'auto',
          ...(values.capa
            ? {
                canvas: {
                  global: values['capa-global'],
                  ...(capaAncho && capaAlto ? { ancho: capaAncho, alto: capaAlto } : {}),
                },
              }
            : {}),
        },
      }
    : {}),
};
writeFileSync(join(dir, ARCHIVO_MANIFIESTO), JSON.stringify(manifiesto, null, 2) + '\n');
console.log(verde(`  ✔ ${slug}/${ARCHIVO_MANIFIESTO} creado`));

if (values.poster) {
  await prepararProyecto(DIR_POSTERS, slug, { sinTarget: values['sin-target'] });
}

const base = leerVariable('VITE_SITIO_URL');
console.log(`
${negrita('Listo.')} Próximos pasos:
  1. Revisá el estado:          npm run proyectos:validar
  2. Probalo en desarrollo:     npm run dev  →  http://localhost:5173/p/${slug}
  3. Vista previa póster/video: http://localhost:5173/recursos/vista-previa/${slug}
  4. QR para imprimir:          /recursos en el sitio, o  npm run qr -- ${slug}
${gris(`  URL pública: ${base ? urlProyecto(base, slug) : `<VITE_SITIO_URL>/p/${slug}`}`)}
`);
process.exit(0);
