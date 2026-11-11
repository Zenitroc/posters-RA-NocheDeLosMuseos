import { ANIMACION_POR_DEFECTO, REPRODUCCION_POR_DEFECTO, type Catalogo, type ProyectoCatalogo } from '../proyectos/modelo.ts';

export function proyectoPrueba(slug: string, cambios: Partial<ProyectoCatalogo> = {}): ProyectoCatalogo {
  return {
    slug,
    nombre: slug.toUpperCase(),
    subtitulo: `Lema de ${slug}`,
    descripcion: `Descripción de ${slug}`,
    orden: 1,
    activo: true,
    demo: false,
    reproduccion: REPRODUCCION_POR_DEFECTO,
    animacion: ANIMACION_POR_DEFECTO,
    urls: {
      poster: `/posters/${slug}/poster.jpg?v=1`,
      video: `/posters/${slug}/animacion.mp4?v=1`,
      target: `/posters/${slug}/target.mind?v=1`,
      miniatura: `/posters/${slug}/miniatura.jpg?v=1`,
    },
    medidas: { poster: { ancho: 1000, alto: 1414 }, video: { ancho: 720, alto: 1018 }, target: { ancho: 1000, alto: 1414 } },
    estado: { listoParaRA: true, listoParaVideo: true, animaciones: ['video'], faltantes: [], advertencias: [] },
    ...cambios,
  };
}

export const CATALOGO_PRUEBA: Catalogo = {
  proyectos: [
    proyectoPrueba('zonar', { nombre: 'ZonAR', subtitulo: 'Hacé visible el ruido', demo: true }),
    proyectoPrueba('incompleto', {
      nombre: 'Proyecto Incompleto',
      urls: { poster: '/posters/incompleto/poster.jpg?v=1' },
      estado: { listoParaRA: false, listoParaVideo: false, animaciones: [], faltantes: ['target', 'animacion'], advertencias: [] },
    }),
    proyectoPrueba('solo-video', {
      nombre: 'Solo Video',
      urls: { poster: '/posters/solo-video/poster.jpg?v=1', video: '/posters/solo-video/animacion.mp4?v=1' },
      estado: { listoParaRA: false, listoParaVideo: true, animaciones: ['video'], faltantes: ['target'], advertencias: [] },
    }),
    proyectoPrueba('oculto', { nombre: 'Proyecto Oculto', activo: false }),
    proyectoPrueba('solo-capa', {
      nombre: 'Solo Capa',
      orden: 5,
      animacion: { modo: 'auto', canvas: { global: 'CapaPrueba', fps: 30, ladoMaximo: 1024, ancho: 240, alto: 340 } },
      urls: {
        poster: '/posters/solo-capa/poster.jpg?v=1',
        target: '/posters/solo-capa/target.mind?v=1',
        capa: '/posters/solo-capa/capa.js?v=1',
      },
      estado: { listoParaRA: true, listoParaVideo: true, animaciones: ['canvas'], faltantes: [], advertencias: [] },
    }),
  ],
  problemas: [{ carpeta: 'roto', errores: ['Falta proyecto.json.'] }],
};
