/**
 * Genera un video Y4M que simula lo que "ve" la cámara de un celular frente al
 * póster impreso: pared con textura, el póster rotado/escalado, ruido de
 * sensor, y tramos sin póster (para probar pérdida y recuperación).
 *
 * Chrome lo usa como cámara con --use-file-for-fake-video-capture.
 */
import { createWriteStream } from 'node:fs';
import { createCanvas, loadImage, type CanvasRenderingContext2D, type Image } from 'canvas';

export const CAMARA = { ancho: 640, alto: 480, fps: 15 };

export interface PoseCamara {
  visible: boolean;
  /** Centro del póster en píxeles de la cámara. */
  cx: number;
  cy: number;
  /** Alto del póster en píxeles de la cámara. */
  alto: number;
  /** Rotación en grados (sentido horario). */
  rotacion: number;
}

/** Tramos (segundos): sin póster → fijo → en movimiento → sin póster → fijo de nuevo. */
export const TRAMOS = {
  inicioSinPoster: [0, 1],
  fijo: [1, 5],
  movimiento: [5, 7],
  perdida: [7, 9],
  fijo2: [9, 12],
} as const;
export const DURACION = 12;

/** Pose usada en los tramos "fijo": la prueba compara contra estas esquinas. */
export const POSE_FIJA: PoseCamara = { visible: true, cx: 330, cy: 245, alto: 300, rotacion: 6 };

export function poseEn(t: number): PoseCamara {
  const en = (r: readonly [number, number]) => t >= r[0] && t < r[1];
  if (en(TRAMOS.fijo) || en(TRAMOS.fijo2)) return POSE_FIJA;
  if (en(TRAMOS.movimiento)) {
    const u = (t - TRAMOS.movimiento[0]) / (TRAMOS.movimiento[1] - TRAMOS.movimiento[0]);
    const onda = Math.sin(u * Math.PI * 2);
    return { visible: true, cx: POSE_FIJA.cx + 40 * onda, cy: POSE_FIJA.cy + 10 * onda, alto: 300 - 30 * Math.sin(u * Math.PI), rotacion: 6 - 10 * onda };
  }
  return { ...POSE_FIJA, visible: false };
}

/** Esquinas del póster en píxeles de cámara (sup-izq, sup-der, inf-der, inf-izq). */
export function esquinasCamara(pose: PoseCamara, proporcionPoster: number) {
  const a = (pose.rotacion * Math.PI) / 180;
  const w = pose.alto * proporcionPoster;
  const h = pose.alto;
  return [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([x, y]) => ({
    x: pose.cx + x * Math.cos(a) - y * Math.sin(a),
    y: pose.cy + x * Math.sin(a) + y * Math.cos(a),
  }));
}

function crearRandom(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function dibujarPared(ctx: CanvasRenderingContext2D) {
  const rnd = crearRandom(7);
  ctx.fillStyle = '#8d8a84';
  ctx.fillRect(0, 0, CAMARA.ancho, CAMARA.alto);
  for (let i = 0; i < 160; i++) {
    const g = 110 + Math.floor(rnd() * 60);
    ctx.fillStyle = `rgb(${g},${g - 4},${g - 10})`;
    ctx.fillRect(rnd() * CAMARA.ancho, rnd() * CAMARA.alto, 4 + rnd() * 40, 4 + rnd() * 40);
  }
  // Un cuadro que no es el póster (distractor)
  ctx.fillStyle = '#3b4a5a';
  ctx.fillRect(18, 300, 90, 120);
  ctx.fillStyle = '#d9c9a3';
  ctx.fillRect(28, 312, 70, 50);
}

function dibujarPoster(ctx: CanvasRenderingContext2D, poster: Image, pose: PoseCamara) {
  const proporcion = poster.width / poster.height;
  ctx.save();
  ctx.translate(pose.cx, pose.cy);
  ctx.rotate((pose.rotacion * Math.PI) / 180);
  const w = pose.alto * proporcion;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 12;
  ctx.drawImage(poster, -w / 2, -pose.alto / 2, w, pose.alto);
  ctx.restore();
}

/** Escribe el Y4M (4:2:0) cuadro a cuadro. Devuelve la proporción del póster. */
export async function generarCamaraSimulada(rutaPoster: string, salida: string): Promise<number> {
  const poster = await loadImage(rutaPoster);
  const { ancho: W, alto: H, fps } = CAMARA;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const archivo = createWriteStream(salida);
  const escribir = (datos: Buffer | string) =>
    new Promise<void>((ok) => (archivo.write(datos) ? ok() : archivo.once('drain', () => ok())));

  await escribir(`YUV4MPEG2 W${W} H${H} F${fps}:1 Ip A1:1 C420jpeg\n`);
  const rnd = crearRandom(99);
  const y = Buffer.alloc(W * H);
  const u = Buffer.alloc((W / 2) * (H / 2));
  const v = Buffer.alloc((W / 2) * (H / 2));

  for (let f = 0; f < DURACION * fps; f++) {
    const pose = poseEn(f / fps);
    dibujarPared(ctx);
    if (pose.visible) dibujarPoster(ctx, poster, pose);
    const { data } = ctx.getImageData(0, 0, W, H);

    for (let i = 0, p = 0; i < W * H; i++, p += 4) {
      const ruido = (rnd() - 0.5) * 10; // ruido de sensor
      const luz = 0.92; // iluminación algo más baja que el original
      const r = data[p] * luz + ruido;
      const g = data[p + 1] * luz + ruido;
      const b = data[p + 2] * luz + ruido;
      y[i] = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * b));
    }
    for (let cy = 0; cy < H / 2; cy++) {
      for (let cx = 0; cx < W / 2; cx++) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const p = ((cy * 2 + dy) * W + cx * 2 + dx) * 4;
          r += data[p];
          g += data[p + 1];
          b += data[p + 2];
        }
        r /= 4;
        g /= 4;
        b /= 4;
        const k = cy * (W / 2) + cx;
        u[k] = Math.max(0, Math.min(255, -0.1687 * r - 0.3313 * g + 0.5 * b + 128));
        v[k] = Math.max(0, Math.min(255, 0.5 * r - 0.4187 * g - 0.0813 * b + 128));
      }
    }
    await escribir('FRAME\n');
    await escribir(Buffer.from(y));
    await escribir(Buffer.from(u));
    await escribir(Buffer.from(v));
  }
  await new Promise<void>((ok) => archivo.end(ok));
  return poster.width / poster.height;
}
