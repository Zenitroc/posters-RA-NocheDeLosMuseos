import { Link } from 'react-router';
import { Aviso } from '../componentes/Aviso.tsx';
import { IconoCamara, IconoEncuadre, IconoQr, Premio } from '../componentes/Iconos.tsx';
import { ImagenPoster } from '../componentes/ImagenPoster.tsx';
import { useTitulo } from '../componentes/useTitulo.ts';
import { TEXTOS } from '../config.ts';
import { catalogo, proyectosPublicados } from '../proyectos/catalogo.ts';
import { rutaProyecto } from '../proyectos/urls.ts';

const PASOS = [
  { icono: IconoQr, titulo: 'Escaneá el QR', texto: 'El de la entrada de la muestra: abre la cámara directo.' },
  { icono: IconoEncuadre, titulo: 'Apuntá a un póster', texto: 'Se reconoce solo: no hay que elegir nada.' },
  { icono: IconoCamara, titulo: 'Mirá cómo cobra vida', texto: 'Sin apps ni registros: funciona en el navegador.' },
];

export default function Inicio() {
  useTitulo();
  const proyectos = proyectosPublicados(catalogo);

  return (
    <>
      <section className="heroe contenedor" aria-labelledby="titulo-principal">
        <p className="heroe__antetitulo">{TEXTOS.subtitulo}</p>
        <h1 id="titulo-principal">
          Proyectos que <em>cobran vida</em>
        </h1>
        <p className="heroe__bajada">
          Los proyectos finales de Ingeniería en Sistemas de Información salen del papel. Escaneá el código de cada
          póster, apuntá tu celular y descubrí su versión animada en realidad aumentada.
        </p>
        <p className="heroe__accion">
          <Link to="/" className="boton boton--primario">
            <IconoCamara /> Abrir la cámara
          </Link>
        </p>
        <ol className="pasos" aria-label="Cómo funciona">
          {PASOS.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo}>
              <span className="pasos__icono">
                <Icono />
              </span>
              <span>
                <strong>{titulo}</strong>
                <span>{texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="seccion contenedor" aria-labelledby="titulo-catalogo">
        <div className="seccion__titulo">
          <h2 id="titulo-catalogo">Proyectos en exposición</h2>
          {proyectos.length > 0 && <p>{proyectos.length === 1 ? '1 proyecto' : `${proyectos.length} proyectos`}</p>}
        </div>

        {proyectos.length === 0 ? (
          <div className="vacio">
            <h3>Todavía no hay proyectos publicados</h3>
            <p>Muy pronto vas a poder ver acá los pósters de la muestra.</p>
          </div>
        ) : (
          <ul className="grilla-proyectos">
            {proyectos.map((p, i) => (
              <li key={p.slug}>
                <Link to={rutaProyecto(p.slug)} className="tarjeta">
                  <div className="tarjeta__imagen">
                    <ImagenPoster proyecto={p} prioridad={i < 2} />
                    <div className="tarjeta__etiquetas">
                      {p.demo && <span className="etiqueta etiqueta--demo">Demo</span>}
                      {!p.estado.listoParaRA && <span className="etiqueta">Próximamente</span>}
                    </div>
                  </div>
                  <div className="tarjeta__cuerpo">
                    <h3>{p.nombre}</h3>
                    {p.subtitulo && <p>{p.subtitulo}</p>}
                    {p.premio && <Premio texto={p.premio} className="premio--chico" />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {proyectos.length > 0 && (
          <Aviso className="no-imprimir" tipo="info">
            En la muestra, lo más rápido es abrir la cámara y apuntar a un póster: se reconoce solo. Este catálogo sirve
            para ver cada proyecto sin estar frente al póster.
          </Aviso>
        )}
      </section>
    </>
  );
}
