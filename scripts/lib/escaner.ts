/**
 * Recorre public/posters/<slug>/ y arma el catálogo que consume la app.
 *
 * - Cada subcarpeta con un proyecto.json válido es un proyecto.
 * - Las carpetas que empiezan con "_" o "." se ignoran (plantillas, borradores).
 * - Un proyecto incompleto NO rompe nada: queda marcado con sus faltantes.
 * - Una carpeta inválida se reporta en `problemas` y se excluye del catálogo.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { imageSize } from 'image-size';
import {
  calcularAjuste,
  esSlugValido,
  normalizarManifiesto,
  ordenAnimaciones,
  proporcionesCoinciden,
  type Catalogo,
  type Faltante,
  type Medidas,
  type ProblemaCarpeta,
  type ProyectoCatalogo,
  type RecursoClave,
} from '../../src/proyectos/modelo.ts';
import { leerDimensionesMp4 } from './mp4.ts';
import { ARCHIVO_META_TARGET, leerDimensionesMind, sha1, type MetaTarget } from './target-meta.ts';

export const ARCHIVO_MANIFIESTO = 'proyecto.json';
const VIDEO_PESADO_MB = 25;

export interface OpcionesEscaneo {
  /** Carpeta que contiene una subcarpeta por proyecto. */
  dirPosters: string;
  /** Prefijo público de esa carpeta (por defecto "/posters"). */
  prefijoUrl?: string;
}

function medidasImagen(buf: Uint8Array): Medidas | undefined {
  try {
    const { width, height } = imageSize(buf);
    return width && height ? { ancho: width, alto: height } : undefined;
  } catch {
    return undefined;
  }
}

function proporcion(m: Medidas) {
  return m.ancho / m.alto;
}

function formatoMedidas(m: Medidas) {
  return `${m.ancho}×${m.alto}`;
}

