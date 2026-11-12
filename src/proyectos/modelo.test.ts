import { describe, expect, it } from 'vitest';
import {
  ANIMACION_POR_DEFECTO,
  ARCHIVOS_POR_DEFECTO,
  REPRODUCCION_POR_DEFECTO,
  calcularAjuste,
  esSlugValido,
  normalizarManifiesto,
  ordenAnimaciones,
  slugificar,
} from './modelo.ts';

describe('slugs', () => {
  it('acepta slugs válidos y rechaza inválidos', () => {
    expect(esSlugValido('zonar')).toBe(true);
    expect(esSlugValido('proyecto-02')).toBe(true);
    expect(esSlugValido('Zonar')).toBe(false);
    expect(esSlugValido('con espacio')).toBe(false);
    expect(esSlugValido('-inicio')).toBe(false);
    expect(esSlugValido('doble--guion')).toBe(false);
    expect(esSlugValido('')).toBe(false);
    expect(esSlugValido('../escape')).toBe(false);
  });

  it('slugifica nombres en español', () => {
    expect(slugificar('ZonAR')).toBe('zonar');
    expect(slugificar('Proyecto Ñandú 2')).toBe('proyecto-nandu-2');
    expect(slugificar('  ¡Hola, Mundo!  ')).toBe('hola-mundo');
  });
});

