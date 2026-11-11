/** Utilidades livianas sobre archivos .mind (sin dependencias nativas). */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { decode } from '@msgpack/msgpack';

export const VERSION_MINDAR: string = JSON.parse(
  readFileSync(new URL(import.meta.resolve('mind-ar/package.json')), 'utf8'),
).version;

/** Contenido de target.meta.json, que se escribe junto a target.mind al compilar. */
export interface MetaTarget {
  /** Hash SHA-1 del archivo de póster usado para compilar. */
  posterSha1: string;
  posterArchivo: string;
  ancho: number;
  alto: number;
  compilador: string;
  fecha: string;
}

export const ARCHIVO_META_TARGET = 'target.meta.json';

export function sha1(buf: Uint8Array): string {
  return createHash('sha1').update(buf).digest('hex');
}

/** Lee las dimensiones de la primera imagen objetivo de un archivo .mind. */
export function leerDimensionesMind(buf: Uint8Array): { ancho: number; alto: number } | null {
  try {
    const contenido = decode(buf) as { dataList?: { targetImage?: { width: number; height: number } }[] };
    const t = contenido?.dataList?.[0]?.targetImage;
    if (!t || !(t.width > 0) || !(t.height > 0)) return null;
    return { ancho: t.width, alto: t.height };
  } catch {
    return null;
  }
}
