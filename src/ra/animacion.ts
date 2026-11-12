/**
 * Contrato común de las animaciones que se colocan sobre el póster.
 * Implementaciones: ReproductorAnimacion (MP4) y AnimacionCanvas (capa transparente).
 * La sesión de RA sólo conoce esta interfaz.
 */
import type { Texture } from 'three';
import type { ProyectoCatalogo, ModoAnimacion, TipoAnimacion } from '../proyectos/modelo.ts';
import { ordenAnimaciones } from '../proyectos/modelo.ts';

export type ResultadoReproduccion = 'reproduciendo' | 'bloqueado' | 'error';
export type EventoAnimacion = 'reproduciendo' | 'pausado' | 'terminado' | 'error';

export interface Animacion {
  readonly tipo: TipoAnimacion;
  /** Fondo transparente (sólo se dibujan algunos elementos). */
  readonly transparente: boolean;
  /** ancho/alto del contenido (válido después de cargar()). */
  readonly proporcion: number;
  /**
   * Margen alrededor del póster que ocupa la animación, como fracción de su ancho/alto por lado
   * (0 = cubre justo el póster). Permite que los elementos "salgan del papel" hacia la pared.
   */
  readonly margen?: number;
  /** Elemento que debe estar en el DOM mientras dura la sesión (el <video> en iOS), o null. */
  readonly elemento: HTMLElement | null;
  readonly pausado: boolean;
  /** Posición actual en segundos. */
  readonly tiempo: number;
  cargar(): Promise<void>;
  /** Textura para el plano 3D. Se crea una sola vez; la libera quien la usa. */
  crearTextura(): Texture;
  /** Llamado en cada cuadro de render. `visible`: el póster está a la vista. */
  actualizar(ahora: number, visible: boolean): void;
  reproducir(): Promise<ResultadoReproduccion>;
  pausar(): void;
  reiniciar(reproducir: boolean): Promise<ResultadoReproduccion | null>;
  alCambiar(fn: (evento: EventoAnimacion) => void): () => void;
  liberar(): void;
}

/** Emisor mínimo de eventos de animación. */
export class Emisor {
  private readonly oyentes = new Set<(e: EventoAnimacion) => void>();
  suscribir(fn: (e: EventoAnimacion) => void) {
    this.oyentes.add(fn);
    return () => void this.oyentes.delete(fn);
  }
  emitir(e: EventoAnimacion) {
    for (const fn of [...this.oyentes]) fn(e);
  }
  limpiar() {
    this.oyentes.clear();
  }
}

/** ¿El navegador puede dibujar en un canvas 2D? (requisito de la capa Canvas). */
export function soportaCanvas2D(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('2d'));
  } catch {
    return false;
  }
}

/** Formatos a intentar para un proyecto, en orden (el primero que cargue se usa). */
export function animacionesParaProyecto(p: ProyectoCatalogo, modoForzado?: ModoAnimacion | null): TipoAnimacion[] {
  return ordenAnimaciones(modoForzado ?? p.animacion.modo, {
    video: Boolean(p.urls.video),
    canvas: Boolean(p.urls.capa) && soportaCanvas2D(),
  });
}

/**
 * Crea y carga la animación de un proyecto. Si el formato preferido falla
 * (p. ej. la capa Canvas no inicializa), usa el siguiente como respaldo.
 */
export async function prepararAnimacion(
  p: ProyectoCatalogo,
  opciones: {
    modoForzado?: ModoAnimacion | null;
    alRespaldo?: (fallido: TipoAnimacion, error: unknown) => void;
    crear: (tipo: TipoAnimacion) => Animacion;
  },
): Promise<Animacion> {
  const orden = animacionesParaProyecto(p, opciones.modoForzado);
  let ultimoError: unknown = new Error('El proyecto no tiene animación');
  for (let i = 0; i < orden.length; i++) {
    const animacion = opciones.crear(orden[i]);
    try {
      await animacion.cargar();
      return animacion;
    } catch (e) {
      animacion.liberar();
      ultimoError = e;
      if (i < orden.length - 1) opciones.alRespaldo?.(orden[i], e);
    }
  }
  throw ultimoError;
}