export function escanearProyecto(dirPosters: string, slug: string, prefijoUrl = '/posters'):
  | { ok: true; proyecto: ProyectoCatalogo; advertenciasManifiesto: string[] }
  | { ok: false; problema: ProblemaCarpeta } {
  const dir = join(dirPosters, slug);
  const falla = (errores: string[]) => ({ ok: false as const, problema: { carpeta: slug, errores } });

  if (!esSlugValido(slug)) {
    return falla([
      `El nombre de carpeta "${slug}" no es un slug válido: usá minúsculas, números y guiones (ej.: "mi-proyecto").`,
    ]);
  }

  const rutaManifiesto = join(dir, ARCHIVO_MANIFIESTO);
  if (!existsSync(rutaManifiesto)) return falla([`Falta ${ARCHIVO_MANIFIESTO}.`]);

  let datos: unknown;
  try {
    datos = JSON.parse(readFileSync(rutaManifiesto, 'utf8'));
  } catch (e) {
    return falla([`${ARCHIVO_MANIFIESTO} no es JSON válido: ${(e as Error).message}`]);
  }

  const normalizado = normalizarManifiesto(datos);
  if (!normalizado.ok) return falla(normalizado.errores);
  const { archivos, ...manifiesto } = normalizado.manifiesto;

  if (datos && typeof datos === 'object' && 'slug' in datos && (datos as { slug: unknown }).slug !== slug) {
    normalizado.advertencias.push(`"slug" del manifiesto no coincide con la carpeta; se usa "${slug}".`);
  }

  const urls: ProyectoCatalogo['urls'] = {};
  const medidas: ProyectoCatalogo['medidas'] = {};
  const advertencias: string[] = [];
  const contenidos: Partial<Record<RecursoClave, Uint8Array>> = {};

  for (const clave of Object.keys(archivos) as RecursoClave[]) {
    const ruta = join(dir, archivos[clave]);
    if (!existsSync(ruta) || !statSync(ruta).isFile() || statSync(ruta).size === 0) continue;
    const buf = readFileSync(ruta);
    contenidos[clave] = buf;
    // ?v=<hash> invalida la caché del navegador cuando se reemplaza un archivo con el mismo nombre.
    urls[clave] = `${prefijoUrl}/${slug}/${encodeURIComponent(archivos[clave])}?v=${sha1(buf).slice(0, 10)}`;
  }

  if (contenidos.poster) {
    medidas.poster = medidasImagen(contenidos.poster);
    if (!medidas.poster) advertencias.push(`No se pudo leer la imagen del póster (${archivos.poster}).`);
  }
  if (contenidos.video) {
    medidas.video = leerDimensionesMp4(contenidos.video) ?? undefined;
    if (!medidas.video) advertencias.push(`No se pudieron leer las dimensiones del video (${archivos.video}); ¿es un MP4 válido?`);
    if (!/\.mp4$/i.test(archivos.video)) advertencias.push('El video debería ser MP4 (H.264) para máxima compatibilidad.');
    const mb = contenidos.video.byteLength / 1024 / 1024;
    if (mb > VIDEO_PESADO_MB) {
      advertencias.push(`El video pesa ${mb.toFixed(1)} MB: en datos móviles puede tardar. Recomendado: menos de ${VIDEO_PESADO_MB} MB.`);
    }
  }
  if (contenidos.target) {
    medidas.target = leerDimensionesMind(contenidos.target) ?? undefined;
    if (!medidas.target) {
      advertencias.push('target.mind no es un archivo de MindAR válido (o es de una versión incompatible): recompilalo.');
      delete urls.target;
    }
  }

  if (contenidos.capa) {
    const { canvas } = manifiesto.animacion;
    if (canvas.ancho && canvas.alto) medidas.capa = { ancho: canvas.ancho, alto: canvas.alto };
    if (!/\.m?js$/i.test(archivos.capa)) advertencias.push('La capa Canvas debería ser un archivo .js.');
    if (!new TextDecoder().decode(contenidos.capa).includes(canvas.global)) {
      advertencias.push(`La capa (${archivos.capa}) no menciona el objeto global "${canvas.global}": revisá "animacion.canvas.global".`);
    }
  }

  if (!urls.miniatura) {
    advertencias.push('Sin miniatura: el catálogo usará el póster completo (más pesado). Generala con "npm run proyecto:preparar".');
  }

  // Coherencia póster ↔ target
  if (medidas.poster && medidas.target && !proporcionesCoinciden(proporcion(medidas.poster), proporcion(medidas.target), 0.01)) {
    advertencias.push(
      `target.mind (${formatoMedidas(medidas.target)}) no corresponde a la proporción del póster (${formatoMedidas(medidas.poster)}): recompilalo.`,
    );
  }
  const rutaMeta = join(dir, ARCHIVO_META_TARGET);
  if (contenidos.poster && contenidos.target && existsSync(rutaMeta)) {
    try {
      const meta = JSON.parse(readFileSync(rutaMeta, 'utf8')) as MetaTarget;
      if (meta.posterSha1 !== sha1(contenidos.poster)) {
        advertencias.push(
          `El póster cambió desde que se compiló target.mind: ejecutá "npm run proyecto:preparar -- ${slug} --forzar".`,
        );
      }
    } catch {
      advertencias.push(`${ARCHIVO_META_TARGET} ilegible (se ignora).`);
    }
  }

  // Coherencia póster ↔ video / capa
  const base = medidas.target ?? medidas.poster;
  if (base && medidas.video) {
    const ajuste = calcularAjuste(proporcion(base), proporcion(medidas.video), manifiesto.reproduccion);
    if (ajuste.advertencia) advertencias.push(ajuste.advertencia);
  }
  if (base && medidas.capa && !proporcionesCoinciden(proporcion(base), proporcion(medidas.capa), 0.01)) {
    advertencias.push(
      `La capa Canvas (${formatoMedidas(medidas.capa)}) no tiene la proporción del póster (${formatoMedidas(base)}): no quedará alineada.`,
    );
  }

  // Formatos de animación
  const { modo } = manifiesto.animacion;
  const animaciones = ordenAnimaciones(modo, { video: Boolean(urls.video), canvas: Boolean(urls.capa) });
  if (modo === 'canvas' && !urls.capa) {
    advertencias.push(`"animacion.modo" es "canvas" pero falta la capa (${archivos.capa})${urls.video ? ': se usará el video' : ''}.`);
  }
  if (modo === 'video' && !urls.video && urls.capa) {
    advertencias.push(`"animacion.modo" es "video" pero falta ${archivos.video}: se usará la capa Canvas.`);
  }
  if (urls.capa && !medidas.capa) {
    advertencias.push('Declará "animacion.canvas.ancho" y "alto" para validar que la capa coincida con el póster.');
  }

  if (manifiesto.demo) {
    advertencias.push('Usa recursos TEMPORALES de demostración: reemplazalos por el póster y la animación definitivos.');
  }

  const faltantes: Faltante[] = [];
  if (!urls.poster) faltantes.push('poster');
  if (!urls.target) faltantes.push('target');
  if (animaciones.length === 0) faltantes.push('animacion');
  const proyecto: ProyectoCatalogo = {
    ...manifiesto,
    slug,
    urls,
    medidas,
    estado: {
      listoParaRA: faltantes.length === 0,
      listoParaVideo: Boolean(urls.video) || Boolean(urls.capa && urls.poster),
      animaciones,
      faltantes,
      advertencias,
    },
  };
  return { ok: true, proyecto, advertenciasManifiesto: normalizado.advertencias };
}

export function escanearProyectos({ dirPosters, prefijoUrl = '/posters' }: OpcionesEscaneo): Catalogo {
  const catalogo: Catalogo = { proyectos: [], problemas: [] };
  if (!existsSync(dirPosters)) return catalogo;

  const carpetas = readdirSync(dirPosters, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();

  for (const slug of carpetas) {
    const r = escanearProyecto(dirPosters, slug, prefijoUrl);
    if (r.ok) {
      r.proyecto.estado.advertencias.unshift(...r.advertenciasManifiesto);
      catalogo.proyectos.push(r.proyecto);
    } else {
      catalogo.problemas.push(r.problema);
    }
  }

  catalogo.proyectos.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
  return catalogo;
}
