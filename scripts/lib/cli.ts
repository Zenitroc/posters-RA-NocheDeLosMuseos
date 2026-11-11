/** Utilidades comunes de los scripts de línea de comandos. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const RAIZ = resolve(import.meta.dirname, '../..');
export const DIR_POSTERS = resolve(RAIZ, 'public/posters');

const color = (codigo: number) => (texto: string) =>
  process.stdout.isTTY && !process.env.NO_COLOR ? `\x1b[${codigo}m${texto}\x1b[0m` : texto;

export const verde = color(32);
export const amarillo = color(33);
export const rojo = color(31);
export const gris = color(90);
export const negrita = color(1);

/**
 * Lee una variable de entorno o, si no está definida, de los archivos .env de
 * la raíz (mismo orden de prioridad que Vite en modo producción).
 */
export function leerVariable(nombre: string): string | undefined {
  if (process.env[nombre]) return process.env[nombre];
  for (const archivo of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    const ruta = resolve(RAIZ, archivo);
    if (!existsSync(ruta)) continue;
    for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
      if (m && m[1] === nombre) return m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return undefined;
}

export function salirConError(mensaje: string): never {
  console.error(rojo(`✖ ${mensaje}`));
  process.exit(1);
}
