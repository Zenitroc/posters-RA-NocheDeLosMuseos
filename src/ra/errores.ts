/** Errores de la experiencia de RA y sus mensajes para el visitante. */

export type CodigoErrorRA =
  | 'no-seguro'
  | 'sin-camara-api'
  | 'sin-webgl'
  | 'permiso-denegado'
  | 'camara-no-encontrada'
  | 'camara-ocupada'
  | 'camara-error'
  | 'camara-interrumpida'
  | 'motor-carga'
  | 'target-descarga'
  | 'target-invalido'
  | 'video-error'
  | 'capa-error'
  | 'cancelado';

export class ErrorRA extends Error {
  readonly codigo: CodigoErrorRA;
  constructor(codigo: CodigoErrorRA, causa?: unknown) {
    super(codigo, { cause: causa });
    this.name = 'ErrorRA';
    this.codigo = codigo;
  }
}

export interface MensajeError {
  titulo: string;
  detalle: string;
  sugerencias: string[];
  /** Tiene sentido ofrecer "Reintentar". */
  reintentable: boolean;
}

export function esIOS(ua = navigator.userAgent): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Navegadores integrados en apps (Instagram, Facebook, etc.) suelen bloquear la cámara. */
export function esNavegadorIntegrado(ua = navigator.userAgent): boolean {
  return /FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|TikTok|Snapchat/i.test(ua);
}

export function traducirErrorCamara(error: unknown): ErrorRA {
  const nombre = error instanceof Error || error instanceof DOMException ? error.name : '';
  switch (nombre) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return new ErrorRA('permiso-denegado', error);
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return new ErrorRA('camara-no-encontrada', error);
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new ErrorRA('camara-ocupada', error);
    default:
      return new ErrorRA('camara-error', error);
  }
}

export function mensajeError(codigo: CodigoErrorRA, ua = navigator.userAgent): MensajeError {
  const ios = esIOS(ua);
  const integrado = esNavegadorIntegrado(ua);
  const abrirEnNavegador = ios ? 'Abrí este enlace en Safari.' : 'Abrí este enlace en Chrome.';

  switch (codigo) {
    case 'no-seguro':
      return {
        titulo: 'Conexión no segura',
        detalle: 'El navegador sólo permite usar la cámara en sitios con HTTPS.',
        sugerencias: ['Ingresá con una dirección que empiece con https://.'],
        reintentable: false,
      };
    case 'sin-camara-api':
      return {
        titulo: 'Tu navegador no permite usar la cámara',
        detalle: integrado
          ? 'Estás usando el navegador integrado de una aplicación, que no da acceso a la cámara.'
          : 'Este navegador no ofrece acceso a la cámara desde una página web.',
        sugerencias: [abrirEnNavegador, 'Actualizá el navegador a su última versión.'],
        reintentable: false,
      };
    case 'sin-webgl':
      return {
        titulo: 'Tu dispositivo no puede mostrar gráficos 3D',
        detalle: 'La realidad aumentada necesita WebGL, que no está disponible en este navegador.',
        sugerencias: ['Probá con Safari (iPhone) o Chrome (Android) actualizados.'],
        reintentable: false,
      };
    case 'permiso-denegado':
      return {
        titulo: 'No tenemos permiso para usar la cámara',
        detalle:
          'Para ver el póster en realidad aumentada necesitamos la cámara. No grabamos ni enviamos imágenes: todo ocurre en tu teléfono.',
        sugerencias: ios
          ? [
              'Tocá "aA" en la barra de direcciones → Configuración del sitio web → Cámara → Permitir.',
              'O en Ajustes → Safari → Cámara → Preguntar.',
              'Después tocá "Reintentar".',
            ]
          : integrado
            ? [abrirEnNavegador]
            : ['Tocá el ícono a la izquierda de la dirección → Permisos → Cámara → Permitir.', 'Después tocá "Reintentar".'],
        reintentable: true,
      };
    case 'camara-no-encontrada':
      return {
        titulo: 'No encontramos una cámara',
        detalle: 'Este dispositivo no tiene una cámara disponible.',
        sugerencias: ['Probá desde un celular.'],
        reintentable: true,
      };
    case 'camara-ocupada':
      return {
        titulo: 'La cámara está ocupada',
        detalle: 'Otra aplicación o pestaña está usando la cámara.',
        sugerencias: ['Cerrá otras apps o pestañas que usen la cámara y tocá "Reintentar".'],
        reintentable: true,
      };
    case 'camara-interrumpida':
      return {
        titulo: 'La cámara se interrumpió',
        detalle: 'El sistema detuvo la cámara (por ejemplo, al cambiar de aplicación).',
        sugerencias: ['Tocá "Reintentar" para volver a activarla.'],
        reintentable: true,
      };
    case 'camara-error':
      return {
        titulo: 'No pudimos iniciar la cámara',
        detalle: 'Ocurrió un error inesperado al acceder a la cámara.',
        sugerencias: ['Tocá "Reintentar".', integrado ? abrirEnNavegador : 'Si persiste, recargá la página.'],
        reintentable: true,
      };
    case 'motor-carga':
      return {
        titulo: 'No se pudo cargar la realidad aumentada',
        detalle: 'Falló la descarga del motor de RA. Puede ser un problema de conexión.',
        sugerencias: ['Revisá tu conexión y tocá "Reintentar".'],
        reintentable: true,
      };
    case 'target-descarga':
      return {
        titulo: 'No se pudo descargar la referencia del póster',
        detalle: 'Falló la descarga del archivo que permite reconocer el póster.',
        sugerencias: ['Revisá tu conexión y tocá "Reintentar".'],
        reintentable: true,
      };
    case 'target-invalido':
      return {
        titulo: 'Este proyecto no está bien configurado',
        detalle: 'El archivo de reconocimiento del póster es inválido. Avisale a la organización.',
        sugerencias: ['Mientras tanto, podés ver la animación sin RA.'],
        reintentable: false,
      };
    case 'video-error':
      return {
        titulo: 'No se pudo cargar la animación',
        detalle: 'El video del póster no se pudo descargar o reproducir.',
        sugerencias: ['Revisá tu conexión y tocá "Reintentar".'],
        reintentable: true,
      };
    case 'capa-error':
      return {
        titulo: 'No se pudo cargar la animación',
        detalle: 'La capa animada de este póster no pudo iniciarse en tu navegador.',
        sugerencias: ['Tocá "Reintentar" o mirá la animación sin RA.'],
        reintentable: true,
      };
    case 'cancelado':
      return { titulo: 'Cancelado', detalle: '', sugerencias: [], reintentable: true };
  }
}
