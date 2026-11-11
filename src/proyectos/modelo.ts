/**
 * Modelo de datos de los proyectos.
 *
 * Este módulo es puro (sin DOM ni Node) porque lo usan tanto la aplicación
 * como los scripts de línea de comandos y el plugin de Vite.
 */

/** Cómo se acomoda el video sobre el póster cuando sus proporciones difieren. */
export type ModoAjuste = 'auto' | 'estirar' | 'contener' | 'cubrir';

export type AlPerderSeguimiento = 'pausar' | 'continuar';

/**
 * Formato de la animación en RA:
 * - video:  MP4 completo y opaco sobre el póster.
 * - canvas: capa transparente dibujada por un script (sólo se mueven algunos elementos).
 * - auto:   canvas si está configurado y el navegador puede usarlo; si no, video.
 */
export type ModoAnimacion = 'auto' | 'video' | 'canvas';
export type TipoAnimacion = Exclude<ModoAnimacion, 'auto'>;

/**
 * Capa Canvas. El script (archivos.capa) debe definir un objeto global con:
 *   load(): Promise<void>            prepara recursos
 *   render(ctx2d, segundos): void    dibuja el cuadro (fondo transparente, coordenadas del póster)
 *   WIDTH, HEIGHT, DURATION          tamaño del lienzo en px y duración del ciclo en s
 */
export interface ConfigCanvas {
  /** Nombre del objeto global que define el script. */
  global: string;
  /** Tamaño declarado del lienzo (para validar proporciones al compilar). */
  ancho?: number;
  alto?: number;
  /** Cuadros por segundo máximos de la capa. */
  fps: number;
  /** Lado mayor máximo (px) de la textura: menos = más liviano en celulares. */
  ladoMaximo: number;
}

export interface ConfigAnimacion {
  modo: ModoAnimacion;
  canvas: ConfigCanvas;
}

export interface ConfigReproduccion {
  /** Repetir la animación en bucle. */
  bucle: boolean;
  /**
   * auto: si las proporciones coinciden (±2 %) cubre el póster exacto; si no,
   * usa "contener" (sin deformar) y genera una advertencia de configuración.
   */
  ajuste: ModoAjuste;
  alPerderSeguimiento: AlPerderSeguimiento;
  /** Volver al inicio cada vez que se reconoce el póster. */
  reiniciarAlDetectar: boolean;
  /** Ajuste fino: escala del plano de video (1 = ancho del póster). */
  escala: number;
  /** Ajuste fino: desplazamiento en fracciones del ancho del póster (+x derecha, +y arriba). */
  desplazamiento: { x: number; y: number };
}

/** Archivos dentro de la carpeta del proyecto (nombres relativos). */
export interface ArchivosProyecto {
  poster: string;
  video: string;
  target: string;
  miniatura: string;
  /** Script de la capa Canvas (opcional). */
  capa: string;
}

/** Contenido de public/posters/<slug>/proyecto.json ya normalizado. */
export interface ManifiestoProyecto {
  nombre: string;
  subtitulo?: string;
  descripcion?: string;
  equipo?: string[];
  orden: number;
  activo: boolean;
  /** Marca recursos temporales de demostración. */
  demo: boolean;
  archivos: ArchivosProyecto;
  reproduccion: ConfigReproduccion;
  animacion: ConfigAnimacion;
}

export interface Medidas {
  ancho: number;
  alto: number;
}

export type RecursoClave = keyof ArchivosProyecto;

/** "animacion" = no hay ni video ni capa Canvas. */
export type Faltante = 'poster' | 'target' | 'animacion';

export interface EstadoRecursos {
  /** Tiene póster + target + alguna animación (video o capa): puede usarse en RA. */
  listoParaRA: boolean;
  /** Puede verse la animación sin RA (video, o capa Canvas sobre el póster). */
  listoParaVideo: boolean;
  /** Formatos de animación disponibles para RA, en orden de preferencia según el modo. */
  animaciones: TipoAnimacion[];
  faltantes: Faltante[];
  advertencias: string[];
}

/** Proyecto tal como lo consume la aplicación (generado al compilar). */
export interface ProyectoCatalogo extends Omit<ManifiestoProyecto, 'archivos'> {
  slug: string;
  /** URLs públicas (con versión para invalidar caché) sólo de los archivos existentes. */
  urls: Partial<Record<RecursoClave, string>>;
  medidas: { poster?: Medidas; video?: Medidas; target?: Medidas; capa?: Medidas };
  estado: EstadoRecursos;
}

