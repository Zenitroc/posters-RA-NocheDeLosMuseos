/**
 * Compilación de imágenes objetivo (.mind) de MindAR desde Node.
 *
 * MindAR no publica una CLI. Lo que sí incluye el paquete npm es la clase
 * `OfflineCompiler` (mind-ar/src/image-target/offline-compiler.js), que es el
 * mismo algoritmo del compilador web oficial pero usando node-canvas y el
 * backend de CPU de TensorFlow.js. Este módulo la envuelve.
 *
 * Alternativa equivalente sin Node: la página /recursos/compilar del sitio,
 * que usa el `Compiler` de navegador de MindAR.
 */
import { createCanvas, loadImage, type Image } from 'canvas';

/** Lado mayor máximo de la imagen que se compila (más grande sólo agrega tiempo y peso). */
export const LADO_MAXIMO_TARGET = 1600;

function reducir(imagen: Image, ladoMaximo: number) {
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
  const ancho = Math.round(imagen.width * escala);
  const alto = Math.round(imagen.height * escala);
  const canvas = createCanvas(ancho, alto);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // fondo para PNG con transparencia
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  return canvas;
}

export async function compilarTarget(
  rutaPoster: string,
  alProgreso: (porcentaje: number) => void = () => {},
): Promise<{ mind: Uint8Array; ancho: number; alto: number }> {
  // Import diferido: TensorFlow.js tarda en cargar y no siempre hace falta.
  const { OfflineCompiler } = await import('mind-ar/src/image-target/offline-compiler.js');
  const imagen = await loadImage(rutaPoster);
  const canvas = reducir(imagen, LADO_MAXIMO_TARGET);
  const compilador = new OfflineCompiler();
  await compilador.compileImageTargets([canvas], alProgreso);
  const mind = new Uint8Array(compilador.exportData());
  return { mind, ancho: canvas.width, alto: canvas.height };
}

/** Genera la miniatura JPG (ancho fijo) a partir del póster. */
export async function generarMiniatura(rutaPoster: string, ancho = 480): Promise<Buffer> {
  const imagen = await loadImage(rutaPoster);
  const escala = Math.min(1, ancho / imagen.width);
  const canvas = reducir(imagen, Math.max(imagen.width, imagen.height) * escala);
  return canvas.toBuffer('image/jpeg', { quality: 0.82, progressive: true });
}
