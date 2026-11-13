/**
 * Información flotante en RA: una tarjeta HTML anclada al póster en pantalla.
 *
 * El texto no se dibuja en 3D (a la escala del póster un párrafo sería ilegible en un celular): la
 * tarjeta es HTML con letra de tamaño normal, y en cada cuadro se reubica junto al póster detectado,
 * en el espacio libre que quede a su costado, arriba o abajo, unida a él por una línea. Si no hay
 * lugar (póster ocupando toda la pantalla), se reduce a un chip pegado a su esquina.
 *
 * Este módulo es puro (sin DOM): sólo geometría, para poder probarlo.
 */

export interface ContenidoInfo {
  nombre: string;
  subtitulo?: string;
  premio?: string;
  parrafos: string[];
  equipo?: string[];
}

/** Arma el contenido a partir de un proyecto; null si no tiene texto para mostrar. */
export function contenidoInfo(p: {
  nombre: string;
  subtitulo?: string;
  descripcion?: string;
  premio?: string;
  masInfo?: string[];
  equipo?: string[];
}): ContenidoInfo | null {
  const parrafos = p.masInfo?.length ? p.masInfo : p.descripcion ? [p.descripcion] : [];
  if (!parrafos.length) return null;
  return { nombre: p.nombre, subtitulo: p.subtitulo, premio: p.premio, parrafos, equipo: p.equipo };
}

export interface Punto {
  x: number;
  y: number;
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type Lado = 'derecha' | 'izquierda' | 'abajo' | 'arriba';
/** Preferencia ante empates: al costado primero. */
export const LADOS: Lado[] = ['derecha', 'izquierda', 'abajo', 'arriba'];

export interface Medidas {
  /** Ancho mínimo y máximo de la tarjeta (px). */
  anchoMin: number;
  anchoMax: number;
  /** Alto mínimo útil y alto máximo de la tarjeta (px). */
  altoMin: number;
  altoMax: number;
  /** Separación entre póster y tarjeta, y margen con los bordes de la zona útil (px). */
  separacion: number;
  margen: number;
}

export const MEDIDAS_POR_DEFECTO: Medidas = { anchoMin: 210, anchoMax: 360, altoMin: 150, altoMax: 460, separacion: 18, margen: 10 };

export type Ubicacion =
  | {
      modo: 'tarjeta';
      lado: Lado;
      /** Esquina superior izquierda, ancho y alto máximo de la tarjeta. */
      x: number;
      y: number;
      ancho: number;
      altoMax: number;
      /** Punto del borde del póster donde nace la línea. */
      ancla: Punto;
    }
  | { modo: 'chip'; x: number; y: number };

export function rectDe(puntos: Punto[]): Rect {
  return {
    x0: Math.min(...puntos.map((p) => p.x)),
    y0: Math.min(...puntos.map((p) => p.y)),
    x1: Math.max(...puntos.map((p) => p.x)),
    y1: Math.max(...puntos.map((p) => p.y)),
  };
}

const limitar = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Región libre (dentro de la zona útil) a un lado del póster. */
function region(lado: Lado, poster: Rect, util: Rect, m: Medidas): Rect {
  const s = m.separacion;
  const u = { x0: util.x0 + m.margen, y0: util.y0 + m.margen, x1: util.x1 - m.margen, y1: util.y1 - m.margen };
  switch (lado) {
    case 'derecha':
      return { x0: Math.max(u.x0, poster.x1 + s), y0: u.y0, x1: u.x1, y1: u.y1 };
    case 'izquierda':
      return { x0: u.x0, y0: u.y0, x1: Math.min(u.x1, poster.x0 - s), y1: u.y1 };
    case 'abajo':
      return { x0: u.x0, y0: Math.max(u.y0, poster.y1 + s), x1: u.x1, y1: u.y1 };
    case 'arriba':
      return { x0: u.x0, y0: u.y0, x1: u.x1, y1: Math.min(u.y1, poster.y0 - s) };
  }
}

function cabe(r: Rect, m: Medidas) {
  return r.x1 - r.x0 >= m.anchoMin && r.y1 - r.y0 >= m.altoMin;
}

/** Superficie de tarjeta que se lograría en una región (para elegir la mejor). */
function puntaje(r: Rect, m: Medidas) {
  return Math.min(r.x1 - r.x0, m.anchoMax) * Math.min(r.y1 - r.y0, m.altoMax);
}

/**
 * Decide dónde va la tarjeta. `poster` y `util` en px de pantalla; `anterior` da histéresis (se queda
 * del mismo lado mientras siga entrando, para que no salte de un lado a otro). `altoActual`: alto que
 * mide hoy la tarjeta (para centrarla y pegarla al póster; si es más alta que el lugar, se recorta y scrollea).
 */
export function ubicarTarjeta(
  poster: Rect,
  util: Rect,
  anterior: Lado | null,
  altoActual = Infinity,
  m: Medidas = MEDIDAS_POR_DEFECTO,
): Ubicacion {
  const regiones = Object.fromEntries(LADOS.map((l) => [l, region(l, poster, util, m)])) as Record<Lado, Rect>;
  const aptos = LADOS.filter((l) => cabe(regiones[l], m));

  if (!aptos.length) {
    // Chip en la esquina superior derecha del póster, siempre dentro de la zona útil.
    return {
      modo: 'chip',
      x: limitar(poster.x1 - 12, util.x0 + m.margen, util.x1 - m.margen),
      y: limitar(poster.y0 + 12, util.y0 + m.margen, util.y1 - m.margen),
    };
  }

  const mejor = Math.max(...aptos.map((l) => puntaje(regiones[l], m)));
  const lado =
    anterior && aptos.includes(anterior) && puntaje(regiones[anterior], m) >= mejor * 0.6
      ? anterior
      : aptos.find((l) => puntaje(regiones[l], m) >= mejor * 0.9)!;
  const r = regiones[lado];
  const cx = (poster.x0 + poster.x1) / 2;
  const cy = (poster.y0 + poster.y1) / 2;

  if (lado === 'derecha' || lado === 'izquierda') {
    const ancho = Math.min(m.anchoMax, r.x1 - r.x0);
    const altoMax = Math.min(m.altoMax, r.y1 - r.y0);
    const alto = Math.min(altoActual, altoMax);
    const x = lado === 'derecha' ? r.x0 : r.x1 - ancho;
    // Centrada a la altura del póster (lo que permita la zona útil).
    const y = limitar(cy - alto / 2, r.y0, r.y1 - alto);
    const ancla = { x: lado === 'derecha' ? poster.x1 : poster.x0, y: limitar(cy, Math.max(poster.y0, r.y0), Math.min(poster.y1, r.y1)) };
    return { modo: 'tarjeta', lado, x, y, ancho, altoMax, ancla };
  }

  const ancho = Math.min(m.anchoMax * 1.15, r.x1 - r.x0);
  const altoMax = Math.min(m.altoMax, r.y1 - r.y0);
  const x = limitar(cx - ancho / 2, r.x0, r.x1 - ancho);
  const y = lado === 'abajo' ? r.y0 : r.y1 - Math.min(altoActual, altoMax);
  const ancla = { x: limitar(cx, Math.max(poster.x0, r.x0), Math.min(poster.x1, r.x1)), y: lado === 'abajo' ? poster.y1 : poster.y0 };
  return { modo: 'tarjeta', lado, x, y, ancho, altoMax, ancla };
}