export interface ProblemaCarpeta {
  carpeta: string;
  errores: string[];
}

/** Archivo .mind único con los pósters de todos los proyectos (lo usa el escáner de la portada). */
export interface EscanerCatalogo {
  url: string;
  /** Slug de cada póster; la posición es el `targetIndex` de MindAR. */
  slugs: string[];
}

export interface Catalogo {
  proyectos: ProyectoCatalogo[];
  /** Ausente si ningún proyecto tiene póster compilado. */
  escaner?: EscanerCatalogo;
  /** Carpetas que no pudieron cargarse (manifiesto inválido, slug inválido, etc.). */
  problemas: ProblemaCarpeta[];
}

export const ARCHIVOS_POR_DEFECTO: ArchivosProyecto = {
  poster: 'poster.jpg',
  video: 'animacion.mp4',
  target: 'target.mind',
  miniatura: 'miniatura.jpg',
  capa: 'capa.js',
};

export const ANIMACION_POR_DEFECTO: ConfigAnimacion = {
  modo: 'auto',
  canvas: { global: 'CapaAnimada', fps: 30, ladoMaximo: 1024 },
};

/**
 * Orden en que se intentan los formatos de animación según el modo configurado
 * y lo que realmente existe. El primero es el preferido; el resto, respaldo.
 */
export function ordenAnimaciones(modo: ModoAnimacion, disponibles: { video: boolean; canvas: boolean }): TipoAnimacion[] {
  const preferencia: TipoAnimacion[] = modo === 'video' ? ['video', 'canvas'] : ['canvas', 'video'];
  return preferencia.filter((t) => disponibles[t]);
}

export function esModoAnimacion(v: unknown): v is ModoAnimacion {
  return v === 'auto' || v === 'video' || v === 'canvas';
}

export const REPRODUCCION_POR_DEFECTO: ConfigReproduccion = {
  bucle: true,
  ajuste: 'auto',
  alPerderSeguimiento: 'pausar',
  reiniciarAlDetectar: false,
  escala: 1,
  desplazamiento: { x: 0, y: 0 },
};

/** Tolerancia relativa para considerar que dos proporciones coinciden. */
export const TOLERANCIA_PROPORCION = 0.02;

const PATRON_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function esSlugValido(slug: string): boolean {
  return slug.length <= 60 && PATRON_SLUG.test(slug);
}

/** Convierte un nombre libre en un slug válido ("Proyecto Ñandú 2" → "proyecto-nandu-2"). */
export function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export type ResultadoNormalizacion =
  | { ok: true; manifiesto: ManifiestoProyecto; advertencias: string[] }
  | { ok: false; errores: string[] };

const MODOS_AJUSTE: ModoAjuste[] = ['auto', 'estirar', 'contener', 'cubrir'];
const MODOS_PERDIDA: AlPerderSeguimiento[] = ['pausar', 'continuar'];

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function textoOpcional(v: unknown, campo: string, errores: string[]): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string') {
    errores.push(`"${campo}" debe ser texto.`);
    return undefined;
  }
  return v.trim() || undefined;
}

function nombreArchivoValido(v: string): boolean {
  // Sólo nombres simples dentro de la carpeta del proyecto (sin rutas).
  return /^[\w.-]+$/.test(v) && !v.startsWith('.');
}

/**
 * Valida y completa con valores por defecto el contenido de un proyecto.json.
 * Los errores impiden cargar el proyecto; las advertencias no.
 */
