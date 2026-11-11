import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { IconoCheck, IconoRepetir, IconoVideo } from './Iconos.tsx';
import { mensajeError, type CodigoErrorRA } from '../ra/errores.ts';
import { porcentajeCarga } from '../ra/estado.ts';
import type { ProgresoCarga } from '../ra/sesion.ts';

export function PanelCarga({ progreso }: { progreso: ProgresoCarga }) {
  const pasos: { clave: string; texto: string; listo: boolean; activo: boolean }[] = [
    { clave: 'camara', texto: progreso.camara ? 'Cámara activada' : 'Permiso de cámara: tocá “Permitir” si el navegador lo pide', listo: progreso.camara, activo: !progreso.camara },
    { clave: 'motor', texto: 'Motor de realidad aumentada', listo: progreso.motor, activo: !progreso.motor },
    {
      clave: 'target',
      texto: progreso.target >= 1 ? 'Referencia del póster' : `Referencia del póster (${Math.round(progreso.target * 100)}%)`,
      listo: progreso.target >= 1,
      activo: progreso.target < 1,
    },
    { clave: 'animacion', texto: 'Animación', listo: progreso.animacion, activo: !progreso.animacion },
    { clave: 'calibrando', texto: 'Calibrando', listo: false, activo: progreso.calibrando },
  ];
  const porcentaje = porcentajeCarga(progreso);
  return (
    <div className="ra-panel ra-panel--translucido">
      <section className="ra-tarjeta" aria-labelledby="titulo-carga" aria-busy="true">
        <h2 id="titulo-carga">Preparando la cámara</h2>
        <p>Esto tarda unos segundos la primera vez.</p>
        <ul className="carga-pasos">
          {pasos.map((p) => (
            <li key={p.clave} data-estado={p.listo ? 'listo' : p.activo ? 'activo' : 'pendiente'}>
              <span className="carga-pasos__icono">{p.listo ? <IconoCheck /> : p.activo ? <span className="girador" /> : null}</span>
              {p.texto}
            </li>
          ))}
        </ul>
        <div
          className="progreso"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcentaje}
          aria-label="Progreso de carga"
        >
          <div className="progreso__barra" style={{ width: `${porcentaje}%` }} />
        </div>
      </section>
    </div>
  );
}

export function PanelError({
  codigo,
  alReintentar,
  rutaVideo,
  rutaProyecto: volver,
}: {
  codigo: CodigoErrorRA;
  alReintentar: () => void;
  rutaVideo?: string;
  rutaProyecto?: string;
}) {
  const mensaje = mensajeError(codigo);
  const botonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  useEffect(() => botonRef.current?.focus(), []);
  return (
    <div className="ra-panel">
      <section className="ra-tarjeta" role="alertdialog" aria-labelledby="titulo-error" aria-describedby="detalle-error">
        <h2 id="titulo-error">{mensaje.titulo}</h2>
        <p id="detalle-error">{mensaje.detalle}</p>
        {mensaje.sugerencias.length > 0 && (
          <ul>
            {mensaje.sugerencias.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
        <div className="acciones">
          {mensaje.reintentable && (
            <button
              type="button"
              className="boton boton--primario"
              onClick={alReintentar}
              ref={botonRef as React.RefObject<HTMLButtonElement>}
            >
              <IconoRepetir /> Reintentar
            </button>
          )}
          {rutaVideo && (
            <Link
              to={rutaVideo}
              replace
              className={`boton ${mensaje.reintentable ? '' : 'boton--primario'}`}
              ref={mensaje.reintentable ? undefined : (botonRef as React.RefObject<HTMLAnchorElement>)}
            >
              <IconoVideo /> Ver animación sin RA
            </Link>
          )}
          <Link to={volver ?? '/proyectos'} replace className="boton boton--fantasma">
            {volver ? 'Volver al proyecto' : 'Ver los proyectos'}
          </Link>
        </div>
      </section>
    </div>
  );
}
