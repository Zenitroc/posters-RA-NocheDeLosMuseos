import { describe, expect, it, vi } from 'vitest';
import { proyectoPrueba } from '../pruebas/catalogo-prueba.ts';
import type { TipoAnimacion } from '../proyectos/modelo.ts';
import { animacionesParaProyecto, prepararAnimacion, type Animacion } from './animacion.ts';

const conAmbos = (modo: 'auto' | 'video' | 'canvas') =>
  proyectoPrueba('p', {
    urls: { poster: '/p.jpg', target: '/t.mind', video: '/v.mp4', capa: '/c.js' },
    animacion: { modo, canvas: { global: 'Capa', fps: 30, ladoMaximo: 1024 } },
  });

function animacionFalsa(tipo: TipoAnimacion, falla: boolean): Animacion {
  return {
    tipo,
    transparente: tipo === 'canvas',
    proporcion: 1,
    elemento: null,
    pausado: true,
    tiempo: 0,
    cargar: vi.fn(() => (falla ? Promise.reject(new Error(`${tipo} roto`)) : Promise.resolve())),
    crearTextura: vi.fn(),
    actualizar: vi.fn(),
    reproducir: vi.fn(),
    pausar: vi.fn(),
    reiniciar: vi.fn(),
    alCambiar: vi.fn(() => () => {}),
    liberar: vi.fn(),
  } as unknown as Animacion;
}

describe('selección de modo de animación', () => {
  it('auto y canvas prefieren la capa; video prefiere el MP4', () => {
    expect(animacionesParaProyecto(conAmbos('auto'))).toEqual(['canvas', 'video']);
    expect(animacionesParaProyecto(conAmbos('canvas'))).toEqual(['canvas', 'video']);
    expect(animacionesParaProyecto(conAmbos('video'))).toEqual(['video', 'canvas']);
  });

  it('el modo forzado por URL tiene prioridad sobre la configuración', () => {
    expect(animacionesParaProyecto(conAmbos('auto'), 'video')).toEqual(['video', 'canvas']);
    expect(animacionesParaProyecto(conAmbos('video'), 'canvas')).toEqual(['canvas', 'video']);
  });

  it('sólo ofrece lo que existe', () => {
    const soloVideo = proyectoPrueba('v');
    expect(animacionesParaProyecto(soloVideo, 'canvas')).toEqual(['video']);
  });

  it('sin Canvas 2D en el navegador, usa el video', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(animacionesParaProyecto(conAmbos('canvas'))).toEqual(['video']);
    vi.restoreAllMocks();
  });
});

describe('prepararAnimacion: respaldo', () => {
  it('usa la capa si carga bien', async () => {
    const creadas: Animacion[] = [];
    const a = await prepararAnimacion(conAmbos('auto'), {
      crear: (t) => {
        const x = animacionFalsa(t, false);
        creadas.push(x);
        return x;
      },
    });
    expect(a.tipo).toBe('canvas');
    expect(creadas).toHaveLength(1);
  });

  it('si la capa no inicializa, libera y cae al video avisando', async () => {
    const creadas: Animacion[] = [];
    const alRespaldo = vi.fn();
    const a = await prepararAnimacion(conAmbos('auto'), {
      crear: (t) => {
        const x = animacionFalsa(t, t === 'canvas');
        creadas.push(x);
        return x;
      },
      alRespaldo,
    });
    expect(a.tipo).toBe('video');
    expect(creadas[0].liberar).toHaveBeenCalled();
    expect(alRespaldo).toHaveBeenCalledWith('canvas', expect.any(Error));
  });

  it('si fallan todos los formatos, rechaza con el último error', async () => {
    await expect(
      prepararAnimacion(conAmbos('auto'), { crear: (t) => animacionFalsa(t, true) }),
    ).rejects.toThrow('video roto');
  });
});
