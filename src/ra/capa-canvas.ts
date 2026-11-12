/**
 * Animación como capa Canvas 2D transparente.
 *
 * El script del proyecto (archivos.capa) define un objeto global con:
 *   load(): Promise<void>          prepara sus recursos (se llama una vez por página)
 *   render(ctx, segundos): void    dibuja SOLO lo animado sobre fondo transparente,
 *                                  en coordenadas del póster (WIDTH × HEIGHT)
 *   WIDTH, HEIGHT, DURATION
 * (Es la API de zonar-overlay.js.) La plataforma maneja el reloj, el borrado
 * del lienzo, la escala de la textura y los cuadros por segundo.
 */
import { CanvasTexture, LinearFilter, NoColorSpace } from 'three';
import type { ConfigCanvas } from '../proyectos/modelo.ts';
import { Emisor, type Animacion, type EventoAnimacion, type ResultadoReproduccion } from './animacion.ts';
import { ErrorRA } from './errores.ts';

export interface ApiCapa {
  load?: () => Promise<void> | void;
  render: (ctx: CanvasRenderingContext2D, segundos: number) => void;
  WIDTH?: number;
  HEIGHT?: number;
  DURATION?: number;
  /**
   * Margen alrededor del póster (fracción por lado). Con margen, WIDTH × HEIGHT es el lienzo completo
   * y el póster ocupa el centro: WIDTH / (1 + 2·MARGIN) × HEIGHT / (1 + 2·MARGIN).
   */
  MARGIN?: number;
}

/** Margen válido declarado por una capa (0 si no declara o es inválido). */
export function margenCapa(api: Pick<ApiCapa, 'MARGIN'>): number {
  const m = api.MARGIN;
  return typeof m === 'number' && Number.isFinite(m) && m > 0 && m <= 1 ? m : 0;
}

const TIEMPO_MAXIMO_CARGA = 15000;

/** Scripts ya insertados (por URL) y capas ya preparadas (por URL + global). */
const scripts = new Map<string, Promise<void>>();
const capas = new Map<string, Promise<ApiCapa>>();

function conLimite<T>(promesa: Promise<T>, ms: number, mensaje: string): Promise<T> {
  return new Promise<T>((ok, error) => {
    const t = setTimeout(() => error(new Error(mensaje)), ms);
    promesa.then(
      (v) => {
        clearTimeout(t);
        ok(v);
      },
      (e) => {
        clearTimeout(t);
        error(e);
      },
    );
  });
}

function insertarScript(url: string): Promise<void> {
  let p = scripts.get(url);
  if (!p) {
    p = new Promise<void>((ok, error) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.dataset.capa = '';
      s.onload = () => ok();
      s.onerror = () => {
        s.remove();
        scripts.delete(url);
        error(new Error(`No se pudo descargar la capa ${url}`));
      };
      document.head.appendChild(s);
    });
    scripts.set(url, p);
  }
  return p;
}

/** Descarga el script de la capa, verifica su API y llama a load() (una sola vez por página). */
export function obtenerApiCapa(url: string, global: string): Promise<ApiCapa> {
  const clave = `${url}#${global}`;
  let p = capas.get(clave);
  if (!p) {
    p = (async () => {
      await conLimite(insertarScript(url), TIEMPO_MAXIMO_CARGA, 'La capa tardó demasiado en descargarse');
      const api = (window as unknown as Record<string, unknown>)[global] as ApiCapa | undefined;
      if (!api || typeof api.render !== 'function') {
        throw new Error(`La capa no define ${global}.render(ctx, segundos)`);
      }
      if (typeof api.load === 'function') {
        await conLimite(Promise.resolve(api.load()), TIEMPO_MAXIMO_CARGA, 'La capa tardó demasiado en prepararse');
      }
      return api;
    })();
    // Si falla, permitir reintentar más tarde.
    p.catch(() => capas.delete(clave));
    capas.set(clave, p);
  }
  return p;
}

export interface OpcionesCapa extends Pick<ConfigCanvas, 'global' | 'fps' | 'ladoMaximo' | 'ancho' | 'alto'> {
  bucle: boolean;
}

export interface EstadisticasCapa {
  cuadros: number;
  msPromedio: number;
  msMaximo: number;
  anchoTextura: number;
  altoTextura: number;
}

export class AnimacionCanvas implements Animacion {
  readonly tipo = 'canvas' as const;
  readonly transparente = true;
  readonly elemento = null;

  private api?: ApiCapa;
  private readonly lienzo = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D | null = null;
  private textura?: CanvasTexture;
  private ancho = 0;
  private alto = 0;
  private escala = 1;
  private duracion = 0;
  private margenCapa = 0;
  private readonly emisor = new Emisor();
  private liberado = false;
  private fallida = false;

  // Reloj propio: segundos acumulados + inicio del tramo en curso (null = pausado).
  private acumulado = 0;
  private inicioTramo: number | null = null;
  private terminado = false;
  private ultimoDibujo = -Infinity;

  private readonly stats = { cuadros: 0, msTotal: 0, msMaximo: 0 };

  private readonly url: string;
  private readonly opciones: OpcionesCapa;

  constructor(url: string, opciones: OpcionesCapa) {
    this.url = url;
    this.opciones = opciones;
  }

  get proporcion(): number {
    return this.ancho / this.alto;
  }

  get margen(): number {
    return this.margenCapa;
  }

  get pausado(): boolean {
    return this.inicioTramo === null;
  }

  get tiempo(): number {
    return this.tiempoEn(performance.now());
  }

  get duracionSegundos(): number {
    return this.duracion;
  }

