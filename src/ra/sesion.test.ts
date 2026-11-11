import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REPRODUCCION_POR_DEFECTO } from '../proyectos/modelo.ts';
import { ReproductorAnimacion } from './reproductor.ts';
import { SesionRA, haySesionActiva } from './sesion.ts';

vi.mock('./compatibilidad.ts', () => ({ diagnosticarCompatibilidad: () => null }));
// El motor real (TensorFlow.js + Worker) se prueba en la prueba E2E con cámara simulada.
vi.mock('mind-ar/dist/mindar-image.prod.js', () => ({ Controller: class {} }));

/** Stream de cámara falso con pistas espiables. */
function crearStream() {
  const pista = { stop: vi.fn(), addEventListener: vi.fn(), kind: 'video' };
  const stream = { getTracks: () => [pista], getVideoTracks: () => [pista] } as unknown as MediaStream;
  return { stream, pista };
}

function crearSesion(extra: Partial<ConstructorParameters<typeof SesionRA>[0]> = {}) {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  const animacion = new ReproductorAnimacion('/v.mp4', { bucle: true });
  const sesion = new SesionRA({
    contenedor,
    targetUrl: '/posters/x/target.mind',
    animacion,
    reproduccion: REPRODUCCION_POR_DEFECTO,
    ...extra,
  });
  return { sesion, contenedor, animacion };
}

describe('SesionRA: permisos y liberación de la cámara', () => {
  let getUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    // fetch que respeta la cancelación y nunca termina por sí solo
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_ok, error) => init?.signal?.addEventListener('abort', () => error(new DOMException('abort', 'AbortError')))),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('pide la cámara trasera, sin audio', async () => {
    getUserMedia.mockReturnValue(new Promise(() => {}));
    const { sesion } = crearSesion();
    sesion.iniciar().catch(() => {});
    await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    expect(getUserMedia).toHaveBeenCalledWith({ audio: false, video: { facingMode: { ideal: 'environment' } } });
    sesion.detener();
  });

  it('traduce "permiso denegado" y libera todo', async () => {
    getUserMedia.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    const { sesion } = crearSesion();
    await expect(sesion.iniciar()).rejects.toMatchObject({ codigo: 'permiso-denegado' });
    expect(sesion.activa).toBe(false);
    expect(haySesionActiva()).toBe(false);
  });

  it('traduce "cámara ocupada"', async () => {
    getUserMedia.mockRejectedValue(new DOMException('ocupada', 'NotReadableError'));
    const { sesion } = crearSesion();
    await expect(sesion.iniciar()).rejects.toMatchObject({ codigo: 'camara-ocupada' });
  });

  it('si se cierra mientras se espera el permiso, apaga la cámara apenas se concede', async () => {
    let conceder!: (s: MediaStream) => void;
    getUserMedia.mockReturnValue(new Promise<MediaStream>((ok) => (conceder = ok)));
    const { sesion } = crearSesion();
    const inicio = sesion.iniciar();
    await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalled());

    sesion.detener();
    const { stream, pista } = crearStream();
    conceder(stream);

    await expect(inicio).rejects.toMatchObject({ codigo: 'cancelado' });
    expect(pista.stop).toHaveBeenCalled();
  });

  it('al detener con la cámara abierta, detiene las pistas y quita el video del DOM', async () => {
    const { stream, pista } = crearStream();
    getUserMedia.mockResolvedValue(stream);
    const { sesion, contenedor } = crearSesion();
    const inicio = sesion.iniciar().catch((e) => e);

    const camara = await vi.waitFor(() => {
      const v = contenedor.querySelector<HTMLVideoElement>('video.ra-camara');
      if (!v) throw new Error('todavía no');
      return v;
    });
    expect(camara.muted).toBe(true);
    expect(camara.hasAttribute('playsinline')).toBe(true);

    sesion.detener();
    expect(pista.stop).toHaveBeenCalled();
    expect(camara.isConnected).toBe(false);
    expect((await inicio).codigo).toBe('cancelado');
  });

  it('sólo una sesión activa: iniciar otra cierra la anterior', async () => {
    const primero = crearStream();
    getUserMedia.mockResolvedValueOnce(primero.stream).mockReturnValue(new Promise(() => {}));
    const a = crearSesion();
    a.sesion.iniciar().catch(() => {});
    await vi.waitFor(() => expect(a.contenedor.querySelector('video.ra-camara')).not.toBeNull());

    const b = crearSesion();
    b.sesion.iniciar().catch(() => {});
    expect(a.sesion.activa).toBe(false);
    expect(primero.pista.stop).toHaveBeenCalled();
    b.sesion.detener();
  });
});
