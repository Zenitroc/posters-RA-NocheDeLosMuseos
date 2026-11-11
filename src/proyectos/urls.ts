/** Construcción de URLs públicas (puro: lo usan la app y los scripts). */

/**
 * Normaliza una URL base ("https://dominio/" → "https://dominio").
 * Devuelve null si no es una URL http(s) válida.
 */
export function normalizarUrlBase(valor: string | undefined | null): string | null {
  const texto = (valor ?? '').trim();
  if (!texto) return null;
  try {
    const url = new URL(texto);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.search || url.hash) return null;
    return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function rutaProyecto(slug: string): string {
  return `/p/${encodeURIComponent(slug)}`;
}

export function urlProyecto(base: string, slug: string): string {
  return `${base.replace(/\/+$/, '')}${rutaProyecto(slug)}`;
}

/** Problemas de una URL base para usarla en QR impresos (vacío = sin problemas). */
export function problemasUrlBase(base: string): string[] {
  const problemas: string[] = [];
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return ['No es una URL válida.'];
  }
  if (url.protocol !== 'https:') problemas.push('No usa HTTPS: los celulares no permitirán usar la cámara.');
  const host = url.hostname;
  if (host === 'localhost' || host.endsWith('.local') || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    problemas.push('Es una dirección local: sólo funcionará dentro de esta red o equipo.');
  }
  return problemas;
}
