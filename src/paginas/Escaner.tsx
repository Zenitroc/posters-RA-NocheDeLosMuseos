/**
 * Portada de la plataforma: abre la cámara directamente y reconoce sola cuál de los pósters de la
 * muestra se está apuntando (todos están compilados en un mismo .mind). Al reconocerlo carga y
 * reproduce su animación sobre el papel. No hay que elegir nada.
 */
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router';
import { IconoCamara, IconoPausa, IconoPlay, IconoRepetir } from '../componentes/Iconos.tsx';
import { HojaInfo, PanelCarga, PanelError } from '../componentes/PanelesRA.tsx';
import { useMantenerPantallaEncendida } from '../componentes/useMantenerPantalla.ts';
import { useTitulo } from '../componentes/useTitulo.ts';
import { TEXTOS } from '../config.ts';
import { catalogo, buscarProyecto } from '../proyectos/catalogo.ts';
import { REPRODUCCION_POR_DEFECTO, type ProyectoCatalogo } from '../proyectos/modelo.ts';
import { rutaProyecto } from '../proyectos/urls.ts';
import { prepararAnimacion, type Animacion, type ResultadoReproduccion } from '../ra/animacion.ts';
import { crearAnimacion } from '../ra/crear-animacion.ts';
import { InfoFlotante } from '../componentes/InfoFlotante.tsx';
import { useInfoFlotante } from '../componentes/useInfoFlotante.ts';
import { contenidoInfo } from '../ra/info-flotante.ts';
import { ErrorRA, type CodigoErrorRA } from '../ra/errores.ts';
import { estadoInicialRA, reducirRA } from '../ra/estado.ts';
import { SesionRA, type ProgresoCarga } from '../ra/sesion.ts';

/** Segundos buscando algún póster antes de ofrecer ayuda. */
const SEGUNDOS_AYUDA = 12;

export default function Escaner() {
  useTitulo();
  const escaner = catalogo.escaner;
  if (!escaner) {
    return (
      <div className="ra ra--vacio">
        <section className="ra-tarjeta">
          <h1>Todavía no hay pósters listos</h1>
          <p>Muy pronto vas a poder apuntar tu cámara a los pósters de la muestra.</p>
          <div className="acciones">
            <Link to="/proyectos" className="boton boton--primario">
              Ver los proyectos
            </Link>
          </div>
        </section>
      </div>
    );
  }
  return <Camara url={escaner.url} slugs={escaner.slugs} />;
}

