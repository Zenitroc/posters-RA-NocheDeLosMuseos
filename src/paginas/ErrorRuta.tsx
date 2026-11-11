import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import NoEncontrado from './NoEncontrado.tsx';

/** Pantalla de error genérica: el visitante siempre tiene una salida. */
export default function ErrorRuta() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NoEncontrado />;

  // Típico tras un nuevo despliegue: el navegador pide un fragmento JS que ya no existe.
  const esCargaModulo = error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message);

  return (
    <section className="pagina-mensaje contenedor" style={{ minHeight: '100dvh', alignContent: 'center' }}>
      <h1>Algo salió mal</h1>
      <p>
        {esCargaModulo
          ? 'No se pudo cargar esta parte del sitio. Puede ser la conexión o una actualización reciente.'
          : 'Ocurrió un error inesperado. Probá recargar la página.'}
      </p>
      <div className="fila-acciones">
        <button type="button" className="boton boton--primario" onClick={() => window.location.reload()}>
          Recargar
        </button>
        <Link to="/" className="boton" reloadDocument>
          Ir al inicio
        </Link>
      </div>
    </section>
  );
}
