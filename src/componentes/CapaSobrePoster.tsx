import { useEffect, useRef, useState } from 'react';
import type { ProyectoCatalogo } from '../proyectos/modelo.ts';
import { margenCapa, obtenerApiCapa } from '../ra/capa-canvas.ts';
import { IconoPausa, IconoPlay, IconoRepetir } from './Iconos.tsx';

interface Props {
  proyecto: ProyectoCatalogo;
  /** "poster": la capa sobre la imagen del póster; "transparente": sola, sobre un fondo a cuadros. */
  fondo?: 'poster' | 'transparente';
  etiqueta: string;
}

const LADO_MAXIMO = 1200;

/**
 * Reproduce la capa Canvas fuera de la RA (vista sin RA y vista previa):
 * póster + capa en un único <canvas>, con su propio reloj.
 */
export function CapaSobrePoster({ proyecto, fondo = 'poster', etiqueta }: Props) {
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const relojRef = useRef<{ acumulado: number; inicio: number | null }>({ acumulado: 0, inicio: null });
  const [pausado, setPausado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const { urls, animacion, reproduccion } = proyecto;

  useEffect(() => {
    const lienzo = lienzoRef.current;
    if (!lienzo || !urls.capa) return;
    let rafId = 0;
    let vigente = true;
    const reloj = relojRef.current;
    reloj.acumulado = 0;
    reloj.inicio = performance.now();

    (async () => {
      const [api, poster] = await Promise.all([
        obtenerApiCapa(urls.capa!, animacion.canvas.global),
        fondo === 'poster' && urls.poster ? cargarImagen(urls.poster) : Promise.resolve(null),
      ]);
      if (!vigente) return;
      const ancho = api.WIDTH ?? animacion.canvas.ancho ?? poster?.naturalWidth ?? 1000;
      const alto = api.HEIGHT ?? animacion.canvas.alto ?? poster?.naturalHeight ?? 1414;
      const duracion = api.DURATION ?? 10;
      // Con margen, el póster ocupa el centro del lienzo y alrededor se ve "la pared".
      const m = margenCapa(api);
      const px = (ancho * m) / (1 + 2 * m);
      const py = (alto * m) / (1 + 2 * m);
      const escala = Math.min(1, LADO_MAXIMO / Math.max(ancho, alto));
      lienzo.width = Math.round(ancho * escala);
      lienzo.height = Math.round(alto * escala);
      const ctx = lienzo.getContext('2d')!;
      let ultimoSegundo = -1;

      const cuadro = (ahora: number) => {
        if (!vigente) return;
        let t = reloj.acumulado + (reloj.inicio === null ? 0 : (ahora - reloj.inicio) / 1000);
        if (!reproduccion.bucle && t >= duracion) t = duracion;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, lienzo.width, lienzo.height);
        ctx.setTransform(escala, 0, 0, escala, 0, 0);
        if (poster) {
          if (m) {
            ctx.fillStyle = '#2a2a30';
            ctx.fillRect(0, 0, ancho, alto);
          }
          ctx.drawImage(poster, px, py, ancho - 2 * px, alto - 2 * py);
        }
        try {
          ctx.save();
          api.render(ctx, t);
          ctx.restore();
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          return;
        }
        const s = Math.floor(t % duracion);
        if (s !== ultimoSegundo) {
          ultimoSegundo = s;
          setSegundos(s);
        }
        rafId = requestAnimationFrame(cuadro);
      };
      rafId = requestAnimationFrame(cuadro);
    })().catch((e) => vigente && setError(e instanceof Error ? e.message : String(e)));

    return () => {
      vigente = false;
      cancelAnimationFrame(rafId);
      lienzo.width = 0;
      lienzo.height = 0;
    };
  }, [urls.capa, urls.poster, animacion.canvas, fondo, reproduccion.bucle]);

  const alternar = () => {
    const r = relojRef.current;
    if (r.inicio === null) {
      r.inicio = performance.now();
      setPausado(false);
    } else {
      r.acumulado += (performance.now() - r.inicio) / 1000;
      r.inicio = null;
      setPausado(true);
    }
  };

  const repetir = () => {
    relojRef.current.acumulado = 0;
    if (relojRef.current.inicio !== null) relojRef.current.inicio = performance.now();
  };

  if (error) return <p className="aviso aviso--error">No se pudo reproducir la capa animada: {error}</p>;

  return (
    <div className="capa-poster">
      <canvas
        ref={lienzoRef}
        className={`capa-poster__lienzo ${fondo === 'transparente' ? 'capa-poster__lienzo--cuadros' : ''}`}
        role="img"
        aria-label={etiqueta}
      />
      <div className="fila-acciones">
        <button type="button" className="boton boton--chico" onClick={alternar}>
          {pausado ? <IconoPlay /> : <IconoPausa />} {pausado ? 'Reproducir' : 'Pausar'}
        </button>
        <button type="button" className="boton boton--chico" onClick={repetir}>
          <IconoRepetir /> Repetir
        </button>
        <span className="capa-poster__tiempo" aria-hidden="true">
          {segundos}s
        </span>
      </div>
    </div>
  );
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, error) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => error(new Error('No se pudo cargar el póster'));
    img.src = src;
  });
}
