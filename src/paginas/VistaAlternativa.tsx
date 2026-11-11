import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Aviso } from '../componentes/Aviso.tsx';
import { CapaSobrePoster } from '../componentes/CapaSobrePoster.tsx';
import { IconoCamara, IconoPlay, IconoVolver } from '../componentes/Iconos.tsx';
import { useTitulo } from '../componentes/useTitulo.ts';
import { buscarProyecto, proporcionPoster } from '../proyectos/catalogo.ts';
import { rutaProyecto } from '../proyectos/urls.ts';
import NoEncontrado from './NoEncontrado.tsx';

/** Pantalla D: la animación como video común, para cuando la RA no es posible. */
export default function VistaAlternativa() {
  const { slug } = useParams();
  const proyecto = buscarProyecto(slug);
  useTitulo(proyecto ? `${proyecto.nombre} (sin RA)` : undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'NotAllowedError') setBloqueado(true);
    });
    return () => {
      // Cortar la descarga al salir.
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, []);

  if (!proyecto || !proyecto.activo) return <NoEncontrado />;

  const video = proyecto.urls.video;
  const medidas = proyecto.medidas.video;
  const proporcion = medidas ? medidas.ancho / medidas.alto : proporcionPoster(proyecto);

  return (
    <article className="video-alternativo contenedor">
      <Link to={rutaProyecto(proyecto.slug)} className="enlace-volver">
        <IconoVolver /> Volver a {proyecto.nombre}
      </Link>
      <h1>{proyecto.nombre}</h1>

      <Aviso tipo="info">
        <strong>Modo sin realidad aumentada.</strong> Estás viendo la animación como un video común, no sobre el póster.
      </Aviso>

      {!video && proyecto.urls.capa && proyecto.urls.poster ? (
        <div className="video-alternativo__marco video-alternativo__marco--capa">
          <CapaSobrePoster proyecto={proyecto} etiqueta={`Animación del póster ${proyecto.nombre}`} />
        </div>
      ) : !video ? (
        <Aviso tipo="alerta" className="video-alternativo__falta">
          La animación de este proyecto todavía no está disponible.
        </Aviso>
      ) : (
        <>
          <div className="video-alternativo__marco" style={{ aspectRatio: String(proporcion) }}>
            <video
              ref={videoRef}
              src={video}
              poster={proyecto.urls.poster}
              muted
              playsInline
              loop={proyecto.reproduccion.bucle}
              controls
              preload="metadata"
              aria-label={`Animación del póster ${proyecto.nombre}`}
              onError={() => setFallo(true)}
              onPlay={() => setBloqueado(false)}
            />
          </div>
          {fallo && (
            <Aviso tipo="error">No se pudo reproducir la animación. Revisá tu conexión y recargá la página.</Aviso>
          )}
          {bloqueado && !fallo && (
            <div className="fila-acciones">
              <button type="button" className="boton boton--primario" onClick={() => videoRef.current?.play()}>
                <IconoPlay /> Reproducir animación
              </button>
            </div>
          )}
        </>
      )}

      {proyecto.estado.listoParaRA && (
        <div className="fila-acciones" style={{ marginTop: '1.25rem' }}>
          <Link to={`${rutaProyecto(proyecto.slug)}/ra`} className="boton">
            <IconoCamara /> Probar con la cámara
          </Link>
        </div>
      )}
    </article>
  );
}
