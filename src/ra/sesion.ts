/**
 * Sesión de realidad aumentada con seguimiento de imagen.
 *
 * Usa el `Controller` de MindAR (detección + seguimiento en TensorFlow.js y un
 * Web Worker) y dibuja con Three.js un plano con el video como textura,
 * alineado a la imagen objetivo.
 *
 * Por qué no se usa `MindARThree` directamente: su build importa
 * `sRGBEncoding`, que ya no existe en Three.js moderno; descarta el motivo del
 * error de getUserMedia (no se puede distinguir "permiso denegado") y su
 * `stop()` no libera el listener de resize, el Worker ni el contexto WebGL.
 * La matemática de cámara/proyección está portada de MindAR 1.2.5
 * (src/image-target/three.js) para mantener el mismo comportamiento.
 */
import {
  CustomBlending,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Texture,
} from 'three';
import type { Controller, DatosActualizacion } from 'mind-ar/dist/mindar-image.prod.js';
import { calcularAjuste, type ConfigReproduccion } from '../proyectos/modelo.ts';
import { diagnosticarCompatibilidad } from './compatibilidad.ts';
import { descargarConProgreso } from './descarga.ts';
import { ErrorRA, traducirErrorCamara } from './errores.ts';
import type { Animacion } from './animacion.ts';

export interface ProgresoCarga {
  motor: boolean;
  /** Fracción descargada del archivo .mind (0..1). */
  target: number;
  camara: boolean;
  animacion: boolean;
  calibrando: boolean;
}

export interface OpcionesSesion {
  contenedor: HTMLElement;
  targetUrl: string;
  /**
   * Modo "un solo póster": animación YA CARGADA (video o capa Canvas), que corresponde al objetivo 0 del
   * .mind. Puede ser una promesa: se prepara en paralelo con la cámara.
   * Modo escáner (varios pósters en un mismo .mind): se omite y cada animación se entrega con
   * `entregarAnimacion()` cuando `alDetectar(indice)` avisa que ese póster apareció.
   */
  animacion?: Animacion | Promise<Animacion>;
  reproduccion: ConfigReproduccion;
  alProgreso?(progreso: ProgresoCarga): void;
  /** Un póster (índice dentro del .mind) pasó a estar a la vista. */
  alDetectar?(indice: number): void;
  /** El póster que estaba a la vista se perdió. */
  alPerder?(indice: number): void;
  /** La cámara se cortó durante la sesión (otra app la tomó, se bloqueó el teléfono…). */
  alInterrupcion?(error: ErrorRA): void;
  alAdvertencia?(mensaje: string): void;
  /**
   * En cada cuadro: esquinas del póster a la vista en píxeles del contenedor (sup-izq, sup-der,
   * inf-der, inf-izq), o null si no hay ninguno. Sirve para anclar elementos HTML al póster (RA en pantalla).
   */
  alCuadro?(esquinas: { x: number; y: number }[] | null): void;
}

/** Sólo puede haber una sesión activa: abrir otra cierra la anterior. */
let sesionActiva: SesionRA | null = null;

const MATRIZ_INVISIBLE = new Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);

/** Un póster del .mind con su animación ya montada en la escena. */
interface Objetivo {
  animacion: Animacion;
  ancla: Group;
  material: MeshBasicMaterial | ShaderMaterial;
  postMatriz: Matrix4;
  altoRelativo: number;
  opacidad: number;
}

export class SesionRA {
  private readonly op: OpcionesSesion;
  private detenida = false;
  private readonly abortador = new AbortController();
  private readonly limpiezas: Array<() => void> = [];
  private progreso: ProgresoCarga = { motor: false, target: 0, camara: false, animacion: false, calibrando: false };

  private stream?: MediaStream;
  private camaraVideo?: HTMLVideoElement;
  private controller?: Controller;
  private renderer?: WebGLRenderer;
  private camara3d?: PerspectiveCamera;
  private readonly objetivos = new Map<number, Objetivo>();
  private dimensiones: [number, number][] = [];
  /** Animaciones entregadas antes de que la escena esté montada. */
  private readonly pendientes = new Map<number, { animacion: Animacion; reproduccion: ConfigReproduccion }>();
  private animacion?: Animacion;
  /** Índice del póster actualmente a la vista (null: ninguno). */
  private indiceVisible: number | null = null;
  private finDeCiclo?: () => void;

