import { describe, expect, it } from 'vitest';
import { PROGRESO_INICIAL, estadoInicialRA, porcentajeCarga, reducirRA, type AccionRA, type EstadoRA } from './estado.ts';

const aplicar = (acciones: AccionRA[], desde: EstadoRA = estadoInicialRA) => acciones.reduce(reducirRA, desde);

describe('máquina de estados de la RA', () => {
  it('carga → buscando → detectado → perdido → detectado', () => {
    let e = aplicar([{ tipo: 'listo' }]);
    expect(e.fase).toBe('buscando');
    e = reducirRA(e, { tipo: 'detectado' });
    expect(e).toMatchObject({ fase: 'detectado', yaDetectado: true });
    e = reducirRA(e, { tipo: 'perdido' });
    expect(e.fase).toBe('perdido');
    e = reducirRA(e, { tipo: 'detectado' });
    expect(e.fase).toBe('detectado');
  });

  it('"perdido" sólo aplica si estaba detectado', () => {
    expect(aplicar([{ tipo: 'listo' }, { tipo: 'perdido' }]).fase).toBe('buscando');
  });

  it('un error no se pisa con eventos de seguimiento tardíos', () => {
    const e = aplicar([{ tipo: 'listo' }, { tipo: 'error', codigo: 'camara-interrumpida' }, { tipo: 'detectado' }]);
    expect(e.fase).toBe('error');
    expect(e.error).toBe('camara-interrumpida');
  });

  it('reintentar vuelve al estado inicial e incrementa el intento (reinicia la sesión)', () => {
    const e = aplicar([{ tipo: 'listo' }, { tipo: 'error', codigo: 'permiso-denegado' }, { tipo: 'reintentar' }]);
    expect(e).toEqual({ ...estadoInicialRA, intento: 1 });
  });

  it('la ayuda sólo se muestra mientras se busca y se oculta al detectar', () => {
    expect(aplicar([{ tipo: 'mostrarAyuda' }]).ayudaVisible).toBe(false);
    const e = aplicar([{ tipo: 'listo' }, { tipo: 'mostrarAyuda' }]);
    expect(e.ayudaVisible).toBe(true);
    expect(reducirRA(e, { tipo: 'detectado' }).ayudaVisible).toBe(false);
  });

  it('calcula el porcentaje de carga', () => {
    expect(porcentajeCarga(PROGRESO_INICIAL)).toBe(0);
    expect(porcentajeCarga({ motor: true, target: 0.5, camara: true, animacion: false, calibrando: false })).toBe(63);
    expect(porcentajeCarga({ motor: true, target: 1, camara: true, animacion: true, calibrando: true })).toBe(100);
  });

  it('registra el formato en uso y conserva el aviso de respaldo al reintentar', () => {
    const e = aplicar([{ tipo: 'respaldo', desde: 'canvas' }, { tipo: 'animacion', valor: 'video' }, { tipo: 'reintentar' }]);
    expect(e.respaldo).toBe('canvas');
    expect(e.animacion).toBeUndefined();
    expect(reducirRA(e, { tipo: 'animacion', valor: 'video' }).animacion).toBe('video');
  });
});
