// @vitest-environment node
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { escanearProyectos } from './escaner.ts';
import { leerDimensionesMp4 } from './mp4.ts';
import { leerDimensionesMind, sha1 } from './target-meta.ts';

/** Recursos pequeños y fijos (independientes de los pósters reales). */
const FIXTURES = resolve(import.meta.dirname, 'fixtures');

let dir: string;

function crearProyecto(slug: string, manifiesto: unknown, archivos: string[] = []) {
  const carpeta = join(dir, slug);
  mkdirSync(carpeta, { recursive: true });
  if (manifiesto !== undefined) {
    writeFileSync(join(carpeta, 'proyecto.json'), typeof manifiesto === 'string' ? manifiesto : JSON.stringify(manifiesto));
  }
  for (const a of archivos) copyFileSync(join(FIXTURES, a), join(carpeta, a));
  return carpeta;
}

describe('escáner de proyectos', () => {
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'posters-'));
    crearProyecto('completo', { nombre: 'Completo', orden: 2 }, ['poster.jpg', 'animacion.mp4', 'target.mind', 'miniatura.jpg', 'target.meta.json']);
    crearProyecto('sin-video', { nombre: 'Sin video', orden: 1 }, ['poster.jpg', 'target.mind']);
    crearProyecto('vacio', { nombre: 'Vacío' });
    crearProyecto('oculto', { nombre: 'Oculto', activo: false }, ['poster.jpg', 'animacion.mp4', 'target.mind']);
    crearProyecto('json-roto', '{ "nombre": ');
    crearProyecto('sin-manifiesto', undefined, ['poster.jpg']);
    crearProyecto('Mayusculas', { nombre: 'X' });
    crearProyecto('_plantilla', { nombre: 'Ignorada' });
    crearProyecto('invalido', { nombre: 'Inválido', reproduccion: { ajuste: 'deformar' } });
    const otro = crearProyecto('poster-cambiado', { nombre: 'Póster cambiado' }, ['poster.jpg', 'animacion.mp4', 'target.mind', 'target.meta.json']);
    writeFileSync(join(otro, 'poster.jpg'), Buffer.concat([readFileSync(join(otro, 'poster.jpg')), Buffer.from('x')]));
    const roto = crearProyecto('target-roto', { nombre: 'Target roto' }, ['poster.jpg', 'animacion.mp4']);
    writeFileSync(join(roto, 'target.mind'), 'esto no es msgpack de mindar');
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('no se rompe si la carpeta de pósters no existe (inicio sin proyectos)', () => {
    expect(escanearProyectos({ dirPosters: join(dir, 'no-existe') })).toEqual({ proyectos: [], problemas: [] });
  });

  it('incluye proyectos válidos (completos o no), ordenados, e ignora plantillas', () => {
    const { proyectos } = escanearProyectos({ dirPosters: dir });
    expect(proyectos.map((p) => p.slug)).toEqual(['sin-video', 'completo', 'oculto', 'poster-cambiado', 'target-roto', 'vacio']);
  });

  it('un proyecto completo apunta a SUS archivos, con versión para la caché', () => {
    const p = escanearProyectos({ dirPosters: dir }).proyectos.find((x) => x.slug === 'completo')!;
    expect(p.estado).toMatchObject({ listoParaRA: true, listoParaVideo: true, faltantes: [] });
    const hash = sha1(readFileSync(join(FIXTURES, 'animacion.mp4'))).slice(0, 10);
    expect(p.urls.video).toBe(`/posters/completo/animacion.mp4?v=${hash}`);
    expect(p.urls.poster).toMatch(/^\/posters\/completo\/poster\.jpg\?v=[0-9a-f]{10}$/);
    expect(p.urls.target).toMatch(/^\/posters\/completo\/target\.mind\?v=/);
    expect(p.urls.miniatura).toMatch(/^\/posters\/completo\/miniatura\.jpg\?v=/);
    expect(p.medidas.poster).toEqual({ ancho: 240, alto: 340 });
    expect(p.medidas.video).toEqual({ ancho: 72, alto: 102 });
    expect(p.medidas.target).toEqual({ ancho: 240, alto: 340 });
    expect(p.estado.advertencias).toEqual([]);
  });

  it('marca faltantes sin excluir el proyecto', () => {
    const { proyectos } = escanearProyectos({ dirPosters: dir });
    const sinVideo = proyectos.find((x) => x.slug === 'sin-video')!;
    expect(sinVideo.estado).toMatchObject({ listoParaRA: false, listoParaVideo: false, faltantes: ['animacion'], animaciones: [] });
    expect(sinVideo.urls.video).toBeUndefined();
    const vacio = proyectos.find((x) => x.slug === 'vacio')!;
    expect(vacio.estado.faltantes).toEqual(['poster', 'target', 'animacion']);
  });

  it('conserva los inactivos (la app decide no mostrarlos)', () => {
    const oculto = escanearProyectos({ dirPosters: dir }).proyectos.find((x) => x.slug === 'oculto')!;
    expect(oculto.activo).toBe(false);
    expect(oculto.estado.listoParaRA).toBe(true);
  });

  it('reporta carpetas inválidas como problemas', () => {
    const { problemas } = escanearProyectos({ dirPosters: dir });
    const porCarpeta = Object.fromEntries(problemas.map((p) => [p.carpeta, p.errores.join(' ')]));
    expect(Object.keys(porCarpeta).sort()).toEqual(['Mayusculas', 'invalido', 'json-roto', 'sin-manifiesto']);
    expect(porCarpeta['json-roto']).toMatch(/JSON válido/);
    expect(porCarpeta['sin-manifiesto']).toMatch(/Falta proyecto\.json/);
    expect(porCarpeta['Mayusculas']).toMatch(/slug válido/);
    expect(porCarpeta['invalido']).toMatch(/ajuste/);
  });

  it('avisa si el póster cambió después de compilar target.mind', () => {
    const p = escanearProyectos({ dirPosters: dir }).proyectos.find((x) => x.slug === 'poster-cambiado')!;
    expect(p.estado.advertencias.join()).toMatch(/póster cambió/);
  });

  it('un target.mind inválido cuenta como faltante', () => {
    const p = escanearProyectos({ dirPosters: dir }).proyectos.find((x) => x.slug === 'target-roto')!;
    expect(p.estado.faltantes).toEqual(['target']);
    expect(p.estado.advertencias.join()).toMatch(/no es un archivo de MindAR válido/);
  });
});

