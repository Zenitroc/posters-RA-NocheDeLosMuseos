import QRCode, { type QRCodeToStringOptions } from 'qrcode';

/**
 * Opciones comunes: corrección de errores "M" (15 %) y margen de 2 módulos.
 * Negro sobre blanco: es lo más confiable para cámaras de celulares e impresión.
 */
export const OPCIONES_QR = {
  errorCorrectionLevel: 'M',
  margin: 2,
  color: { dark: '#000000', light: '#ffffff' },
} as const satisfies QRCodeToStringOptions;

export function generarQrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, { ...OPCIONES_QR, type: 'svg' });
}

/** PNG como data URL (navegador). */
export function generarQrPngDataUrl(texto: string, ancho = 1024): Promise<string> {
  return QRCode.toDataURL(texto, { ...OPCIONES_QR, type: 'image/png', width: ancho });
}

/** Nombre de archivo de descarga para el QR de un proyecto. */
export function nombreArchivoQr(slug: string, extension: 'png' | 'svg'): string {
  return `qr-${slug}.${extension}`;
}