export function normalizarManifiesto(datos: unknown): ResultadoNormalizacion {
  const errores: string[] = [];
  const advertencias: string[] = [];

  if (!esObjeto(datos)) return { ok: false, errores: ['El manifiesto debe ser un objeto JSON.'] };

  const nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';
  if (!nombre) errores.push('Falta "nombre" (texto obligatorio).');

  const subtitulo = textoOpcional(datos.subtitulo, 'subtitulo', errores);
  const descripcion = textoOpcional(datos.descripcion, 'descripcion', errores);

  let equipo: string[] | undefined;
  if (datos.equipo !== undefined) {
    if (Array.isArray(datos.equipo) && datos.equipo.every((p) => typeof p === 'string')) {
      equipo = (datos.equipo as string[]).map((p) => p.trim()).filter(Boolean);
    } else {
      errores.push('"equipo" debe ser una lista de textos.');
    }
  }

  let orden = 100;
  if (datos.orden !== undefined) {
    if (typeof datos.orden === 'number' && Number.isFinite(datos.orden)) orden = datos.orden;
    else errores.push('"orden" debe ser un número.');
  }

  const booleano = (campo: string, porDefecto: boolean, origen: Record<string, unknown> = datos) => {
    const v = origen[campo];
    if (v === undefined) return porDefecto;
    if (typeof v === 'boolean') return v;
    errores.push(`"${campo}" debe ser true o false.`);
    return porDefecto;
  };

  const activo = booleano('activo', true);
  const demo = booleano('demo', false);

  const archivos: ArchivosProyecto = { ...ARCHIVOS_POR_DEFECTO };
  if (datos.archivos !== undefined) {
    if (!esObjeto(datos.archivos)) {
      errores.push('"archivos" debe ser un objeto.');
    } else {
      for (const clave of Object.keys(ARCHIVOS_POR_DEFECTO) as RecursoClave[]) {
        const v = datos.archivos[clave];
        if (v === undefined) continue;
        if (typeof v !== 'string' || !nombreArchivoValido(v)) {
          errores.push(`"archivos.${clave}" debe ser un nombre de archivo dentro de la carpeta del proyecto.`);
        } else {
          archivos[clave] = v;
        }
      }
    }
  }

  const reproduccion: ConfigReproduccion = {
    ...REPRODUCCION_POR_DEFECTO,
    desplazamiento: { ...REPRODUCCION_POR_DEFECTO.desplazamiento },
  };
  if (datos.reproduccion !== undefined) {
    const r = datos.reproduccion;
    if (!esObjeto(r)) {
      errores.push('"reproduccion" debe ser un objeto.');
    } else {
      reproduccion.bucle = booleano('bucle', reproduccion.bucle, r);
      reproduccion.reiniciarAlDetectar = booleano('reiniciarAlDetectar', reproduccion.reiniciarAlDetectar, r);

      if (r.ajuste !== undefined) {
        if (MODOS_AJUSTE.includes(r.ajuste as ModoAjuste)) reproduccion.ajuste = r.ajuste as ModoAjuste;
        else errores.push(`"reproduccion.ajuste" debe ser uno de: ${MODOS_AJUSTE.join(', ')}.`);
      }
      if (r.alPerderSeguimiento !== undefined) {
        if (MODOS_PERDIDA.includes(r.alPerderSeguimiento as AlPerderSeguimiento)) {
          reproduccion.alPerderSeguimiento = r.alPerderSeguimiento as AlPerderSeguimiento;
        } else {
          errores.push(`"reproduccion.alPerderSeguimiento" debe ser uno de: ${MODOS_PERDIDA.join(', ')}.`);
        }
      }
      if (r.escala !== undefined) {
        if (typeof r.escala === 'number' && r.escala > 0 && r.escala <= 5) reproduccion.escala = r.escala;
        else errores.push('"reproduccion.escala" debe ser un número mayor que 0 (y hasta 5).');
      }
      if (r.desplazamiento !== undefined) {
        const d = r.desplazamiento;
        if (esObjeto(d) && ['x', 'y'].every((k) => d[k] === undefined || (typeof d[k] === 'number' && Math.abs(d[k] as number) <= 2))) {
          reproduccion.desplazamiento = { x: (d.x as number) ?? 0, y: (d.y as number) ?? 0 };
        } else {
          errores.push('"reproduccion.desplazamiento" debe ser { "x": número, "y": número } con valores entre -2 y 2.');
        }
      }
    }
  }

  const animacion: ConfigAnimacion = { modo: ANIMACION_POR_DEFECTO.modo, canvas: { ...ANIMACION_POR_DEFECTO.canvas } };
  if (datos.animacion !== undefined) {
    const a = datos.animacion;
    if (!esObjeto(a)) {
      errores.push('"animacion" debe ser un objeto.');
    } else {
      if (a.modo !== undefined) {
        if (esModoAnimacion(a.modo)) animacion.modo = a.modo;
        else errores.push('"animacion.modo" debe ser uno de: auto, video, canvas.');
      }
      if (a.canvas !== undefined) {
        const c = a.canvas;
        if (!esObjeto(c)) {
          errores.push('"animacion.canvas" debe ser un objeto.');
        } else {
          if (c.global !== undefined) {
            if (typeof c.global === 'string' && /^[A-Za-z_$][\w$]*$/.test(c.global)) animacion.canvas.global = c.global;
            else errores.push('"animacion.canvas.global" debe ser un nombre de variable JavaScript válido.');
          }
          const entero = (campo: 'ancho' | 'alto' | 'fps' | 'ladoMaximo', min: number, max: number) => {
            const v = c[campo];
            if (v === undefined) return;
            if (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max) animacion.canvas[campo] = v;
            else errores.push(`"animacion.canvas.${campo}" debe ser un entero entre ${min} y ${max}.`);
          };
          entero('ancho', 16, 8192);
          entero('alto', 16, 8192);
          entero('fps', 1, 60);
          entero('ladoMaximo', 256, 4096);
          if ((c.ancho === undefined) !== (c.alto === undefined)) {
            errores.push('"animacion.canvas.ancho" y "alto" van juntos.');
          }
        }
      }
    }
  }

  const conocidos = new Set(['$schema', 'slug', 'nombre', 'subtitulo', 'descripcion', 'equipo', 'orden', 'activo', 'demo', 'archivos', 'reproduccion', 'animacion']);
  for (const clave of Object.keys(datos)) {
    if (!conocidos.has(clave)) advertencias.push(`Campo desconocido "${clave}" (se ignora).`);
  }

  if (errores.length > 0) return { ok: false, errores };
  return {
    ok: true,
    advertencias,
    manifiesto: { nombre, subtitulo, descripcion, equipo, orden, activo, demo, archivos, reproduccion, animacion },
  };
}