function Camara({ url, slugs }: { url: string; slugs: string[] }) {
  const escenaRef = useRef<HTMLDivElement>(null);
  const [estado, despachar] = useReducer(reducirRA, estadoInicialRA);
  const estadoRef = useRef(estado);
  useLayoutEffect(() => {
    estadoRef.current = estado;
  });
  /** Póster a la vista y si su animación todavía se está descargando. */
  const [actual, setActual] = useState<ProyectoCatalogo | null>(null);
  const [cargandoAnimacion, setCargandoAnimacion] = useState(false);
  const { receptorRef, barraSupRef, barraInfRef, zonaUtil, alCuadro, hojaAbierta, abrirHoja, cerrarHoja } = useInfoFlotante(escenaRef);
  const animacionesRef = useRef(new Map<number, Animacion>());
  const indiceRef = useRef<number | null>(null);

  const aplicarResultado = useCallback((r: ResultadoReproduccion | null) => {
    if (r === 'reproduciendo') despachar({ tipo: 'reproduccion', valor: 'reproduciendo' });
    else if (r === 'bloqueado') despachar({ tipo: 'reproduccion', valor: 'bloqueado' });
    else if (r === 'error') despachar({ tipo: 'error', codigo: 'video-error' });
  }, []);

  const animacionActual = () => (indiceRef.current === null ? undefined : animacionesRef.current.get(indiceRef.current));

  useEffect(() => {
    const escena = escenaRef.current;
    if (!escena) return;
    let cancelado = false;
    const animaciones = animacionesRef.current;
    const promesas = new Map<number, Promise<Animacion>>();
    const desuscribir: Array<() => void> = [];

    const proyectoDe = (indice: number) => buscarProyecto(slugs[indice]);

    /** Descarga y prepara la animación de un póster la primera vez que aparece. */
    const asegurarAnimacion = (indice: number, proyecto: ProyectoCatalogo) => {
      let promesa = promesas.get(indice);
      if (promesa) return promesa;
      promesa = prepararAnimacion(proyecto, {
        crear: (tipo) => crearAnimacion(proyecto, tipo),
        alRespaldo: (fallido, e) => console.warn(`No se pudo iniciar la animación "${fallido}"; se usa el respaldo.`, e),
      }).then((a) => {
        if (cancelado) {
          a.liberar();
          throw new ErrorRA('cancelado');
        }
        animaciones.set(indice, a);
        desuscribir.push(
          a.alCambiar((evento) => {
            if (indiceRef.current !== indice) return;
            if (evento === 'reproduciendo') despachar({ tipo: 'reproduccion', valor: 'reproduciendo' });
            else if (evento === 'pausado') despachar({ tipo: 'reproduccion', valor: 'pausado' });
            else if (evento === 'terminado') despachar({ tipo: 'reproduccion', valor: 'terminado' });
            else despachar({ tipo: 'error', codigo: 'capa-error' });
          }),
        );
        sesion.entregarAnimacion(indice, a, proyecto.reproduccion);
        return a;
      });
      promesas.set(indice, promesa);
      return promesa;
    };

    const sesion = new SesionRA({
      contenedor: escena,
      targetUrl: url,
      reproduccion: REPRODUCCION_POR_DEFECTO,
      alProgreso: (p: ProgresoCarga) => despachar({ tipo: 'progreso', progreso: p }),
      alDetectar: (indice) => {
        const proyecto = proyectoDe(indice);
        if (!proyecto) return;
        indiceRef.current = indice;
        setActual(proyecto);
        despachar({ tipo: 'detectado' });
        const yaCargada = animaciones.get(indice);
        if (!yaCargada) setCargandoAnimacion(true);
        asegurarAnimacion(indice, proyecto)
          .then((a) => {
            setCargandoAnimacion(false);
            if (indiceRef.current !== indice || estadoRef.current.pausaManual) return;
            const accion = proyecto.reproduccion.reiniciarAlDetectar ? a.reiniciar(true) : a.reproducir();
            accion.then((r) => {
              if (indiceRef.current === indice) aplicarResultado(r);
            });
          })
          .catch((e: unknown) => {
            if (e instanceof ErrorRA && e.codigo === 'cancelado') return;
            setCargandoAnimacion(false);
            console.error(e);
            despachar({ tipo: 'error', codigo: 'video-error' });
          });
      },
      alPerder: (indice) => {
        const proyecto = proyectoDe(indice);
        if (indiceRef.current === indice) indiceRef.current = null;
        despachar({ tipo: 'perdido' });
        if (proyecto?.reproduccion.alPerderSeguimiento !== 'continuar') animaciones.get(indice)?.pausar();
      },
      alCuadro,
      alInterrupcion: (e) => {
        sesion.detener();
        animaciones.forEach((a) => a.pausar());
        despachar({ tipo: 'error', codigo: e.codigo });
      },
    });

    sesion
      .iniciar()
      .then(() => {
        if (sesion.activa) despachar({ tipo: 'listo' });
      })
      .catch((e: unknown) => {
        const codigo: CodigoErrorRA = e instanceof ErrorRA ? e.codigo : 'camara-error';
        if (codigo === 'cancelado') return;
        if (!(e instanceof ErrorRA)) console.error(e);
        despachar({ tipo: 'error', codigo });
      });

    // Al ocultar la pestaña: pausar. Al volver: retomar si hay un póster a la vista.
    const alCambiarVisibilidad = () => {
      if (document.hidden) {
        animacionActual()?.pausar();
      } else if (estadoRef.current.fase === 'detectado' && !estadoRef.current.pausaManual) {
        animacionActual()?.reproducir().then(aplicarResultado);
      }
    };
    const alOcultarPagina = () => {
      sesion.detener();
      animaciones.forEach((a) => a.liberar());
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    window.addEventListener('pagehide', alOcultarPagina);

    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.removeEventListener('pagehide', alOcultarPagina);
      desuscribir.forEach((f) => f());
      sesion.detener();
      animaciones.forEach((a) => a.liberar());
      animaciones.clear();
      indiceRef.current = null;
    };
  }, [url, slugs, estado.intento, aplicarResultado, alCuadro]);

  useMantenerPantallaEncendida(estado.fase !== 'error');

  useEffect(() => {
    if (estado.fase !== 'buscando') return;
    const t = setTimeout(() => despachar({ tipo: 'mostrarAyuda' }), SEGUNDOS_AYUDA * 1000);
    return () => clearTimeout(t);
  }, [estado.fase, estado.intento]);

  const repetir = () => {
    despachar({ tipo: 'pausaManual', valor: false });
    animacionActual()?.reiniciar(true).then(aplicarResultado);
  };
  const alternarPausa = () => {
    const a = animacionActual();
    if (!a) return;
    if (a.pausado) {
      despachar({ tipo: 'pausaManual', valor: false });
      a.reproducir().then(aplicarResultado);
    } else {
      despachar({ tipo: 'pausaManual', valor: true });
      a.pausar();
    }
  };

  const detectado = estado.fase === 'detectado' && actual;
  const info = actual ? contenidoInfo(actual) : null;
  const buscando = estado.fase === 'buscando' || estado.fase === 'perdido';

  return (
    <div className="ra ra--escaner">
      {/* La sesión inserta aquí la cámara y el lienzo WebGL (fuera del control de React). */}
      <div ref={escenaRef} className="ra-escena" />

      {actual && info && (
        <InfoFlotante key={actual.slug} info={info} receptorRef={receptorRef} zonaUtil={zonaUtil} alAbrir={abrirHoja} oculto={hojaAbierta} />
      )}

      <div className={`ra-guia ${buscando ? '' : 'ra-guia--oculta'}`} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="ra-interfaz">
        <header className="ra-barra-sup" ref={barraSupRef}>
          <Link to="/proyectos" className="ra-marca" aria-label={`${TEXTOS.titulo}: ver todos los proyectos`}>
            <img className="ra-marca__logo" src="/logo-utnba-transparente.png" alt="" width="376" height="120" />
            <span>{detectado ? actual.nombre : TEXTOS.titulo}</span>
          </Link>
          <Link to="/proyectos" className="ra-enlace">
            Proyectos
          </Link>
        </header>

        <div className="ra-barra-inf" ref={barraInfRef}>
          {estado.fase !== 'cargando' && estado.fase !== 'error' && (
            <p className={`ra-estado ra-estado--${estado.fase}`} role="status" aria-live="polite">
              <span className="ra-estado__punto" aria-hidden="true" />
              {textoEstado(estado.fase, estado.reproduccion, cargandoAnimacion, actual)}
            </p>
          )}
          {detectado && !cargandoAnimacion && (
            <div className="ra-controles">
              {estado.reproduccion === 'bloqueado' ? (
                <button type="button" className="boton boton--primario" onClick={() => animacionActual()?.reproducir().then(aplicarResultado)}>
                  <IconoPlay /> Reproducir animación
                </button>
              ) : (
                <>
                  <button type="button" className={`boton ${estado.reproduccion === 'terminado' ? 'boton--primario' : ''}`} onClick={repetir}>
                    <IconoRepetir /> Repetir
                  </button>
                  <button type="button" className="boton" onClick={alternarPausa}>
                    {estado.reproduccion === 'reproduciendo' ? (
                      <>
                        <IconoPausa /> Pausar
                      </>
                    ) : (
                      <>
                        <IconoPlay /> Reanudar
                      </>
                    )}
                  </button>
                </>
              )}
              {info ? (
                <button type="button" className="boton boton--fantasma" onClick={abrirHoja}>
                  Más info
                </button>
              ) : (
                <Link to={rutaProyecto(actual.slug)} className="boton boton--fantasma">
                  Más info
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {hojaAbierta && actual && info && <HojaInfo info={info} rutaProyecto={rutaProyecto(actual.slug)} alCerrar={cerrarHoja} />}

      {estado.fase === 'cargando' && <PanelCarga progreso={estado.progreso} />}
      {estado.fase === 'error' && estado.error && (
        <PanelError codigo={estado.error} alReintentar={() => despachar({ tipo: 'reintentar' })} />
      )}

      {estado.ayudaVisible && buscando && (
        <section className="ra-tarjeta ra-tarjeta--ayuda" aria-labelledby="titulo-ayuda">
          <h2 id="titulo-ayuda">¿No reconoce el póster?</h2>
          <ul>
            <li>Alejate un poco para que el póster entre completo.</li>
            <li>Buscá buena luz y evitá reflejos sobre el papel.</li>
            <li>Sostené el celular quieto unos segundos, de frente al póster.</li>
          </ul>
          <div className="acciones">
            <button type="button" className="boton boton--chico" onClick={() => despachar({ tipo: 'ocultarAyuda' })}>
              <IconoCamara /> Seguir intentando
            </button>
            <Link to="/proyectos" className="boton boton--chico">
              Ver los proyectos
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function textoEstado(fase: string, reproduccion: string, cargando: boolean, actual: ProyectoCatalogo | null): string {
  if (fase === 'detectado') {
    if (cargando) return `¡Es ${actual?.nombre}! Preparando la animación…`;
    if (reproduccion === 'bloqueado') return 'Póster detectado. Tocá para reproducir.';
    if (reproduccion === 'terminado') return 'Fin de la animación';
    return `${actual?.nombre ?? 'Póster'} detectado`;
  }
  if (fase === 'perdido') return 'Perdimos el póster. Volvé a apuntarlo.';
  return 'Apuntá la cámara a cualquier póster de la muestra';
}