describe('lectores de metadatos', () => {
  it('lee las dimensiones del MP4', () => {
    expect(leerDimensionesMp4(readFileSync(join(FIXTURES, 'animacion.mp4')))).toEqual({ ancho: 72, alto: 102 });
    expect(leerDimensionesMp4(new Uint8Array([0, 0, 0, 8, 1, 2, 3, 4]))).toBeNull();
    expect(leerDimensionesMp4(readFileSync(join(FIXTURES, 'poster.jpg')))).toBeNull();
  });

  it('lee las dimensiones del target.mind', () => {
    expect(leerDimensionesMind(readFileSync(join(FIXTURES, 'target.mind')))).toEqual({ ancho: 240, alto: 340 });
    expect(leerDimensionesMind(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe('escáner: modos de animación (video / capa Canvas)', () => {
  let dirModos: string;
  const canvas = { global: 'CapaPrueba', ancho: 240, alto: 340 };
  const crear = (slug: string, manifiesto: unknown, archivos: string[]) => {
    const carpeta = join(dirModos, slug);
    mkdirSync(carpeta, { recursive: true });
    writeFileSync(join(carpeta, 'proyecto.json'), JSON.stringify(manifiesto));
    for (const a of archivos) copyFileSync(join(FIXTURES, a), join(carpeta, a));
    return carpeta;
  };
  const buscar = (slug: string) => escanearProyectos({ dirPosters: dirModos }).proyectos.find((p) => p.slug === slug)!;

  beforeAll(() => {
    dirModos = mkdtempSync(join(tmpdir(), 'posters-modos-'));
    crear('ambos-auto', { nombre: 'A', animacion: { canvas } }, ['poster.jpg', 'target.mind', 'animacion.mp4', 'capa.js']);
    crear('ambos-video', { nombre: 'B', animacion: { modo: 'video', canvas } }, ['poster.jpg', 'target.mind', 'animacion.mp4', 'capa.js']);
    crear('solo-capa', { nombre: 'C', animacion: { modo: 'canvas', canvas } }, ['poster.jpg', 'target.mind', 'capa.js']);
    crear('canvas-sin-capa', { nombre: 'D', animacion: { modo: 'canvas' } }, ['poster.jpg', 'target.mind', 'animacion.mp4']);
    crear('capa-desproporcionada', { nombre: 'E', animacion: { canvas: { global: 'CapaPrueba', ancho: 300, alto: 300 } } }, ['poster.jpg', 'target.mind', 'capa.js']);
    crear('capa-otro-global', { nombre: 'F', animacion: { canvas: { global: 'OtraCapa', ancho: 240, alto: 340 } } }, ['poster.jpg', 'target.mind', 'capa.js']);
  });

  afterAll(() => rmSync(dirModos, { recursive: true, force: true }));

  it('con video y capa, auto prefiere la capa y deja el video de respaldo', () => {
    const p = buscar('ambos-auto');
    expect(p.estado.animaciones).toEqual(['canvas', 'video']);
    expect(p.urls.capa).toMatch(/^\/posters\/ambos-auto\/capa\.js\?v=[0-9a-f]{10}$/);
    expect(p.medidas.capa).toEqual({ ancho: 240, alto: 340 });
    expect(p.estado.advertencias.filter((a) => !a.startsWith('Sin miniatura'))).toEqual([]);
  });

  it('video prefiere el MP4 y deja la capa de respaldo', () => {
    expect(buscar('ambos-video').estado.animaciones).toEqual(['video', 'canvas']);
  });

  it('un proyecto sólo con capa (sin MP4) está listo para RA y para verse sin RA', () => {
    const p = buscar('solo-capa');
    expect(p.estado).toMatchObject({ listoParaRA: true, listoParaVideo: true, animaciones: ['canvas'], faltantes: [] });
  });

  it('modo canvas sin capa: usa el video y lo advierte', () => {
    const p = buscar('canvas-sin-capa');
    expect(p.estado.animaciones).toEqual(['video']);
    expect(p.estado.advertencias.join()).toMatch(/falta la capa.*se usará el video/);
  });

  it('advierte si la capa no tiene la proporción del póster', () => {
    expect(buscar('capa-desproporcionada').estado.advertencias.join()).toMatch(/no tiene la proporción del póster/);
  });

  it('advierte si el script no menciona el objeto global configurado', () => {
    expect(buscar('capa-otro-global').estado.advertencias.join()).toMatch(/no menciona el objeto global "OtraCapa"/);
  });
});