  constructor(opciones: OpcionesSesion) {
    this.op = opciones;
  }

  get activa(): boolean {
    return !this.detenida;
  }

  private actualizarProgreso(parcial: Partial<ProgresoCarga>) {
    this.progreso = { ...this.progreso, ...parcial };
    if (!this.detenida) this.op.alProgreso?.(this.progreso);
  }

  private verificarActiva() {
    if (this.detenida) throw new ErrorRA('cancelado');
  }

  async iniciar(): Promise<void> {
    if (sesionActiva && sesionActiva !== this) sesionActiva.detener();
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- registro intencional de la sesión única
    sesionActiva = this;

    const incompatibilidad = diagnosticarCompatibilidad();
    if (incompatibilidad) throw new ErrorRA(incompatibilidad);

    this.actualizarProgreso({});

    // Todo en paralelo: mientras el visitante responde el permiso de cámara,
    // se descargan el motor, la referencia del póster y la animación.
    const tareas = Promise.all([
      import('mind-ar/dist/mindar-image.prod.js')
        .catch((e) => {
          throw new ErrorRA('motor-carga', e);
        })
        .then((m) => {
          this.actualizarProgreso({ motor: true });
          return m;
        }),
      descargarConProgreso(this.op.targetUrl, this.abortador.signal, (f) => this.actualizarProgreso({ target: f })).catch(
        (e) => {
          throw this.detenida ? new ErrorRA('cancelado') : new ErrorRA('target-descarga', e);
        },
      ),
      this.abrirCamara().then(() => this.actualizarProgreso({ camara: true })),
      Promise.resolve(this.op.animacion).then((animacion) => {
        if (this.detenida) throw new ErrorRA('cancelado');
        if (animacion) {
          this.animacion = animacion;
          this.colocarElemento(animacion);
        }
        this.actualizarProgreso({ animacion: true });
      }),
    ]);

    let modulo: typeof import('mind-ar/dist/mindar-image.prod.js');
    let bufferTarget: ArrayBuffer;
    try {
      [modulo, bufferTarget] = await tareas;
    } catch (e) {
      this.detener();
      throw e instanceof ErrorRA ? e : new ErrorRA('camara-error', e);
    }
    this.verificarActiva();

    try {
      this.montarEscena(modulo.Controller, bufferTarget);
    } catch (e) {
      this.detener();
      throw e;
    }

    this.actualizarProgreso({ calibrando: true });
    // Dejar que la UI pinte "Calibrando" antes del trabajo pesado (compila shaders).
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    this.verificarActiva();

    const controller = this.controller!;
    controller.dummyRun(this.camaraVideo!);
    this.verificarActiva();
    controller.processVideo(this.camaraVideo!);
    this.renderer!.setAnimationLoop(this.dibujar);
  }

