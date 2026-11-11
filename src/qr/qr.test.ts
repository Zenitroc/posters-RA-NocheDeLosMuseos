// @vitest-environment node
import { createCanvas, loadImage } from 'canvas';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { OPCIONES_QR, generarQrSvg, nombreArchivoQr } from './qr.ts';

async function decodificar(imagen: Buffer | string) {
  const img = await loadImage(imagen);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, img.width, img.height);
  ctx.drawImage(img, 0, 0);
  const datos = ctx.getImageData(0, 0, img.width, img.height);
  return jsQR(new Uint8ClampedArray(datos.data), img.width, img.height)?.data;
}

describe('generación de QR', () => {
  const url = 'https://museos.utn.edu.ar/p/zonar';

  it('el PNG generado se decodifica a la URL exacta del proyecto', async () => {
    const png = await QRCode.toBuffer(url, { ...OPCIONES_QR, type: 'png', width: 600 });
    expect(await decodificar(png)).toBe(url);
  });

  it('el SVG generado es válido y se decodifica a la misma URL', async () => {
    const svg = await generarQrSvg(url);
    expect(svg.startsWith('<svg')).toBe(true);
    // node-canvas rasteriza SVG desde data URL; se escala para que jsQR lo lea con holgura.
    const grande = svg.replace('<svg ', '<svg width="600" height="600" ');
    expect(await decodificar(`data:image/svg+xml;base64,${Buffer.from(grande).toString('base64')}`)).toBe(url);
  });

  it('nombra los archivos de descarga por slug', () => {
    expect(nombreArchivoQr('zonar', 'png')).toBe('qr-zonar.png');
    expect(nombreArchivoQr('proyecto-02', 'svg')).toBe('qr-proyecto-02.svg');
  });
});