export function proporcionesCoinciden(a: number, b: number, tolerancia = TOLERANCIA_PROPORCION): boolean {
  return Math.abs(a - b) / Math.max(a, b) <= tolerancia;
}

export interface AjusteCalculado {
  modo: Exclude<ModoAjuste, 'auto'>;
  /** Tamaño del plano en unidades del póster (ancho del póster = 1). */
  plano: { ancho: number; alto: number };
  /** Recorte de la textura (para "cubrir"): repeat y offset UV. */
  textura: { repetirX: number; repetirY: number; desplazarX: number; desplazarY: number };
  /** Posición del centro del plano respecto del centro del póster. */
  posicion: { x: number; y: number };
  /** Mensaje si hay una discrepancia de proporciones que conviene revisar. */
  advertencia?: string;
}

/**
 * Calcula cómo ubicar el video sobre el póster.
 * @param proporcionPoster ancho/alto del póster (imagen objetivo)
 * @param proporcionVideo  ancho/alto del video
 */
export function calcularAjuste(
  proporcionPoster: number,
  proporcionVideo: number,
  config: Pick<ConfigReproduccion, 'ajuste' | 'escala' | 'desplazamiento'>,
): AjusteCalculado {
  const altoPoster = 1 / proporcionPoster;
  const coinciden = proporcionesCoinciden(proporcionPoster, proporcionVideo);
  let modo: AjusteCalculado['modo'];
  let advertencia: string | undefined;

  if (config.ajuste === 'auto') {
    if (coinciden) {
      modo = 'estirar';
    } else {
      modo = 'contener';
      advertencia =
        `El video (proporción ${proporcionVideo.toFixed(3)}) no coincide con el póster (${proporcionPoster.toFixed(3)}). ` +
        'Se muestra sin deformar ("contener"). Definí "reproduccion.ajuste" en proyecto.json para elegir explícitamente.';
    }
  } else {
    modo = config.ajuste;
  }

  let ancho = 1;
  let alto = altoPoster;
  const textura = { repetirX: 1, repetirY: 1, desplazarX: 0, desplazarY: 0 };

  if (modo === 'contener') {
    if (proporcionVideo > proporcionPoster) {
      alto = 1 / proporcionVideo;
    } else {
      ancho = altoPoster * proporcionVideo;
    }
  } else if (modo === 'cubrir') {
    if (proporcionVideo > proporcionPoster) {
      textura.repetirX = proporcionPoster / proporcionVideo;
      textura.desplazarX = (1 - textura.repetirX) / 2;
    } else {
      textura.repetirY = proporcionVideo / proporcionPoster;
      textura.desplazarY = (1 - textura.repetirY) / 2;
    }
  }

  return {
    modo,
    plano: { ancho: ancho * config.escala, alto: alto * config.escala },
    textura,
    posicion: { x: config.desplazamiento.x, y: config.desplazamiento.y },
    advertencia,
  };
}
