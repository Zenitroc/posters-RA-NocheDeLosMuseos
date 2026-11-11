/**
 * Lectura mínima de contenedores MP4/MOV (ISO BMFF) para obtener las
 * dimensiones de presentación de la pista de video (caja "tkhd").
 * No decodifica nada: sólo recorre cajas.
 */

interface Caja {
  tipo: string;
  inicio: number; // inicio del contenido
  fin: number;
}

function leerCajas(buf: Uint8Array, desde: number, hasta: number): Caja[] {
  const vista = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const cajas: Caja[] = [];
  let pos = desde;
  while (pos + 8 <= hasta) {
    let tam = vista.getUint32(pos);
    const tipo = String.fromCharCode(buf[pos + 4], buf[pos + 5], buf[pos + 6], buf[pos + 7]);
    let cabecera = 8;
    if (tam === 1) {
      if (pos + 16 > hasta) break;
      tam = Number(vista.getBigUint64(pos + 8));
      cabecera = 16;
    } else if (tam === 0) {
      tam = hasta - pos;
    }
    if (tam < cabecera || pos + tam > hasta) break;
    cajas.push({ tipo, inicio: pos + cabecera, fin: pos + tam });
    pos += tam;
  }
  return cajas;
}

function handlerDePista(buf: Uint8Array, trak: Caja): string | null {
  for (const c of leerCajas(buf, trak.inicio, trak.fin)) {
    if (c.tipo !== 'mdia') continue;
    for (const h of leerCajas(buf, c.inicio, c.fin)) {
      // hdlr: version/flags(4) + pre_defined(4) + handler_type(4)
      if (h.tipo === 'hdlr' && h.fin - h.inicio >= 12) {
        return String.fromCharCode(...buf.subarray(h.inicio + 8, h.inicio + 12));
      }
    }
  }
  return null;
}

/** Devuelve { ancho, alto } de la primera pista de video, o null si no se puede leer. */
export function leerDimensionesMp4(buf: Uint8Array): { ancho: number; alto: number } | null {
  const vista = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const moov = leerCajas(buf, 0, buf.byteLength).find((c) => c.tipo === 'moov');
  if (!moov) return null;

  for (const trak of leerCajas(buf, moov.inicio, moov.fin).filter((c) => c.tipo === 'trak')) {
    const handler = handlerDePista(buf, trak);
    if (handler !== null && handler !== 'vide') continue;
    const tkhd = leerCajas(buf, trak.inicio, trak.fin).find((c) => c.tipo === 'tkhd');
    if (!tkhd || tkhd.fin - tkhd.inicio < 84) continue;
    // Ancho y alto (punto fijo 16.16) son los últimos 8 bytes de tkhd.
    const ancho = vista.getUint32(tkhd.fin - 8) / 65536;
    const alto = vista.getUint32(tkhd.fin - 4) / 65536;
    if (ancho > 0 && alto > 0) return { ancho: Math.round(ancho), alto: Math.round(alto) };
  }
  return null;
}
