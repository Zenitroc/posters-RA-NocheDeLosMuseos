import type { ProyectoCatalogo, TipoAnimacion } from '../proyectos/modelo.ts';
import type { Animacion } from './animacion.ts';
import { AnimacionCanvas } from './capa-canvas.ts';
import { ReproductorAnimacion } from './reproductor.ts';

/** Instancia (sin cargar) la animación de un proyecto en el formato pedido. */
export function crearAnimacion(p: ProyectoCatalogo, tipo: TipoAnimacion): Animacion {
  const bucle = p.reproduccion.bucle;
  if (tipo === 'canvas') {
    if (!p.urls.capa) throw new Error('El proyecto no tiene capa Canvas');
    return new AnimacionCanvas(p.urls.capa, { ...p.animacion.canvas, bucle });
  }
  if (!p.urls.video) throw new Error('El proyecto no tiene video');
  return new ReproductorAnimacion(p.urls.video, { bucle });
}