  estadisticas(): EstadisticasCapa {
    const { cuadros, msTotal, msMaximo } = this.stats;
    return { cuadros, msPromedio: cuadros ? msTotal / cuadros : 0, msMaximo, anchoTextura: this.lienzo.width, altoTextura: this.lienzo.height };
  }

  async cargar(): Promise<void> {
    try {
      const api = await obtenerApiCapa(this.url, this.opciones.global);
      if (this.liberado) throw new ErrorRA('cancelado');
      const ancho = api.WIDTH ?? this.opciones.ancho;
      const alto = api.HEIGHT ?? this.opciones.alto;
      const duracion = api.DURATION;
      if (!ancho || !alto || ancho <= 0 || alto <= 0) throw new Error('La capa no informa WIDTH/HEIGHT');
      if (!duracion || duracion <= 0) throw new Error('La capa no informa DURATION');
      this.api = api;
      this.ancho = ancho;
      this.alto = alto;
      this.duracion = duracion;
      this.margenCapa = margenCapa(api);

      // Textura más chica que el póster: la cámara rara vez muestra más detalle,
      // y subir menos píxeles por cuadro es clave en celulares de gama media.
      this.escala = Math.min(1, this.opciones.ladoMaximo / Math.max(ancho, alto));
      this.lienzo.width = Math.round(ancho * this.escala);
      this.lienzo.height = Math.round(alto * this.escala);
      this.ctx = this.lienzo.getContext('2d');
      if (!this.ctx) throw new Error('Canvas 2D no disponible');
      // Primer cuadro de prueba (t=0): si el script falla, se detecta antes de abrir la RA.
      this.dibujar(0);
      if (this.fallida) throw new Error('La capa falló al dibujar');
    } catch (e) {
      throw e instanceof ErrorRA ? e : new ErrorRA('capa-error', e);
    }
  }

  crearTextura(): CanvasTexture {
    if (!this.textura) {
      const t = new CanvasTexture(this.lienzo);
      // Sin conversión de color: el shader de la sesión copia los valores tal cual (sRGB del canvas → pantalla).
      t.colorSpace = NoColorSpace;
      t.minFilter = LinearFilter;
      t.magFilter = LinearFilter;
      t.generateMipmaps = false;
      // Alfa premultiplicado: bordes semitransparentes sin halos oscuros al filtrar.
      t.premultiplyAlpha = true;
      this.textura = t;
    }
    return this.textura;
  }

  private tiempoEn(ahora: number): number {
    const t = this.acumulado + (this.inicioTramo === null ? 0 : (ahora - this.inicioTramo) / 1000);
    return this.opciones.bucle ? t : Math.min(t, this.duracion);
  }

  private dibujar(t: number) {
    const { ctx, api } = this;
    if (!ctx || !api) return;
    const inicio = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.lienzo.width, this.lienzo.height);
    ctx.setTransform(this.escala, 0, 0, this.escala, 0, 0);
    try {
      ctx.save();
      api.render(ctx, t);
      ctx.restore();
    } catch (e) {
      console.error('Error en la capa Canvas', e);
      this.inicioTramo = null;
      this.fallida = true;
      this.emisor.emitir('error');
      return;
    }
    const ms = performance.now() - inicio;
    this.stats.cuadros++;
    this.stats.msTotal += ms;
    this.stats.msMaximo = Math.max(this.stats.msMaximo, ms);
    if (this.textura) this.textura.needsUpdate = true;
  }

  actualizar(ahora: number, visible: boolean): void {
    if (this.liberado || this.fallida || this.pausado) return;
    const t = this.tiempoEn(ahora);
    if (!this.opciones.bucle && t >= this.duracion) {
      // Último cuadro = póster intacto; luego queda quieto.
      this.acumulado = this.duracion;
      this.inicioTramo = null;
      this.terminado = true;
      if (visible) this.dibujar(this.duracion);
      this.emisor.emitir('terminado');
      return;
    }
    // Sólo se dibuja si el póster está a la vista y respetando los FPS de la capa.
    if (!visible || ahora - this.ultimoDibujo < 1000 / this.opciones.fps - 1) return;
    this.ultimoDibujo = ahora;
    this.dibujar(t);
  }

  async reproducir(): Promise<ResultadoReproduccion> {
    if (this.liberado || this.fallida || !this.api) return 'error';
    if (this.terminado) {
      this.acumulado = 0;
      this.terminado = false;
    }
    if (this.inicioTramo === null) {
      this.inicioTramo = performance.now();
      this.ultimoDibujo = -Infinity;
      this.emisor.emitir('reproduciendo');
    }
    return 'reproduciendo';
  }

  pausar(): void {
    if (this.inicioTramo === null) return;
    this.acumulado = this.tiempoEn(performance.now());
    this.inicioTramo = null;
    this.emisor.emitir('pausado');
  }

  async reiniciar(reproducir: boolean): Promise<ResultadoReproduccion | null> {
    const enCurso = !this.pausado;
    this.acumulado = 0;
    this.terminado = false;
    if (enCurso) this.inicioTramo = performance.now();
    this.dibujar(0);
    return reproducir ? this.reproducir() : null;
  }

  alCambiar(fn: (evento: EventoAnimacion) => void): () => void {
    return this.emisor.suscribir(fn);
  }

  /** Detiene el reloj y libera la memoria del lienzo (la textura la libera la sesión). Idempotente. */
  liberar(): void {
    if (this.liberado) return;
    this.liberado = true;
    this.inicioTramo = null;
    this.emisor.limpiar();
    this.ctx = null;
    this.lienzo.width = 0;
    this.lienzo.height = 0;
  }
}

/** Sólo para pruebas: olvidar scripts y capas cargadas. */
export function _reiniciarCacheCapas() {
  scripts.clear();
  capas.clear();
}
