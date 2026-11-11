import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReproductorAnimacion } from './reproductor.ts';

function simularPlay(impl: () => Promise<void>) {
  return vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(impl);
}

describe('ReproductorAnimacion', () => {
  afterEach(() => vi.restoreAllMocks());

  it('crea el video silenciado, inline y con bucle según la configuración', () => {
    const r = new ReproductorAnimacion('/posters/zonar/animacion.mp4', { bucle: true });
    const v = r.video;
    expect(v.muted).toBe(true);
    expect(v.hasAttribute('muted')).toBe(true);
    expect(v.playsInline).toBe(true);
    expect(v.hasAttribute('playsinline')).toBe(true);
    expect(v.hasAttribute('webkit-playsinline')).toBe(true);
    expect(v.loop).toBe(true);
    expect(v.getAttribute('src')).toBe('/posters/zonar/animacion.mp4');
    expect(new ReproductorAnimacion('/v.mp4', { bucle: false }).video.loop).toBe(false);
  });

  it('informa "bloqueado" si el navegador impide el autoplay', async () => {
    simularPlay(() => Promise.reject(new DOMException('bloqueado', 'NotAllowedError')));
    const r = new ReproductorAnimacion('/v.mp4', { bucle: true });
    expect(await r.reproducir()).toBe('bloqueado');
  });

  it('informa "reproduciendo" cuando play() funciona', async () => {
    simularPlay(() => Promise.resolve());
    const r = new ReproductorAnimacion('/v.mp4', { bucle: true });
    expect(await r.reproducir()).toBe('reproduciendo');
  });

  it('informa "error" ante fallos de decodificación', async () => {
    simularPlay(() => Promise.reject(new DOMException('formato', 'NotSupportedError')));
    const r = new ReproductorAnimacion('/v.mp4', { bucle: true });
    expect(await r.reproducir()).toBe('error');
  });

  it('reiniciar vuelve al segundo 0', async () => {
    const play = simularPlay(() => Promise.resolve());
    const r = new ReproductorAnimacion('/v.mp4', { bucle: true });
    r.video.currentTime = 3;
    await r.reiniciar(false);
    expect(r.video.currentTime).toBe(0);
    expect(play).not.toHaveBeenCalled();
    await r.reiniciar(true);
    expect(play).toHaveBeenCalledOnce();
  });

  it('liberar corta la descarga, saca el video del DOM y es idempotente', async () => {
    const r = new ReproductorAnimacion('/v.mp4', { bucle: true });
    document.body.appendChild(r.video);
    r.liberar();
    r.liberar();
    expect(r.video.hasAttribute('src')).toBe(false);
    expect(r.video.isConnected).toBe(false);
    expect(await r.reproducir()).toBe('error');
  });

  it('cargar() rechaza con video-error si el archivo falla', async () => {
    const r = new ReproductorAnimacion('/no-existe.mp4', { bucle: true });
    const promesa = r.cargar(5000);
    r.video.dispatchEvent(new Event('error'));
    await expect(promesa).rejects.toMatchObject({ codigo: 'video-error' });
  });

  it('cargar() resuelve al conocer las dimensiones', async () => {
    const r = new ReproductorAnimacion('/v.mp4', { bucle: true });
    const promesa = r.cargar(5000);
    r.video.dispatchEvent(new Event('loadedmetadata'));
    await expect(promesa).resolves.toBeUndefined();
  });
});
