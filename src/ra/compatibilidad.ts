import type { CodigoErrorRA } from './errores.ts';

export function soportaWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** Devuelve el primer impedimento para usar RA en este navegador, o null si no hay. */
export function diagnosticarCompatibilidad(): CodigoErrorRA | null {
  if (!window.isSecureContext) return 'no-seguro';
  if (!navigator.mediaDevices?.getUserMedia) return 'sin-camara-api';
  if (!soportaWebGL()) return 'sin-webgl';
  return null;
}
