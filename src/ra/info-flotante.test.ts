import { describe, expect, it } from 'vitest';
import { contenidoInfo, rectDe, ubicarTarjeta, type Rect } from './info-flotante.ts';

const pantalla = (ancho: number, alto: number): Rect => ({ x0: 0, y0: 0, x1: ancho, y1: alto });

describe('contenidoInfo', () => {
  it('usa masInfo y, si no hay, la descripción', () => {
    expect(contenidoInfo({ nombre: 'A', masInfo: ['x'], descripcion: 'd' })?.parrafos).toEqual(['x']);
    expect(contenidoInfo({ nombre: 'A', descripcion: 'd' })?.parrafos).toEqual(['d']);
    expect(contenidoInfo({ nombre: 'A' })).toBeNull();
  });
});

describe('rectDe', () => {
  it('encierra las esquinas aunque el póster esté rotado', () => {
    expect(rectDe([{ x: 10, y: 5 }, { x: 50, y: 0 }, { x: 40, y: 80 }, { x: 0, y: 70 }])).toEqual({ x0: 0, y0: 0, x1: 50, y1: 80 });
  });
});

describe('ubicarTarjeta', () => {
  it('celular apaisado: va al costado, sin pisar el póster y dentro de la pantalla', () => {
    const poster = { x0: 280, y0: 20, x1: 560, y1: 380 };
    const u = ubicarTarjeta(poster, pantalla(844, 390), null, 300);
    expect(u.modo).toBe('tarjeta');
    if (u.modo !== 'tarjeta') return;
    expect(u.lado).toBe('derecha');
    expect(u.x).toBeGreaterThan(poster.x1);
    expect(u.x + u.ancho).toBeLessThanOrEqual(844);
    expect(u.y).toBeGreaterThanOrEqual(0);
    expect(u.ancla.x).toBe(poster.x1);
  });

  it('celular vertical con lugar abajo: va debajo del póster', () => {
    const poster = { x0: 60, y0: 80, x1: 330, y1: 460 };
    const u = ubicarTarjeta(poster, pantalla(390, 844), null, 250);
    expect(u.modo === 'tarjeta' && u.lado).toBe('abajo');
    if (u.modo === 'tarjeta') expect(u.y).toBeGreaterThan(poster.y1);
  });

  it('si el póster ocupa toda la pantalla, se reduce a un chip dentro de la zona útil', () => {
    const util = { x0: 0, y0: 90, x1: 390, y1: 700 };
    const u = ubicarTarjeta({ x0: -10, y0: 60, x1: 400, y1: 800 }, util, null);
    expect(u.modo).toBe('chip');
    if (u.modo !== 'chip') return;
    expect(u.x).toBeLessThanOrEqual(util.x1);
    expect(u.y).toBeGreaterThanOrEqual(util.y0);
  });

  it('se queda del mismo lado mientras siga entrando (no salta)', () => {
    // Un poco más de lugar a la izquierda, pero la tarjeta ya estaba a la derecha.
    const poster = { x0: 300, y0: 20, x1: 560, y1: 380 };
    const u = ubicarTarjeta(poster, pantalla(844, 390), 'derecha', 300);
    expect(u.modo === 'tarjeta' && u.lado).toBe('derecha');
  });

  it('centra la tarjeta a la altura del póster según su alto real', () => {
    const poster = { x0: 280, y0: 20, x1: 560, y1: 380 };
    const u = ubicarTarjeta(poster, pantalla(844, 390), null, 100);
    if (u.modo === 'tarjeta') expect(u.y + 50).toBeCloseTo(200);
  });
});
