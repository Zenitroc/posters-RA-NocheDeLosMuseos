/** Máquina de estados de la pantalla de RA (pura: sin DOM). */
import type { TipoAnimacion } from '../proyectos/modelo.ts';
import type { CodigoErrorRA } from './errores.ts';
import type { ProgresoCarga } from './sesion.ts';

export type FaseRA = 'cargando' | 'buscando' | 'detectado' | 'perdido' | 'error';
export type EstadoReproduccion = 'inicial' | 'reproduciendo' | 'pausado' | 'bloqueado' | 'terminado';

export interface EstadoRA {
  fase: FaseRA;
  progreso: ProgresoCarga;
  reproduccion: EstadoReproduccion;
  error?: CodigoErrorRA;
  advertencia?: string;
  /** El póster se reconoció al menos una vez en esta sesión. */
  yaDetectado: boolean;
  /** El visitante pausó a mano: no reanudar solo al volver a detectar. */
  pausaManual: boolean;
  ayudaVisible: boolean;
  /** Se incrementa con "Reintentar" para reiniciar la sesión completa. */
  intento: number;
  /** Formato de animación en uso. */
  animacion?: TipoAnimacion;
  /** Formato que falló y obligó a usar el respaldo. */
  respaldo?: TipoAnimacion;
}

export type AccionRA =
  | { tipo: 'progreso'; progreso: ProgresoCarga }
  | { tipo: 'listo' }
  | { tipo: 'detectado' }
  | { tipo: 'perdido' }
  | { tipo: 'reproduccion'; valor: EstadoReproduccion }
  | { tipo: 'pausaManual'; valor: boolean }
  | { tipo: 'advertencia'; mensaje: string }
  | { tipo: 'error'; codigo: CodigoErrorRA }
  | { tipo: 'mostrarAyuda' }
  | { tipo: 'ocultarAyuda' }
  | { tipo: 'reintentar' }
  | { tipo: 'animacion'; valor: TipoAnimacion }
  | { tipo: 'respaldo'; desde: TipoAnimacion };

export const PROGRESO_INICIAL: ProgresoCarga = {
  motor: false,
  target: 0,
  camara: false,
  animacion: false,
  calibrando: false,
};

export const estadoInicialRA: EstadoRA = {
  fase: 'cargando',
  progreso: PROGRESO_INICIAL,
  reproduccion: 'inicial',
  yaDetectado: false,
  pausaManual: false,
  ayudaVisible: false,
  intento: 0,
};

export function reducirRA(estado: EstadoRA, accion: AccionRA): EstadoRA {
  switch (accion.tipo) {
    case 'progreso':
      return estado.fase === 'cargando' ? { ...estado, progreso: accion.progreso } : estado;
    case 'listo':
      return estado.fase === 'cargando' ? { ...estado, fase: 'buscando' } : estado;
    case 'detectado':
      if (estado.fase === 'error') return estado;
      return { ...estado, fase: 'detectado', yaDetectado: true, ayudaVisible: false };
    case 'perdido':
      return estado.fase === 'detectado' ? { ...estado, fase: 'perdido' } : estado;
    case 'reproduccion':
      return { ...estado, reproduccion: accion.valor };
    case 'pausaManual':
      return { ...estado, pausaManual: accion.valor };
    case 'advertencia':
      return { ...estado, advertencia: accion.mensaje };
    case 'error':
      return { ...estado, fase: 'error', error: accion.codigo, ayudaVisible: false };
    case 'mostrarAyuda':
      return estado.fase === 'buscando' || estado.fase === 'perdido' ? { ...estado, ayudaVisible: true } : estado;
    case 'ocultarAyuda':
      return { ...estado, ayudaVisible: false };
    case 'reintentar':
      // Se conserva el aviso de respaldo para mostrar que se está usando el formato alternativo.
      return { ...estadoInicialRA, intento: estado.intento + 1, respaldo: estado.respaldo };
    case 'animacion':
      return { ...estado, animacion: accion.valor };
    case 'respaldo':
      return { ...estado, respaldo: accion.desde };
  }
}

/** Porcentaje total de carga (0–100) ponderando cada etapa. */
export function porcentajeCarga(p: ProgresoCarga): number {
  const total =
    (p.camara ? 25 : 0) + (p.motor ? 25 : 0) + p.target * 25 + (p.animacion ? 15 : 0) + (p.calibrando ? 10 : 0);
  return Math.round(Math.min(100, total));
}