  private async abrirCamara() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
    } catch (e) {
      throw traducirErrorCamara(e);
    }
    if (this.detenida) {
      stream.getTracks().forEach((t) => t.stop());
      throw new ErrorRA('cancelado');
    }
    this.stream = stream;

    const video = document.createElement('video');
    video.className = 'ra-camara';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('aria-hidden', 'true');
    this.op.contenedor.prepend(video);
    this.camaraVideo = video;

    await new Promise<void>((resolver, rechazar) => {
      const limite = setTimeout(() => rechazar(new ErrorRA('camara-error')), 15000);
      video.addEventListener(
        'loadedmetadata',
        () => {
          clearTimeout(limite);
          resolver();
        },
        { once: true },
      );
      video.srcObject = stream;
    });
    await video.play().catch(() => {});

    for (const pista of stream.getVideoTracks()) {
      const alTerminar = () => {
        if (!this.detenida) this.op.alInterrupcion?.(new ErrorRA('camara-interrumpida'));
      };
      pista.addEventListener('ended', alTerminar);
    }
  }

  private montarEscena(ControllerClase: typeof Controller, bufferTarget: ArrayBuffer) {
    const camaraVideo = this.camaraVideo!;
    const { contenedor } = this.op;

    const controller = new ControllerClase({
      inputWidth: camaraVideo.videoWidth,
      inputHeight: camaraVideo.videoHeight,
      maxTrack: 1,
      onUpdate: this.alActualizar,
    });
    this.controller = controller;

    let dimensiones: [number, number][];
    try {
      dimensiones = controller.addImageTargetsFromBuffer(bufferTarget).dimensions;
    } catch (e) {
      throw new ErrorRA('target-invalido', e);
    }
    if (!dimensiones?.length) throw new ErrorRA('target-invalido');
    this.dimensiones = dimensiones;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      throw new ErrorRA('sin-webgl', e);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'ra-lienzo';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    camaraVideo.after(renderer.domElement);
    this.renderer = renderer;

    const escena = new Scene();
    this.camara3d = new PerspectiveCamera();
    this.escena = escena;

    if (this.animacion) this.agregarObjetivo(0, this.animacion, this.op.reproduccion);
    for (const [indice, { animacion, reproduccion }] of this.pendientes) this.agregarObjetivo(indice, animacion, reproduccion);
    this.pendientes.clear();

    this.ajustarTamano();
    const alRedimensionar = () => this.ajustarTamano();
    window.addEventListener('resize', alRedimensionar);
    window.addEventListener('orientationchange', alRedimensionar);
    camaraVideo.addEventListener('resize', alRedimensionar);
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(alRedimensionar) : null;
    observador?.observe(contenedor);
    this.limpiezas.push(() => {
      window.removeEventListener('resize', alRedimensionar);
      window.removeEventListener('orientationchange', alRedimensionar);
      camaraVideo.removeEventListener('resize', alRedimensionar);
      observador?.disconnect();
    });
  }

  private escena?: Scene;
  private readonly matrizTemporal = new Matrix4();
  private ultimoCuadro = 0;

  private colocarElemento(animacion: Animacion) {
    // En iOS el <video> debe estar en el DOM para que se decodifiquen cuadros para la textura.
    if (animacion.elemento) {
      animacion.elemento.classList.add('ra-fuente');
      this.op.contenedor.appendChild(animacion.elemento);
    }
  }

  /**
   * Modo escáner: entrega la animación (ya cargada) del póster `indice`. Puede llamarse en cualquier
   * momento después de iniciar; la sesión es la dueña de la textura y la libera al detenerse, pero la
   * animación en sí la libera quien la creó.
   */
  entregarAnimacion(indice: number, animacion: Animacion, reproduccion: ConfigReproduccion): void {
    if (this.detenida || this.objetivos.has(indice) || this.pendientes.has(indice)) return;
    this.colocarElemento(animacion);
    if (this.escena) this.agregarObjetivo(indice, animacion, reproduccion);
    else this.pendientes.set(indice, { animacion, reproduccion });
  }

  private agregarObjetivo(indice: number, animacion: Animacion, reproduccion: ConfigReproduccion) {
    const escena = this.escena;
    const dim = this.dimensiones[indice];
    if (!escena || !dim) return;
    const [anchoTarget, altoTarget] = dim;

    const ancla = new Group();
    ancla.matrixAutoUpdate = false;
    ancla.visible = false;
    escena.add(ancla);

    // Igual que MindAR: el ancla queda centrada en la imagen y 1 unidad = ancho de la imagen.
    const postMatriz = new Matrix4().compose(
      new Vector3(anchoTarget / 2, altoTarget / 2, 0),
      new Quaternion(),
      new Vector3(anchoTarget, anchoTarget, anchoTarget),
    );

    const ajuste = calcularAjuste(anchoTarget / altoTarget, animacion.proporcion, reproduccion);
    if (ajuste.advertencia) this.op.alAdvertencia?.(ajuste.advertencia);

    const textura = animacion.crearTextura();
    textura.repeat.set(ajuste.textura.repetirX, ajuste.textura.repetirY);
    textura.offset.set(ajuste.textura.desplazarX, ajuste.textura.desplazarY);

    const material = animacion.transparente ? crearMaterialTransparente(textura) : crearMaterialOpaco(textura);
    // Una capa con margen se extiende alrededor del póster (lo que "sale del papel"): plano más grande, mismo centro.
    const extension = 1 + 2 * (animacion.margen ?? 0);
    const geometria = new PlaneGeometry(ajuste.plano.ancho * extension, ajuste.plano.alto * extension);
    const plano = new Mesh(geometria, material);
    plano.position.set(ajuste.posicion.x, ajuste.posicion.y, 0);
    ancla.add(plano);

    const objetivo: Objetivo = { animacion, ancla, material, postMatriz, altoRelativo: altoTarget / anchoTarget, opacidad: 0 };
    this.objetivos.set(indice, objetivo);
    this.fijarOpacidad(objetivo, 0);

    this.limpiezas.push(() => {
      escena.remove(ancla);
      geometria.dispose();
      material.dispose();
      textura.dispose();
    });
  }

  private fijarOpacidad(o: Objetivo, valor: number) {
    o.opacidad = valor;
    const m = o.material;
    if (m instanceof ShaderMaterial) m.uniforms.opacidad.value = valor;
    else m.opacity = valor;
  }

  private alActualizar = (datos: DatosActualizacion) => {
    if (datos.type === 'processDone') {
      this.finDeCiclo?.();
      return;
    }
    if (this.detenida || datos.type !== 'updateMatrix' || !this.escena) return;

    const indice = datos.targetIndex;
    const objetivo = this.objetivos.get(indice);
    const { worldMatrix } = datos;
    if (worldMatrix) {
      if (objetivo) {
        this.matrizTemporal.fromArray(worldMatrix).multiply(objetivo.postMatriz);
        objetivo.ancla.matrix.copy(this.matrizTemporal);
        objetivo.ancla.visible = true;
      }
      if (this.indiceVisible !== indice) {
        const anterior = this.indiceVisible;
        this.indiceVisible = indice;
        if (anterior !== null) this.ocultarObjetivo(anterior);
        this.op.alDetectar?.(indice);
      }
    } else if (this.indiceVisible === indice) {
      this.indiceVisible = null;
      this.ocultarObjetivo(indice);
      this.op.alPerder?.(indice);
    }
  };

  private ocultarObjetivo(indice: number) {
    const o = this.objetivos.get(indice);
    if (!o) return;
    o.ancla.matrix.copy(MATRIZ_INVISIBLE);
    o.ancla.visible = false;
    this.fijarOpacidad(o, 0);
  }

  private dibujar = (tiempo: number) => {
    const { renderer, escena, camara3d } = this;
    if (!renderer || !escena || !camara3d) return;
    const dt = this.ultimoCuadro ? Math.min(0.1, (tiempo - this.ultimoCuadro) / 1000) : 0;
    this.ultimoCuadro = tiempo;
    for (const [indice, o] of this.objetivos) {
      const visible = indice === this.indiceVisible;
      // Aparición suave al detectar el póster.
      if (visible && o.opacidad < 1) this.fijarOpacidad(o, Math.min(1, o.opacidad + dt * 4));
      o.animacion.actualizar(tiempo, visible);
    }
    renderer.render(escena, camara3d);
    this.op.alCuadro?.(this.esquinasEnPantalla());
  };

  /** Portado de MindARThree.resize(): ajusta video de cámara, FOV y lienzo al contenedor. */
  private ajustarTamano() {
    const { controller, renderer, camara3d, camaraVideo: video } = this;
    const contenedor = this.op.contenedor;
    if (!controller || !renderer || !camara3d || !video || this.detenida) return;
    const cw = contenedor.clientWidth;
    const ch = contenedor.clientHeight;
    if (!cw || !ch || !video.videoWidth || !video.videoHeight) return;

    // MindAR detecta la rotación del teléfono comparando estos atributos con el tamaño de entrada.
    video.setAttribute('width', String(video.videoWidth));
    video.setAttribute('height', String(video.videoHeight));

    const proporcionVideo = video.videoWidth / video.videoHeight;
    const proporcionContenedor = cw / ch;
    let vw: number;
    let vh: number;
    if (proporcionVideo > proporcionContenedor) {
      vh = ch;
      vw = vh * proporcionVideo;
    } else {
      vw = cw;
      vh = vw / proporcionVideo;
    }

    const proj = controller.getProjectionMatrix();
    const proporcionEntrada = controller.inputWidth / controller.inputHeight;
    let altoMostrado: number;
    if (proporcionEntrada > proporcionContenedor) {
      altoMostrado = ch * (video.videoWidth / controller.inputWidth);
    } else {
      altoMostrado = (cw / controller.inputWidth) * controller.inputHeight * (video.videoHeight / controller.inputHeight);
    }
    const ajusteFov = ch / altoMostrado;

    camara3d.fov = (2 * Math.atan((1 / proj[5]) * ajusteFov) * 180) / Math.PI;
    camara3d.near = proj[14] / (proj[10] - 1.0);
    camara3d.far = proj[14] / (proj[10] + 1.0);
    camara3d.aspect = cw / ch;
    camara3d.updateProjectionMatrix();

    video.style.top = `${-(vh - ch) / 2}px`;
    video.style.left = `${-(vw - cw) / 2}px`;
    video.style.width = `${vw}px`;
    video.style.height = `${vh}px`;

    renderer.setSize(cw, ch);
  }

  /**
   * Depuración/pruebas: esquinas del póster detectado proyectadas a píxeles del
   * contenedor (sup-izq, sup-der, inf-der, inf-izq), o null si no está a la vista.
   */
  esquinasEnPantalla(): { x: number; y: number }[] | null {
    const { camara3d } = this;
    const o = this.indiceVisible === null ? undefined : this.objetivos.get(this.indiceVisible);
    if (!o || !camara3d) return null;
    const ancla = o.ancla;
    ancla.updateMatrixWorld(true);
    const { clientWidth: cw, clientHeight: ch } = this.op.contenedor;
    const h = o.altoRelativo / 2;
    return [
      [-0.5, h],
      [0.5, h],
      [0.5, -h],
      [-0.5, -h],
    ].map(([x, y]) => {
      const p = new Vector3(x, y, 0).applyMatrix4(ancla.matrixWorld).project(camara3d);
      return { x: ((p.x + 1) / 2) * cw, y: ((1 - p.y) / 2) * ch };
    });
  }

  /** Libera cámara, Worker, WebGL y listeners. Idempotente y seguro durante la carga. */
  detener(): void {
    if (this.detenida) return;
    this.detenida = true;
    if (sesionActiva === this) sesionActiva = null;
    this.abortador.abort();

    this.renderer?.setAnimationLoop(null);

    const controller = this.controller;
    if (controller) {
      controller.stopProcessVideo();
      // Esperar a que termine el ciclo en curso (libera sus tensores) antes de cortar el Worker.
      const terminar = () => {
        this.finDeCiclo = undefined;
        try {
          controller.dispose();
        } catch {
          /* ya liberado */
        }
        controller.worker?.terminate();
      };
      const respaldo = setTimeout(terminar, 1000);
      this.finDeCiclo = () => {
        clearTimeout(respaldo);
        terminar();
      };
    }

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    if (this.camaraVideo) {
      this.camaraVideo.pause();
      this.camaraVideo.srcObject = null;
      this.camaraVideo.remove();
    }

    for (const limpiar of this.limpiezas.splice(0)) {
      try {
        limpiar();
      } catch {
        /* seguir liberando el resto */
      }
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
    }
    this.renderer = undefined;
    this.escena = undefined;
    this.objetivos.clear();
    this.pendientes.clear();
    this.indiceVisible = null;
  }
}

