/** Estado compartido por las pantallas de cámara para la información flotante (ver InfoFlotante.tsx). */
import { useCallback, useRef, useState, type RefObject } from 'react';
import type { Punto, Rect } from '../ra/info-flotante.ts';

export type ReceptorCuadro = (esquinas: Punto[] | null) => void;

/**
 * Estado compartido por las pantallas de cámara: receptor de cuadros para la sesión, refs de las
 * barras (para calcular la zona libre de la pantalla) y la hoja de "Más info".
 */
export function useInfoFlotante(escenaRef: RefObject<HTMLElement | null>) {
  const receptorRef = useRef<ReceptorCuadro | null>(null);
  const barraSupRef = useRef<HTMLElement>(null);
  const barraInfRef = useRef<HTMLDivElement>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const abrirHoja = useCallback(() => setHojaAbierta(true), []);
  const cerrarHoja = useCallback(() => setHojaAbierta(false), []);
  /** Zona de pantalla que no tapan las barras ni los botones. */
  const zonaUtil = useCallback((): Rect => {
    const escena = escenaRef.current;
    const ancho = escena?.clientWidth ?? window.innerWidth;
    const alto = escena?.clientHeight ?? window.innerHeight;
    const sup = barraSupRef.current?.getBoundingClientRect().bottom ?? 0;
    const hijos = barraInfRef.current ? [...barraInfRef.current.children].map((h) => h.getBoundingClientRect().top) : [];
    const inf = hijos.length ? Math.min(...hijos) - 8 : alto;
    return { x0: 0, y0: sup, x1: ancho, y1: inf };
  }, [escenaRef]);
  /** Para `alCuadro` de la sesión. */
  const alCuadro = useCallback((esquinas: Punto[] | null) => receptorRef.current?.(esquinas), []);
  return { receptorRef, barraSupRef, barraInfRef, zonaUtil, alCuadro, hojaAbierta, abrirHoja, cerrarHoja };
}
