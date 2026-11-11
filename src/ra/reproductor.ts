/**
 * Animación en video (MP4) con las reglas de autoplay móviles:
 * - Siempre silenciado + playsinline (requisito de Safari iOS y Chrome Android
 *   para reproducir sin gesto del usuario y sin pantalla completa).
 * - Si el navegador igual bloquea la reproducción (p. ej. iOS en modo de
 *   ahorro de energía), `reproducir()` devuelve "bloqueado" para que la UI
 *   ofrezca un botón explícito.
 * - Una sola instancia por experiencia; `liberar()` corta la descarga.
 */
import { LinearFilter, SRGBColorSpace, VideoTexture } from 'three';
import { Emisor, type Animacion, type EventoAnimacion, type ResultadoReproduccion } from './animacion.ts';
import { ErrorRA } from './errores.ts';

export type { ResultadoReproduccion } from './animacion.ts';

export interface OpcionesReproductor {
  bucle: boolean;
}

export class ReproductorAnimacion implements Animacion {
  readonly tipo = 'video' as const;
  readonly transparente = false;
  readonly video: HTMLVideoElement;
  private liberado = false;
  private readonly emisor = new Emisor();

  constructor(src: string, opciones: OpcionesReproductor) {
    const v = document.createElement('video');
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.loop = opciones.bucle;
    v.preload = 'auto';
    v.crossOrigin = 'anonymous';
    v.disablePictureInPicture = true;
    v.setAttribute('aria-hidden', 'true');
    v.src = src;
    v.addEventListener('play', () => this.emisor.emitir('reproduciendo'));
    v.addEventListener('pause', () => {
      if (!v.ended) this.emisor.emitir('pausado');
    });
    v.addEventListener('ended', () => this.emisor.emitir('terminado'));
    this.video = v;
  }

  get elemento(): HTMLElement {
    return this.video;
  }

  /**
   * Espera a conocer las dimensiones del video. En iOS la precarga sin gesto
   * puede no arrancar: si tarda, se "ceba" con play()+pause() (permitido por
   * estar silenciado).
   */
  cargar(timeoutMs = 30000): Promise<void> {
    const v = this.video;
    if (v.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();

    return new Promise<void>((resolver, rechazar) => {
      const limpiar = () => {
        clearTimeout(cebado);
        clearTimeout(limite);
        v.removeEventListener('loadedmetadata', ok);
        v.removeEventListener('error', fallo);
      };
      const ok = () => {
        limpiar();
        resolver();
      };
      const fallo = () => {
        limpiar();
        rechazar(new ErrorRA('video-error', v.error));
      };
      const cebado = setTimeout(() => {
        if (this.liberado || v.readyState >= HTMLMediaElement.HAVE_METADATA) return;
        v.play()
          .then(() => v.pause())
          .catch(() => {});
      }, 2500);
      const limite = setTimeout(fallo, timeoutMs);
      v.addEventListener('loadedmetadata', ok);
      v.addEventListener('error', fallo);
      v.load();
    });
  }

  get proporcion(): number {
    return this.video.videoWidth / this.video.videoHeight;
  }

  get pausado(): boolean {
    return this.video.paused;
  }

  get tiempo(): number {
    return this.video.currentTime;
  }

  crearTextura(): VideoTexture {
    const textura = new VideoTexture(this.video);
    textura.colorSpace = SRGBColorSpace;
    textura.minFilter = LinearFilter;
    textura.magFilter = LinearFilter;
    textura.generateMipmaps = false;
    return textura;
  }

  /** VideoTexture se actualiza sola. */
  actualizar(): void {}

  async reproducir(): Promise<ResultadoReproduccion> {
    if (this.liberado) return 'error';
    const v = this.video;
    if (v.ended && !v.loop) v.currentTime = 0;
    try {
      await v.play();
      return 'reproduciendo';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotAllowedError') return 'bloqueado';
      // AbortError: play() interrumpido por un pause() posterior; no es un fallo real.
      if (e instanceof DOMException && e.name === 'AbortError') return v.paused ? 'bloqueado' : 'reproduciendo';
      return 'error';
    }
  }

  pausar(): void {
    if (!this.video.paused) this.video.pause();
  }

  /** Vuelve al inicio. Si `reproducir` es true, además lo inicia. */
  async reiniciar(reproducir: boolean): Promise<ResultadoReproduccion | null> {
    this.video.currentTime = 0;
    return reproducir ? this.reproducir() : null;
  }

  alCambiar(fn: (evento: EventoAnimacion) => void): () => void {
    return this.emisor.suscribir(fn);
  }

  /** Detiene, corta la descarga y saca el elemento del DOM. Idempotente. */
  liberar(): void {
    if (this.liberado) return;
    this.liberado = true;
    this.emisor.limpiar();
    const v = this.video;
    v.pause();
    v.removeAttribute('src');
    v.load();
    v.remove();
  }
}
