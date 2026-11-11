import catalogoGenerado from 'virtual:proyectos';
import type { Catalogo, ProyectoCatalogo } from './modelo.ts';

export const catalogo = catalogoGenerado as Catalogo;

/** Proyectos visibles en el catálogo público. */
export function proyectosPublicados(cat: Catalogo = catalogo): ProyectoCatalogo[] {
  return cat.proyectos.filter((p) => p.activo);
}

/** Busca un proyecto por slug (incluye inactivos: la página decide qué mostrar). */
export function buscarProyecto(slug: string | undefined, cat: Catalogo = catalogo): ProyectoCatalogo | undefined {
  if (!slug) return undefined;
  return cat.proyectos.find((p) => p.slug === slug.toLowerCase());
}

export function urlMiniatura(p: ProyectoCatalogo): string | undefined {
  return p.urls.miniatura ?? p.urls.poster;
}

/** ancho/alto del póster (o de su target) para reservar espacio antes de cargar la imagen. */
export function proporcionPoster(p: ProyectoCatalogo): number {
  const m = p.medidas.poster ?? p.medidas.target;
  return m ? m.ancho / m.alto : 1 / Math.SQRT2;
}
