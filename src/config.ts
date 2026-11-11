import { normalizarUrlBase } from './proyectos/urls.ts';

/** URL pública configurada en el build (VITE_SITIO_URL), o null. */
export const SITIO_URL_CONFIGURADA = normalizarUrlBase(import.meta.env.VITE_SITIO_URL);

/** Base para armar URLs absolutas (QR): la configurada o, si no hay, el origen actual. */
export function urlBaseSitio(): string {
  return SITIO_URL_CONFIGURADA ?? window.location.origin;
}

export const TEXTOS = {
  titulo: 'Proyectos que cobran vida',
  subtitulo: 'Noche de los Museos — UTN Buenos Aires',
  institucion: 'Departamento de Ingeniería en Sistemas de Información · UTN Facultad Regional Buenos Aires',
} as const;