/** Video opaco: material estándar con fundido de opacidad. */
function crearMaterialOpaco(textura: Texture) {
  return new MeshBasicMaterial({ map: textura, transparent: true, opacity: 0, toneMapped: false });
}

/**
 * Capa transparente (textura con alfa premultiplicado): se pasa tal cual al
 * lienzo, sin conversión de color, y se mezcla con (ONE, 1 − alfa). Así los
 * bordes suaves no generan halos ni la capa oscurece el póster; el fundido
 * multiplica color y alfa a la vez.
 */
function crearMaterialTransparente(textura: Texture) {
  return new ShaderMaterial({
    uniforms: {
      mapa: { value: textura },
      opacidad: { value: 0 },
      repetir: { value: new Vector2(textura.repeat.x, textura.repeat.y) },
      desplazar: { value: new Vector2(textura.offset.x, textura.offset.y) },
    },
    vertexShader: /* glsl */ `
      uniform vec2 repetir;
      uniform vec2 desplazar;
      varying vec2 vUv;
      void main() {
        vUv = uv * repetir + desplazar;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D mapa;
      uniform float opacidad;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(mapa, vUv) * opacidad;
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    blendSrcAlpha: OneFactor,
    blendDstAlpha: OneMinusSrcAlphaFactor,
  });
}

/** Para pruebas y depuración: ¿hay una sesión con cámara abierta? */
export function haySesionActiva(): boolean {
  return sesionActiva !== null;
}
