import { useMemo } from 'react';
import { Link, useNavigation, useParams, useSearchParams } from 'react-router';
import { Aviso } from '../componentes/Aviso.tsx';
import { IconoCamara, IconoVideo, IconoVolver } from '../componentes/Iconos.tsx';
import { ImagenPoster } from '../componentes/ImagenPoster.tsx';
import { useTitulo } from '../componentes/useTitulo.ts';
import { buscarProyecto } from '../proyectos/catalogo.ts';
import { esModoAnimacion } from '../proyectos/modelo.ts';
import { rutaProyecto } from '../proyectos/urls.ts';
import { diagnosticarCompatibilidad } from '../ra/compatibilidad.ts';
import { mensajeError } from '../ra/errores.ts';
import NoEncontrado from './NoEncontrado.tsx';

export default function PaginaProyecto() {
  const { slug } = useParams();
  const proyecto = buscarProyecto(slug);
  const navegacion = useNavigation();
  const [busqueda] = useSearchParams();
  useTitulo(proyecto?.nombre);

  // Se calcula una vez: avisa antes de pedir la cámara si el navegador no puede usarla.
  const incompatibilidad = useMemo(() => (typeof window === 'undefined' ? null : diagnosticarCompatibilidad()), []);

  if (!proyecto || !proyecto.activo) {
    return (
      <NoEncontrado
        titulo={proyecto ? 'Este proyecto no está disponible' : undefined}
        detalle={proyecto ? 'Todavía no fue publicado. Probá más tarde o mirá los demás proyectos.' : undefined}
      />
    );
  }

  const { listoParaRA, listoParaVideo } = proyecto.estado;
  const rutaRA = `${rutaProyecto(proyecto.slug)}/ra`;
  // Para pruebas: /p/<slug>?modo=canvas|video se reenvía a la experiencia de RA.
  const modo = busqueda.get('modo');
  const destinoRA = esModoAnimacion(modo) ? `${rutaRA}?modo=${modo}` : rutaRA;
  const rutaVideo = `${rutaProyecto(proyecto.slug)}/video`;
  const abriendoRA = navegacion.state === 'loading' && navegacion.location?.pathname === rutaRA;
  const mensajeIncompatibilidad = incompatibilidad ? mensajeError(incompatibilidad) : null;
  const puedeRA = listoParaRA && !incompatibilidad;

  return (
    <article className="proyecto contenedor">
      <Link to="/proyectos" className="enlace-volver">
        <IconoVolver /> Todos los proyectos
      </Link>

      <div className="proyecto__grilla">
        <div className="proyecto__cabecera">
          <ImagenPoster proyecto={proyecto} className="proyecto__poster" prioridad />
          <div className="proyecto__titulos">
            <h1>{proyecto.nombre}</h1>
            {proyecto.subtitulo && <p className="subtitulo">{proyecto.subtitulo}</p>}
            {proyecto.demo && <span className="etiqueta etiqueta--demo">Recursos de demostración</span>}
          </div>
        </div>

        <div className="proyecto__acciones">
          {puedeRA ? (
            <Link to={destinoRA} className="boton boton--primario boton--grande" aria-busy={abriendoRA}>
              <IconoCamara /> {abriendoRA ? 'Cargando…' : 'Activar cámara'}
            </Link>
          ) : (
            <button type="button" className="boton boton--primario boton--grande" disabled>
              <IconoCamara /> Activar cámara
            </button>
          )}
          {listoParaVideo ? (
            <Link to={rutaVideo} className="boton boton--grande">
              <IconoVideo /> Ver animación sin RA
            </Link>
          ) : (
            <button type="button" className="boton boton--grande" disabled>
              <IconoVideo /> Ver animación sin RA
            </button>
          )}
        </div>

        {!listoParaRA && (
          <Aviso tipo="alerta">
            <strong>La experiencia de este póster todavía se está preparando.</strong>{' '}
            {listoParaVideo ? 'Mientras tanto podés ver la animación sin RA.' : 'Volvé a probar más tarde.'}
          </Aviso>
        )}

        {listoParaRA && mensajeIncompatibilidad && (
          <Aviso tipo="alerta">
            <strong>{mensajeIncompatibilidad.titulo}.</strong> {mensajeIncompatibilidad.sugerencias[0]}
            {listoParaVideo && ' También podés ver la animación sin RA.'}
          </Aviso>
        )}

        {listoParaRA && (
          <section className="instrucciones" aria-labelledby="titulo-instrucciones">
            <h2 id="titulo-instrucciones">Cómo verlo en realidad aumentada</h2>
            <ol>
              <li>Tocá “Activar cámara” y aceptá el permiso del navegador.</li>
              <li>Apuntá al póster impreso de {proyecto.nombre} hasta que entre completo en pantalla.</li>
              <li>Mantené el celular firme: la animación aparece sobre el papel y lo sigue al moverte.</li>
            </ol>
          </section>
        )}

        {(proyecto.descripcion || proyecto.equipo?.length) && (
          <section aria-label="Sobre el proyecto">
            {proyecto.descripcion && <p className="proyecto__descripcion">{proyecto.descripcion}</p>}
            {proyecto.equipo && proyecto.equipo.length > 0 && (
              <p className="proyecto__equipo">Equipo: {proyecto.equipo.join(', ')}</p>
            )}
          </section>
        )}
      </div>
    </article>
  );
}
