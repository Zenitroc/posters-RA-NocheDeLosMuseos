import { proporcionPoster, urlMiniatura } from '../proyectos/catalogo.ts';
import type { ProyectoCatalogo } from '../proyectos/modelo.ts';

interface Props {
  proyecto: ProyectoCatalogo;
  /** "completo" usa el póster original; "miniatura" la versión liviana. */
  variante?: 'miniatura' | 'completo';
  className?: string;
  prioridad?: boolean;
}

/** Imagen del póster con espacio reservado (sin saltos de diseño) y alternativa si falta. */
export function ImagenPoster({ proyecto, variante = 'miniatura', className = '', prioridad = false }: Props) {
  const src = variante === 'completo' ? (proyecto.urls.poster ?? urlMiniatura(proyecto)) : urlMiniatura(proyecto);
  return (
    <div className={className} style={{ aspectRatio: String(proporcionPoster(proyecto)) }}>
      {src ? (
        <img
          src={src}
          alt={`Póster del proyecto ${proyecto.nombre}`}
          loading={prioridad ? 'eager' : 'lazy'}
          decoding="async"
        />
      ) : (
        <div className="sin-imagen">Póster no disponible todavía</div>
      )}
    </div>
  );
}
