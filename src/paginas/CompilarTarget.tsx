import { useState } from 'react';
import { Link } from 'react-router';
import { Aviso } from '../componentes/Aviso.tsx';
import { IconoDescargar, IconoVolver } from '../componentes/Iconos.tsx';
import { useTitulo } from '../componentes/useTitulo.ts';

const LADO_MAXIMO = 1600; // igual que scripts/lib/mindar.ts

type Estado = { tipo: 'inicial' } | { tipo: 'compilando'; porcentaje: number } | { tipo: 'listo'; url: string; kb: number } | { tipo: 'error'; mensaje: string };

async function cargarImagen(archivo: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Alternativa en navegador al script `npm run proyecto:preparar`, usando el
 * compilador oficial de MindAR (el mismo de su herramienta web).
 */
export default function CompilarTarget() {
  useTitulo('Compilar target');
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicial' });

  const compilar = async (archivo: File | undefined) => {
    if (!archivo) return;
    setEstado({ tipo: 'compilando', porcentaje: 0 });
    try {
      const [{ Compiler }, canvas] = await Promise.all([import('mind-ar/dist/mindar-image.prod.js'), cargarImagen(archivo)]);
      const compilador = new Compiler();
      await compilador.compileImageTargets([canvas], (p) => setEstado({ tipo: 'compilando', porcentaje: p }));
      const datos = compilador.exportData();
      const url = URL.createObjectURL(new Blob([datos], { type: 'application/octet-stream' }));
      setEstado({ tipo: 'listo', url, kb: Math.round(datos.byteLength / 1024) });
    } catch (e) {
      setEstado({ tipo: 'error', mensaje: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <section className="compilador contenedor">
      <Link to="/recursos" className="enlace-volver">
        <IconoVolver /> Recursos
      </Link>
      <h1>Compilar target .mind</h1>
      <p className="recursos__intro">
        Genera el archivo de reconocimiento a partir de la imagen original del póster, sin instalar nada. Es equivalente
        a <code>npm run proyecto:preparar</code>.
      </p>
      <ol>
        <li>Elegí la imagen original del póster (JPG o PNG), la misma que se imprime.</li>
        <li>Esperá a que termine (puede tardar hasta un minuto).</li>
        <li>
          Descargá <code>target.mind</code> y guardalo en <code>public/posters/&lt;slug&gt;/target.mind</code>.
        </li>
      </ol>

      <div className="recursos__config" style={{ marginTop: '1.25rem' }}>
        <label htmlFor="imagen-poster">Imagen del póster</label>
        <input
          id="imagen-poster"
          className="campo"
          type="file"
          accept="image/jpeg,image/png"
          disabled={estado.tipo === 'compilando'}
          onChange={(e) => compilar(e.target.files?.[0])}
        />
        {estado.tipo === 'compilando' && (
          <div className="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(estado.porcentaje)} aria-label="Compilando">
            <div className="progreso__barra" style={{ width: `${estado.porcentaje}%` }} />
          </div>
        )}
        {estado.tipo === 'listo' && (
          <a className="boton boton--primario" href={estado.url} download="target.mind">
            <IconoDescargar /> Descargar target.mind ({estado.kb} KB)
          </a>
        )}
        {estado.tipo === 'error' && <Aviso tipo="error">No se pudo compilar: {estado.mensaje}</Aviso>}
      </div>
      <Aviso tipo="info">
        Si usás esta herramienta, no se genera <code>target.meta.json</code>: el validador no podrá avisarte si el póster
        cambia después. Con el script sí.
      </Aviso>
    </section>
  );
}
