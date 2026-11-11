import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimacionCanvas, _reiniciarCacheCapas, obtenerApiCapa, type ApiCapa } from './capa-canvas.ts';

const OPCIONES = { global: 'CapaPrueba', fps: 30, ladoMaximo: 1024, bucle: true };

/** Simula la carga del <script>: al insertarlo define el global y dispara onload. */
function simularScript(api: ApiCapa | null, global = 'CapaPrueba') {
  const original = document.head.appendChild.bind(document.head);
  return vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(nodo: T): T => {
    if (nodo instanceof HTMLScriptElement) {
      queueMicrotask(() => {
        if (api) (window as unknown as Record<string, unknown>)[global] = api;
        nodo.onload?.(new Event('load'));
      });
      return nodo;
    }
    return original(nodo);
  });
}

function apiPrueba(extra: Partial<ApiCapa> = {}) {
  const base = {
    WIDTH: 1131,
    HEIGHT: 1600,
    DURATION: 10,
    load: vi.fn(() => Promise.resolve()),
    render: vi.fn<(ctx: CanvasRenderingContext2D, t: number) => void>(),
  };
  return { ...base, ...extra } as typeof base;
}

describe('AnimacionCanvas', () => {
  beforeEach(() => _reiniciarCacheCapas());
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as unknown as Record<string, unknown>).CapaPrueba;
  });

  it('carga el script, llama a load() y prepara una textura reducida con la proporción del póster', async () => {
    const api = apiPrueba();
    simularScript(api);
    const a = new AnimacionCanvas('/posters/x/capa.js', OPCIONES);
    await a.cargar();
    expect(api.load).toHaveBeenCalledOnce();
    expect(a.proporcion).toBeCloseTo(1131 / 1600);
    expect(a.transparente).toBe(true);
    const { anchoTextura, altoTextura } = a.estadisticas();
    expect(altoTextura).toBe(1024); // lado mayor limitado
    expect(anchoTextura).toBe(Math.round(1131 * (1024 / 1600)));
    // Cuadro de prueba inicial en t=0 (póster intacto)
    expect(api.render).toHaveBeenCalledWith(expect.anything(), 0);
    const textura = a.crearTextura();
    expect(textura.premultiplyAlpha).toBe(true);
    expect(a.crearTextura()).toBe(textura);
  });

  it('el script se descarga y prepara una sola vez por página', async () => {
    const api = apiPrueba();
    const espia = simularScript(api);
    await new AnimacionCanvas('/c.js', OPCIONES).cargar();
    await new AnimacionCanvas('/c.js', OPCIONES).cargar();
    expect(espia.mock.calls.filter(([n]) => n instanceof HTMLScriptElement)).toHaveLength(1);
    expect(api.load).toHaveBeenCalledOnce();
  });

  it('falla con capa-error si el script no define la API', async () => {
    simularScript(null);
    await expect(new AnimacionCanvas('/c.js', OPCIONES).cargar()).rejects.toMatchObject({ codigo: 'capa-error' });
  });

  it('falla con capa-error si render() lanza en el cuadro de prueba', async () => {
    simularScript(apiPrueba({ render: () => { throw new Error('roto'); } }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(new AnimacionCanvas('/c.js', OPCIONES).cargar()).rejects.toMatchObject({ codigo: 'capa-error' });
  });

  it('reloj: no avanza en pausa, dibuja sólo si el póster está visible y respeta los FPS', async () => {
    const api = apiPrueba();
    simularScript(api);
    const a = new AnimacionCanvas('/c.js', OPCIONES);
    await a.cargar();
    api.render.mockClear();
    const ahora = vi.spyOn(performance, 'now');

    ahora.mockReturnValue(1000);
    a.actualizar(1000, true);
    expect(api.render).not.toHaveBeenCalled(); // pausado: no dibuja

    expect(await a.reproducir()).toBe('reproduciendo');
    a.actualizar(1500, true);
    expect(api.render).toHaveBeenLastCalledWith(expect.anything(), 0.5);
    a.actualizar(1510, true); // < 1/30 s después: se salta
    expect(api.render).toHaveBeenCalledTimes(1);
    a.actualizar(1600, false); // póster no visible: no dibuja
    expect(api.render).toHaveBeenCalledTimes(1);
    a.actualizar(1700, true);
    expect(api.render).toHaveBeenLastCalledWith(expect.anything(), 0.7);

    ahora.mockReturnValue(2000);
    a.pausar();
    expect(a.pausado).toBe(true);
    ahora.mockReturnValue(9000);
    expect(a.tiempo).toBeCloseTo(1); // la pausa congela el reloj
    a.actualizar(9000, true);
    expect(api.render).toHaveBeenCalledTimes(2);
  });

  it('reiniciar vuelve a 0 (Repetir)', async () => {
    const api = apiPrueba();
    simularScript(api);
    const a = new AnimacionCanvas('/c.js', OPCIONES);
    await a.cargar();
    const ahora = vi.spyOn(performance, 'now').mockReturnValue(0);
    await a.reproducir();
    ahora.mockReturnValue(4000);
    expect(a.tiempo).toBeCloseTo(4);
    await a.reiniciar(true);
    expect(a.tiempo).toBeCloseTo(0);
    expect(api.render).toHaveBeenLastCalledWith(expect.anything(), 0);
  });

  it('sin bucle, emite "terminado" al final y queda en el último cuadro', async () => {
    const api = apiPrueba({ DURATION: 2 });
    simularScript(api);
    const a = new AnimacionCanvas('/c.js', { ...OPCIONES, bucle: false });
    await a.cargar();
    const eventos: string[] = [];
    a.alCambiar((e) => eventos.push(e));
    vi.spyOn(performance, 'now').mockReturnValue(0);
    await a.reproducir();
    a.actualizar(2500, true);
    expect(eventos).toEqual(['reproduciendo', 'terminado']);
    expect(api.render).toHaveBeenLastCalledWith(expect.anything(), 2);
    expect(a.pausado).toBe(true);
    // Reproducir de nuevo reinicia desde 0
    await a.reproducir();
    expect(a.tiempo).toBeCloseTo(0);
  });

  it('si render() falla en uso, emite "error" y deja de dibujar', async () => {
    let fallar = false;
    const api = apiPrueba({ render: vi.fn(() => { if (fallar) throw new Error('x'); }) });
    simularScript(api);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = new AnimacionCanvas('/c.js', OPCIONES);
    await a.cargar();
    const eventos: string[] = [];
    a.alCambiar((e) => eventos.push(e));
    vi.spyOn(performance, 'now').mockReturnValue(0);
    await a.reproducir();
    fallar = true;
    a.actualizar(100, true);
    expect(eventos).toContain('error');
    expect(await a.reproducir()).toBe('error');
  });

  it('liberar detiene el reloj, suelta la memoria del lienzo y es idempotente', async () => {
    simularScript(apiPrueba());
    const a = new AnimacionCanvas('/c.js', OPCIONES);
    await a.cargar();
    await a.reproducir();
    a.liberar();
    a.liberar();
    expect(a.pausado).toBe(true);
    expect(a.estadisticas().anchoTextura).toBe(0);
    expect(await a.reproducir()).toBe('error');
  });

  it('obtenerApiCapa permite reintentar después de un fallo de descarga', async () => {
    const original = document.head.appendChild.bind(document.head);
    let intentos = 0;
    vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(nodo: T): T => {
      if (!(nodo instanceof HTMLScriptElement)) return original(nodo);
      intentos++;
      queueMicrotask(() => {
        if (intentos === 1) nodo.onerror?.(new Event('error'));
        else {
          (window as unknown as Record<string, unknown>).CapaPrueba = apiPrueba();
          nodo.onload?.(new Event('load'));
        }
      });
      return nodo;
    });
    await expect(obtenerApiCapa('/c.js', 'CapaPrueba')).rejects.toThrow(/No se pudo descargar/);
    await expect(obtenerApiCapa('/c.js', 'CapaPrueba')).resolves.toBeTruthy();
    expect(intentos).toBe(2);
  });
});
