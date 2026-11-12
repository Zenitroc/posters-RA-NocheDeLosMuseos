/**
 * Tarjeta de información que flota junto al póster detectado y lo sigue en pantalla (RA).
 *
 * La sesión de RA informa en cada cuadro las esquinas del póster (`receptorRef`); este componente
 * reubica la tarjeta directamente en el DOM (sin re-renderizar React en cada cuadro), la suaviza y
 * dibuja una línea que la une al póster. Si no hay lugar libre, muestra un chip en la esquina del
 * póster que abre la hoja con el texto completo.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ReceptorCuadro } from './useInfoFlotante.ts';
import { IconoExpandir } from './Iconos.tsx';
import { rectDe, ubicarTarjeta, type ContenidoInfo, type Lado, type Punto, type Rect, type Ubicacion } from '../ra/info-flotante.ts';

/** Segundos que una nueva ubicación (tarjeta ↔ chip) debe sostenerse antes de cambiar. */
const ESPERA_CAMBIO_MODO = 0.35;
/** Segundos sin póster antes de ocultar (evita parpadeos por pérdidas breves). */
const ESPERA_OCULTAR = 0.3;
/** Fracción de acercamiento por cuadro hacia la posición destino (suavizado). */
const SUAVIZADO = 0.3;

export function InfoFlotante({
  info,
  receptorRef,
  zonaUtil,
  alAbrir,
  oculto = false,
}: {
  info: ContenidoInfo;
  /** La página conecta aquí el `alCuadro` de la sesión. */
  receptorRef: RefObject<ReceptorCuadro | null>;
  /** Zona de pantalla libre de barras y botones (px del contenedor). */
  zonaUtil: () => Rect;
  alAbrir: () => void;
  oculto?: boolean;
}) {
  const [modo, setModo] = useState<'tarjeta' | 'chip' | null>(null);
  const modoRef = useRef(modo);
  const tarjetaRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const lineaRef = useRef<SVGLineElement>(null);
  const puntoRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    modoRef.current = modo;
  }, [modo]);

  useEffect(() => {
    let ultimo = performance.now();
    let sinPoster = 0;
    let pendiente: { modo: 'tarjeta' | 'chip'; desde: number } | null = null;
    let lado: Lado | null = null;
    let util: Rect | null = null;
    let cuadros = 0;
    let pos: { x: number; y: number; ancho: number; altoMax: number } | null = null;
    let chip: Punto | null = null;

    const actualizar: ReceptorCuadro = (esquinas) => {
      const ahora = performance.now();
      const dt = Math.min(0.1, (ahora - ultimo) / 1000);
      ultimo = ahora;

      if (!esquinas) {
        sinPoster += dt;
        if (sinPoster > ESPERA_OCULTAR && modoRef.current !== null) {
          modoRef.current = null;
          setModo(null);
          pos = null;
          chip = null;
          lado = null;
        }
        return;
      }
      sinPoster = 0;
      if (!util || cuadros++ % 20 === 0) util = zonaUtil();

      const tarjeta = tarjetaRef.current;
      const u: Ubicacion = ubicarTarjeta(rectDe(esquinas), util, lado, tarjeta?.offsetHeight || Infinity);

      // Cambiar entre tarjeta y chip sólo si la nueva situación se sostiene un instante.
      if (u.modo !== modoRef.current) {
        if (modoRef.current === null) {
          modoRef.current = u.modo;
          setModo(u.modo);
        } else if (!pendiente || pendiente.modo !== u.modo) {
          pendiente = { modo: u.modo, desde: ahora };
        } else if ((ahora - pendiente.desde) / 1000 > ESPERA_CAMBIO_MODO) {
          modoRef.current = u.modo;
          setModo(u.modo);
          pendiente = null;
          pos = null;
          chip = null;
        }
      } else {
        pendiente = null;
      }

      if (u.modo === 'tarjeta' && modoRef.current === 'tarjeta' && tarjeta) {
        const saltar = !pos || u.lado !== lado;
        lado = u.lado;
        const k = saltar ? 1 : SUAVIZADO;
        const p = (pos ??= { x: u.x, y: u.y, ancho: u.ancho, altoMax: u.altoMax });
        p.x += (u.x - p.x) * k;
        p.y += (u.y - p.y) * k;
        p.ancho += (u.ancho - p.ancho) * k;
        p.altoMax += (u.altoMax - p.altoMax) * k;
        tarjeta.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
        tarjeta.style.width = `${Math.round(p.ancho)}px`;
        tarjeta.style.maxHeight = `${Math.round(p.altoMax)}px`;
        tarjeta.dataset.lado = u.lado;
        tarjeta.classList.add('ra-info--lista'); // visible recién cuando ya está en su lugar

        // Línea desde el borde del póster hasta el borde más cercano de la tarjeta.
        const h = tarjeta.offsetHeight;
        const w = p.ancho;
        const entre = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
        let fin: Punto;
        if (u.lado === 'derecha') fin = { x: p.x, y: entre(u.ancla.y, p.y + 18, p.y + h - 18) };
        else if (u.lado === 'izquierda') fin = { x: p.x + w, y: entre(u.ancla.y, p.y + 18, p.y + h - 18) };
        else if (u.lado === 'abajo') fin = { x: entre(u.ancla.x, p.x + 24, p.x + w - 24), y: p.y };
        else fin = { x: entre(u.ancla.x, p.x + 24, p.x + w - 24), y: p.y + h };
        lineaRef.current?.setAttribute('x1', u.ancla.x.toFixed(1));
        lineaRef.current?.setAttribute('y1', u.ancla.y.toFixed(1));
        lineaRef.current?.setAttribute('x2', fin.x.toFixed(1));
        lineaRef.current?.setAttribute('y2', fin.y.toFixed(1));
        puntoRef.current?.setAttribute('cx', u.ancla.x.toFixed(1));
        puntoRef.current?.setAttribute('cy', u.ancla.y.toFixed(1));
      } else if (u.modo === 'chip' && modoRef.current === 'chip' && chipRef.current) {
        const c = (chip ??= { x: u.x, y: u.y });
        c.x += (u.x - c.x) * SUAVIZADO;
        c.y += (u.y - c.y) * SUAVIZADO;
        chipRef.current.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0) translate(-100%, 0)`;
        chipRef.current.classList.add('ra-info-chip--lista');
      }
    };

    receptorRef.current = actualizar;
    return () => {
      if (receptorRef.current === actualizar) receptorRef.current = null;
    };
  }, [receptorRef, zonaUtil]);

  if (oculto || modo === null) return null;

  if (modo === 'chip') {
    return (
      <div className="ra-info-capa">
        <button type="button" className="ra-info-chip" ref={chipRef} onClick={alAbrir}>
          <span className="ra-info-chip__i" aria-hidden="true">
            i
          </span>
          Más sobre {info.nombre}
        </button>
      </div>
    );
  }

  return (
    <div className="ra-info-capa">
      <svg className="ra-info-linea" aria-hidden="true">
        <line ref={lineaRef} />
        <circle ref={puntoRef} r="5" />
      </svg>
      <section className="ra-info" ref={tarjetaRef} aria-label={`Más información sobre ${info.nombre}`}>
        <header className="ra-info__cabecera">
          <div>
            <p className="ra-info__etiqueta">Proyecto final · UTN FRBA</p>
            <h2>{info.nombre}</h2>
          </div>
          <button type="button" className="ra-info__expandir" onClick={alAbrir} aria-label="Leer en pantalla completa">
            <IconoExpandir />
          </button>
        </header>
        <div className="ra-info__cuerpo">
          {info.subtitulo && <p className="ra-info__subtitulo">{info.subtitulo}</p>}
          {info.parrafos.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {info.equipo?.length ? <p className="ra-info__equipo">Equipo: {info.equipo.join(' · ')}</p> : null}
        </div>
      </section>
    </div>
  );
}
