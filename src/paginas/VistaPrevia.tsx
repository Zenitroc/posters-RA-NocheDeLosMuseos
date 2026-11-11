import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Aviso } from '../componentes/Aviso.tsx';
import { CapaSobrePoster } from '../componentes/CapaSobrePoster.tsx';
import { IconoVolver } from '../componentes/Iconos.tsx';
import { useTitulo } from '../componentes/useTitulo.ts';
import { buscarProyecto } from '../proyectos/catalogo.ts';
import { calcularAjuste } from '../proyectos/modelo.ts';
import NoEncontrado from './NoEncontrado.tsx';

/**
 * Vista previa antes de publicar: póster y video lado a lado, y el video
 * superpuesto al póster tal como se colocará en RA (mismo cálculo de ajuste).
 * Sirve para revisar textos deformados por la IA y la alineación.
 */
export default function VistaPrevia() {
  const { slug } = useParams();
  const proyecto = buscarProyecto(slug);
  useTitulo(proyecto ? `Vista previa: ${proyecto.nombre}` : undefined);
  const [opacidad, setOpacidad] = useState(0.5);

  if (!proyecto) return <NoEncontrado />;
  const { urls, medidas, reproduccion } = proyecto;
  const base = medidas.target ?? medidas.poster;
  const ajuste =
    base && medidas.video ? calcularAjuste(base.ancho / base.alto, medidas.video.ancho / medidas.video.alto, reproduccion) : null;

  return (
    <section className="vista-previa contenedor">
      <Link to="/recursos" className="enlace-volver">
        <IconoVolver /> Recursos
      </Link>
      <h1>Vista previa: {proyecto.nombre}</h1>

      <Aviso tipo="info">
        Los videos generados por IA pueden alterar textos, logos o proporciones del póster. Revisá la animación antes de
        publicar. El modo de ajuste actual es <strong>{ajuste?.modo ?? '—'}</strong>
        {reproduccion.ajuste === 'auto' && ' (automático)'}. Animación en RA:{' '}
        <strong>{proyecto.estado.animaciones.join(' → respaldo ') || 'ninguna'}</strong> (modo "{proyecto.animacion.modo}").
      </Aviso>
      {ajuste?.advertencia && (
        <Aviso tipo="alerta" className="vista-previa__advertencia">
          {ajuste.advertencia}
        </Aviso>
      )}

      <div className="vista-previa__grilla">
        <figure>
          {urls.poster ? <img src={urls.poster} alt={`Póster original de ${proyecto.nombre}`} /> : <div className="vacio">Sin póster</div>}
          <figcaption>Póster original {medidas.poster && `(${medidas.poster.ancho}×${medidas.poster.alto})`}</figcaption>
        </figure>
        <figure>
          {urls.video ? (
            <video src={urls.video} muted playsInline loop autoPlay controls preload="metadata" />
          ) : (
            <div className="vacio">Sin video</div>
          )}
          <figcaption>Animación {medidas.video && `(${medidas.video.ancho}×${medidas.video.alto})`}</figcaption>
        </figure>
        {urls.capa && (
          <figure>
            <CapaSobrePoster proyecto={proyecto} etiqueta="Capa Canvas sobre el póster" />
            <figcaption>
              Capa Canvas sobre el póster (como se verá en RA)
              {medidas.capa && ` · ${medidas.capa.ancho}×${medidas.capa.alto}`}
            </figcaption>
          </figure>
        )}
        {urls.capa && (
          <figure>
            <CapaSobrePoster proyecto={proyecto} fondo="transparente" etiqueta="Capa Canvas sola" />
            <figcaption>Capa sola: el fondo a cuadros es lo transparente (deja ver el póster impreso).</figcaption>
          </figure>
        )}
        {urls.poster && urls.video && ajuste && (
          <figure>
            <div className="superposicion">
              <img src={urls.poster} alt="" />
              <video
                src={urls.video}
                muted
                playsInline
                loop
                autoPlay
                preload="metadata"
                aria-label="Video superpuesto al póster"
                style={{
                  opacity: opacidad,
                  width: `${ajuste.plano.ancho * 100}%`,
                  height: `${ajuste.plano.alto * (base!.ancho / base!.alto) * 100}%`,
                  left: `${(0.5 - ajuste.plano.ancho / 2 + ajuste.posicion.x) * 100}%`,
                  top: `${(0.5 - (ajuste.plano.alto * (base!.ancho / base!.alto)) / 2 - ajuste.posicion.y * (base!.ancho / base!.alto)) * 100}%`,
                  objectFit: ajuste.modo === 'cubrir' ? 'cover' : 'fill',
                }}
              />
            </div>
            <figcaption>
              <label htmlFor="opacidad">Superposición como en RA — opacidad del video: {Math.round(opacidad * 100)}%</label>
              <input
                id="opacidad"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={opacidad}
                onChange={(e) => setOpacidad(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