describe('normalizarManifiesto', () => {
  it('completa valores por defecto con un manifiesto mínimo', () => {
    const r = normalizarManifiesto({ nombre: 'ZonAR' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.manifiesto).toMatchObject({
      nombre: 'ZonAR',
      activo: true,
      demo: false,
      orden: 100,
      archivos: ARCHIVOS_POR_DEFECTO,
      reproduccion: REPRODUCCION_POR_DEFECTO,
    });
  });

  it('respeta la configuración explícita', () => {
    const r = normalizarManifiesto({
      nombre: 'X',
      subtitulo: 'Lema',
      orden: 3,
      activo: false,
      equipo: ['Ana', ' Juan '],
      archivos: { poster: 'poster.png' },
      reproduccion: { bucle: false, ajuste: 'cubrir', alPerderSeguimiento: 'continuar', escala: 1.1, desplazamiento: { x: 0.01 } },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.manifiesto.archivos.poster).toBe('poster.png');
    expect(r.manifiesto.archivos.video).toBe('animacion.mp4');
    expect(r.manifiesto.equipo).toEqual(['Ana', 'Juan']);
    expect(r.manifiesto.reproduccion).toEqual({
      bucle: false,
      ajuste: 'cubrir',
      alPerderSeguimiento: 'continuar',
      reiniciarAlDetectar: false,
      escala: 1.1,
      desplazamiento: { x: 0.01, y: 0 },
    });
  });

  it('informa errores en lugar de romperse', () => {
    expect(normalizarManifiesto(null).ok).toBe(false);
    expect(normalizarManifiesto([]).ok).toBe(false);
    const r = normalizarManifiesto({
      nombre: '',
      activo: 'si',
      reproduccion: { ajuste: 'deformar', escala: -1 },
      archivos: { video: '../../etc/passwd' },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores.join('\n')).toMatch(/nombre/);
    expect(r.errores.join('\n')).toMatch(/activo/);
    expect(r.errores.join('\n')).toMatch(/ajuste/);
    expect(r.errores.join('\n')).toMatch(/escala/);
    expect(r.errores.join('\n')).toMatch(/archivos\.video/);
  });

  it('advierte campos desconocidos sin fallar', () => {
    const r = normalizarManifiesto({ nombre: 'X', colorFavorito: 'azul' });
    expect(r.ok && r.advertencias[0]).toMatch(/colorFavorito/);
  });
});

describe('calcularAjuste', () => {
  const config = { ajuste: 'auto' as const, escala: 1, desplazamiento: { x: 0, y: 0 } };
  const A4 = 1 / Math.SQRT2; // vertical

  it('cubre el póster exacto si las proporciones coinciden', () => {
    const a = calcularAjuste(A4, 720 / 1018, config);
    expect(a.modo).toBe('estirar');
    expect(a.advertencia).toBeUndefined();
    expect(a.plano.ancho).toBe(1);
    expect(a.plano.alto).toBeCloseTo(Math.SQRT2);
  });

  it('en auto con proporciones distintas NO deforma y advierte', () => {
    const a = calcularAjuste(A4, 9 / 16, config);
    expect(a.modo).toBe('contener');
    expect(a.advertencia).toMatch(/no coincide/);
    // Video más angosto: ocupa todo el alto y menos ancho, conservando su proporción.
    expect(a.plano.alto).toBeCloseTo(Math.SQRT2);
    expect(a.plano.ancho / a.plano.alto).toBeCloseTo(9 / 16);
  });

  it('contener con video más ancho ocupa todo el ancho', () => {
    const a = calcularAjuste(A4, 16 / 9, { ...config, ajuste: 'contener' });
    expect(a.plano.ancho).toBe(1);
    expect(a.plano.ancho / a.plano.alto).toBeCloseTo(16 / 9);
    expect(a.advertencia).toBeUndefined();
  });

  it('cubrir recorta la textura centrada', () => {
    const a = calcularAjuste(A4, 16 / 9, { ...config, ajuste: 'cubrir' });
    expect(a.plano.ancho).toBe(1);
    expect(a.plano.alto).toBeCloseTo(Math.SQRT2);
    expect(a.textura.repetirX).toBeCloseTo(A4 / (16 / 9));
    expect(a.textura.desplazarX).toBeCloseTo((1 - a.textura.repetirX) / 2);
    expect(a.textura.repetirY).toBe(1);
  });

  it('estirar explícito usa el tamaño del póster sin advertir', () => {
    const a = calcularAjuste(A4, 9 / 16, { ...config, ajuste: 'estirar' });
    expect(a.plano).toEqual({ ancho: 1, alto: Math.SQRT2 });
    expect(a.advertencia).toBeUndefined();
  });

  it('aplica escala y desplazamiento finos', () => {
    const a = calcularAjuste(A4, A4, { ajuste: 'auto', escala: 0.5, desplazamiento: { x: 0.1, y: -0.2 } });
    expect(a.plano.ancho).toBe(0.5);
    expect(a.posicion).toEqual({ x: 0.1, y: -0.2 });
  });
});

describe('configuración de animación', () => {
  it('por defecto: modo auto y valores razonables para la capa', () => {
    const r = normalizarManifiesto({ nombre: 'X' });
    expect(r.ok && r.manifiesto.animacion).toEqual(ANIMACION_POR_DEFECTO);
    expect(r.ok && r.manifiesto.archivos.capa).toBe('capa.js');
  });

  it('acepta modo y parámetros de la capa', () => {
    const r = normalizarManifiesto({
      nombre: 'X',
      archivos: { capa: 'zonar-overlay.js' },
      animacion: { modo: 'canvas', canvas: { global: 'ZonarAnim', ancho: 1131, alto: 1600, fps: 24, ladoMaximo: 768 } },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.manifiesto.archivos.capa).toBe('zonar-overlay.js');
    expect(r.manifiesto.animacion).toEqual({
      modo: 'canvas',
      canvas: { global: 'ZonarAnim', ancho: 1131, alto: 1600, fps: 24, ladoMaximo: 768 },
    });
  });

  it('rechaza configuraciones inválidas', () => {
    const r = normalizarManifiesto({
      nombre: 'X',
      animacion: { modo: 'gif', canvas: { global: 'no válido', fps: 0, ancho: 100 } },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const texto = r.errores.join('\n');
    expect(texto).toMatch(/animacion\.modo/);
    expect(texto).toMatch(/animacion\.canvas\.global/);
    expect(texto).toMatch(/animacion\.canvas\.fps/);
    expect(texto).toMatch(/van juntos/);
  });

  it('ordenAnimaciones: preferido primero y respaldo después, sólo lo disponible', () => {
    expect(ordenAnimaciones('auto', { video: true, canvas: true })).toEqual(['canvas', 'video']);
    expect(ordenAnimaciones('video', { video: true, canvas: true })).toEqual(['video', 'canvas']);
    expect(ordenAnimaciones('canvas', { video: true, canvas: false })).toEqual(['video']);
    expect(ordenAnimaciones('auto', { video: false, canvas: false })).toEqual([]);
  });
});

describe('normalizarManifiesto: masInfo', () => {
  it('acepta una lista de párrafos y une los saltos de línea de copia', () => {
    const r = normalizarManifiesto({ nombre: 'X', masInfo: ['Primer\npárrafo  largo.', '  ', 'Segundo.'] });
    expect(r.ok && r.manifiesto.masInfo).toEqual(['Primer párrafo largo.', 'Segundo.']);
  });

  it('acepta un texto con párrafos separados por una línea en blanco', () => {
    const r = normalizarManifiesto({ nombre: 'X', masInfo: 'Uno\ncontinúa.\n\nDos.' });
    expect(r.ok && r.manifiesto.masInfo).toEqual(['Uno continúa.', 'Dos.']);
  });

  it('es opcional y rechaza tipos inválidos', () => {
    const vacio = normalizarManifiesto({ nombre: 'X' });
    expect(vacio.ok && vacio.manifiesto.masInfo).toBeUndefined();
    const malo = normalizarManifiesto({ nombre: 'X', masInfo: [1, 2] });
    expect(malo.ok).toBe(false);
  });
});
