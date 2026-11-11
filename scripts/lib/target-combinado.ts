/**
 * Fusión de los target.mind de varios proyectos en un único archivo .mind.
 *
 * MindAR admite varias imágenes objetivo en un mismo archivo (`dataList`); `Controller` las detecta
 * todas a la vez y avisa con `targetIndex` cuál apareció. Así el escáner de la portada reconoce
 * cualquier póster sin que el visitante elija nada. La fusión no recompila nada: sólo concatena las
 * listas de datos ya compiladas, de modo que es instantánea.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decode, encode } from '@msgpack/msgpack';
import { sha1 } from './target-meta.ts';

export interface EntradaTarget {
  slug: string;
  /** Nombre del archivo .mind dentro de la carpeta del proyecto. */
  archivo: string;
}

export interface TargetCombinado {
  buffer: Uint8Array;
  /** Slug de cada póster, en el orden en que quedaron dentro del .mind (índice = targetIndex). */
  slugs: string[];
  hash: string;
}

export function combinarTargets(dirPosters: string, entradas: EntradaTarget[]): TargetCombinado | null {
  const dataList: unknown[] = [];
  const slugs: string[] = [];
  let version: unknown;
  for (const { slug, archivo } of entradas) {
    const ruta = join(dirPosters, slug, archivo);
    if (!existsSync(ruta)) continue;
    try {
      const contenido = decode(readFileSync(ruta)) as { v?: unknown; dataList?: unknown[] };
      if (!contenido?.dataList?.length) continue;
      // Un proyecto aporta una sola imagen objetivo; si trajera varias, sólo la primera identifica el póster.
      dataList.push(contenido.dataList[0]);
      slugs.push(slug);
      version ??= contenido.v;
    } catch {
      /* .mind inválido: el escáner lo omite (el validador ya lo reporta) */
    }
  }
  if (dataList.length === 0) return null;
  const buffer = encode({ v: version, dataList });
  return { buffer, slugs, hash: sha1(buffer).slice(0, 10) };
}
