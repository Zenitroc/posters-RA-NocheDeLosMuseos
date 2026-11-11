import { Link, Outlet, useNavigation } from 'react-router';
import { TEXTOS } from '../config.ts';
import { Logo } from './Iconos.tsx';

/** Estructura común de las páginas (todas menos la experiencia de RA, que es pantalla completa). */
export function Marco() {
  const navegacion = useNavigation();
  return (
    <div className="marco">
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>
      {navegacion.state === 'loading' && <div className="barra-carga" role="progressbar" aria-label="Cargando" />}
      <header className="cabecera">
        <div className="contenedor cabecera__fila">
          <Link to="/" className="marca">
            <Logo className="marca__logo" />
            <span className="marca__texto">
              {TEXTOS.titulo}
              <small>Noche de los Museos · UTN BA</small>
            </span>
          </Link>
          <a className="logo-utn" href="https://www.frba.utn.edu.ar" target="_blank" rel="noopener noreferrer">
            <img src="/logo-utnba.png" alt="UTN BA — Facultad Regional Buenos Aires" width="165" height="52" />
          </a>
          <nav className="cabecera__nav" aria-label="Principal">
            <Link to="/proyectos">Proyectos</Link>
            <Link to="/" className="boton boton--chico boton--primario">
              Abrir cámara
            </Link>
          </nav>
        </div>
      </header>
      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="pie">
        <div className="contenedor">
          <span className="pie__inst">
            <img className="logo-utn__pie" src="/logo-utnba.png" alt="" width="99" height="31" />
            {TEXTOS.institucion}
          </span>
          <span>Sin apps ni registros: todo ocurre en tu navegador.</span>
        </div>
      </footer>
    </div>
  );
}
