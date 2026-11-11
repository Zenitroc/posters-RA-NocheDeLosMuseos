/** fetch() con progreso (fracción 0..1) y cancelación. */
export async function descargarConProgreso(
  url: string,
  senal: AbortSignal,
  alProgreso: (fraccion: number) => void,
): Promise<ArrayBuffer> {
  const respuesta = await fetch(url, { signal: senal });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} al descargar ${url}`);

  const total = Number(respuesta.headers.get('content-length')) || 0;
  if (!respuesta.body || !total) {
    const buffer = await respuesta.arrayBuffer();
    alProgreso(1);
    return buffer;
  }

  const lector = respuesta.body.getReader();
  const partes: Uint8Array[] = [];
  let recibido = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    partes.push(value);
    recibido += value.byteLength;
    alProgreso(Math.min(1, recibido / total));
  }
  const resultado = new Uint8Array(recibido);
  let pos = 0;
  for (const p of partes) {
    resultado.set(p, pos);
    pos += p.byteLength;
  }
  alProgreso(1);
  return resultado.buffer;
}
