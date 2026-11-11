import { Link } from 'react-router';
import { useTitulo } from '../componentes/useTitulo.ts';

interface Props {
  titulo?: string;
  detalle?: string;
}

export default function NoEncontrado({
  titulo = 'No encontramos ese proyecto',
  detalle = 'Puede que el enlace esté incompleto. Revisá el código QR o elegí el proyecto desde el catálogo.',
}: Props) {
  useTitulo(titulo);
  return (
    <section className="pagina-mensaje contenedor">
      <h1>{titulo}</h1>
      <p>{detalle}</p>
      <Link to="/proyectos" className="boton boton--primario">
        Ver todos los proyectos
      </Link>
    </section>
  );
}
