import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  IconoCerrar,
  IconoCheck,
  IconoPausa,
  IconoPlay,
  IconoRepetir,
  IconoVideo,
} from '../componentes/Iconos.tsx';
import { useTitulo } from '../componentes/useTitulo.ts';
import { buscarProyecto, proporcionPoster } from '../proyectos/catalogo.ts';
import { esModoAnimacion, type ModoAnimacion, type ProyectoCatalogo } from '../proyectos/modelo.ts';
import { rutaProyecto } from '../proyectos/urls.ts';
import { ErrorRA, mensajeError, type CodigoErrorRA } from '../ra/errores.ts';
import { prepararAnimacion, type Animacion, type ResultadoReproduccion } from '../ra/animacion.ts';
import { crearAnimacion } from '../ra/crear-animacion.ts';
import { SesionRA, type ProgresoCarga } from '../ra/sesion.ts';
import { estadoInicialRA, reducirRA, porcentajeCarga, type EstadoRA } from '../ra/estado.ts';
import NoEncontrado from './NoEncontrado.tsx';

/** Segundos buscando el póster antes de ofrecer ayuda. */
const SEGUNDOS_AYUDA = 15;

export default function PaginaRA() {
  const { slug } = useParams();
  const proyecto = buscarProyecto(slug);
  if (!proyecto || !proyecto.activo) return <NoEncontrado />;
  if (!proyecto.estado.listoParaRA) {
    return (
      <NoEncontrado
        titulo="La realidad aumentada no está lista"
        detalle="Este proyecto todavía no tiene todos sus recursos. Probá la vista sin RA o volvé más tarde."
      />
    );
  }
  return <ExperienciaRA key={proyecto.slug} proyecto={proyecto} />;
}

function ExperienciaRA({ proyecto }: { proyecto: ProyectoCatalogo }) {
  useTitulo(`${proyecto.nombre} en RA`);
  const navegar = useNavigate();
  const escenaRef = useRef<HTMLDivElement>(null);
  const animacionRef = useRef<Animacion | null>(null);
  const [busqueda] = useSearchParams();
  const depurar = busqueda.has('depurar');
  // ?modo=video|canvas|auto fuerza un formato (para probar desde el celular).
  const modoUrl = busqueda.get('modo');
  const [modoForzado, setModoForzado] = useState<ModoAnimacion | null>(esModoAnimacion(modoUrl) ? modoUrl : null);
  const mostrarModo = depurar || busqueda.has('modo');
  const [estado, despachar] = useReducer(reducirRA, estadoInicialRA);
  // Último estado, para leerlo dentro de callbacks de la sesión sin reiniciarla.
  const estadoRef = useRef(estado);
  useLayoutEffect(() => {
    estadoRef.current = estado;
  });

  const aplicarResultado = useCallback((r: ResultadoReproduccion | null) => {
    if (r === 'reproduciendo') despachar({ tipo: 'reproduccion', valor: 'reproduciendo' });
    else if (r === 'bloqueado') despachar({ tipo: 'reproduccion', valor: 'bloqueado' });
    else if (r === 'error') despachar({ tipo: 'error', codigo: 'video-error' });
  }, []);

  // Ciclo de vida de la sesión: se reinicia completa con cada "Reintentar".
  useEffect(() => {
    const escena = escenaRef.current;
    if (!escena) return;
    const { urls, reproduccion } = proyecto;
    let cancelado = false;
    const desuscribir: Array<() => void> = [];

    // Animación: el formato preferido según el modo y, si no inicializa, el respaldo.
    const promesaAnimacion = prepararAnimacion(proyecto, {
      modoForzado,
      crear: (tipo) => crearAnimacion(proyecto, tipo),
      alRespaldo: (fallido, e) => {
        console.warn(`No se pudo iniciar la animación "${fallido}"; se usa el respaldo.`, e);
        despachar({ tipo: 'respaldo', desde: fallido });
      },
    }).then((a) => {
      if (cancelado) {
        a.liberar();
        throw new ErrorRA('cancelado');
      }
      animacionRef.current = a;
      despachar({ tipo: 'animacion', valor: a.tipo });
      desuscribir.push(
        a.alCambiar((evento) => {
          if (evento === 'reproduciendo') despachar({ tipo: 'reproduccion', valor: 'reproduciendo' });
          else if (evento === 'pausado') despachar({ tipo: 'reproduccion', valor: 'pausado' });
          else if (evento === 'terminado') despachar({ tipo: 'reproduccion', valor: 'terminado' });
          else if (a.tipo === 'canvas' && urls.video) {
            // La capa Canvas falló en pleno uso: reiniciar con el video de respaldo.
            despachar({ tipo: 'respaldo', desde: 'canvas' });
            setModoForzado('video');
            despachar({ tipo: 'reintentar' });
          } else {
            despachar({ tipo: 'error', codigo: 'capa-error' });
          }
        }),
      );
      if (depurar) (window as unknown as { __animacionRA?: Animacion }).__animacionRA = a;
      return a;
    });
    promesaAnimacion.catch(() => {});

    const animacion = () => animacionRef.current;
    const sesion = new SesionRA({
      contenedor: escena,
      targetUrl: urls.target!,
      animacion: promesaAnimacion,
      reproduccion,
      alProgreso: (p: ProgresoCarga) => despachar({ tipo: 'progreso', progreso: p }),
      alDetectar: () => {
        despachar({ tipo: 'detectado' });
        const a = animacion();
        if (!a || estadoRef.current.pausaManual) return;
        if (reproduccion.reiniciarAlDetectar) a.reiniciar(true).then(aplicarResultado);
        else a.reproducir().then(aplicarResultado);
      },
      alPerder: () => {
        despachar({ tipo: 'perdido' });
        if (reproduccion.alPerderSeguimiento === 'pausar') animacion()?.pausar();
      },
      alInterrupcion: (e) => {
        sesion.detener();
        animacion()?.pausar();
        despachar({ tipo: 'error', codigo: e.codigo });
      },
      alAdvertencia: (mensaje) => despachar({ tipo: 'advertencia', mensaje }),
    });

    // Gancho para la prueba E2E (scripts/pruebas): sólo con ?depurar en la URL.
    if (depurar) (window as unknown as { __sesionRA?: SesionRA }).__sesionRA = sesion;

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

    // Al ocultar la pestaña: pausar. Al volver: retomar si el póster está a la vista.
    const alCambiarVisibilidad = () => {
      if (document.hidden) {
        animacion()?.pausar();
      } else if (estadoRef.current.fase === 'detectado' && !estadoRef.current.pausaManual) {
        animacion()?.reproducir().then(aplicarResultado);
      }
    };
    // Al salir de la página (o entrar al bfcache) liberar la cámara explícitamente.
    const alOcultarPagina = () => {
      sesion.detener();
      animacion()?.liberar();
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    window.addEventListener('pagehide', alOcultarPagina);

    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.removeEventListener('pagehide', alOcultarPagina);
      desuscribir.forEach((f) => f());
      sesion.detener();
      promesaAnimacion.then((a) => a.liberar()).catch(() => {});
      animacionRef.current = null;
    };
  }, [proyecto, estado.intento, aplicarResultado, modoForzado, depurar]);

  useMantenerPantallaEncendida(estado.fase !== 'error');

  // Ayuda si pasa un rato sin reconocer el póster.
  useEffect(() => {
    if (estado.fase !== 'buscando' && estado.fase !== 'perdido') return;
    const t = setTimeout(() => despachar({ tipo: 'mostrarAyuda' }), SEGUNDOS_AYUDA * 1000);
    return () => clearTimeout(t);
  }, [estado.fase, estado.intento]);

  const cerrar = () => navegar(rutaProyecto(proyecto.slug), { replace: true });
  const rutaVideo = `${rutaProyecto(proyecto.slug)}/video`;

  const repetir = () => {
    const r = animacionRef.current;
    if (!r) return;
    despachar({ tipo: 'pausaManual', valor: false });
    r.reiniciar(estadoRef.current.fase === 'detectado').then(aplicarResultado);
  };

  const alternarPausa = () => {
    const r = animacionRef.current;
    if (!r) return;
    if (r.pausado) {
      despachar({ tipo: 'pausaManual', valor: false });
      r.reproducir().then(aplicarResultado);
    } else {
      despachar({ tipo: 'pausaManual', valor: true });
      r.pausar();
    }
  };

  const reproducirTrasGesto = () => {
    animacionRef.current?.reproducir().then(aplicarResultado);
  };

  return (
    <div className="ra" style={{ ['--proporcion' as string]: String(proporcionPoster(proyecto)) }}>
      {/* La sesión inserta aquí la cámara y el lienzo WebGL (fuera del control de React). */}
      <div ref={escenaRef} className="ra-escena" />

      <div
        className={`ra-guia ${estado.fase === 'detectado' || estado.fase === 'cargando' || estado.fase === 'error' ? 'ra-guia--oculta' : ''}`}
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="ra-interfaz">
        <header className="ra-barra-sup">
          <button type="button" className="ra-boton-icono" onClick={cerrar} aria-label="Cerrar cámara">
            <IconoCerrar />
          </button>
          <h1>{proyecto.nombre}</h1>
          {mostrarModo && estado.animacion && (
            <span className="etiqueta ra-modo" data-modo={estado.animacion}>
              {estado.animacion === 'canvas' ? 'Capa Canvas' : 'Video MP4'}
              {estado.respaldo && ' (respaldo)'}
            </span>
          )}
        </header>

        <div className="ra-barra-inf">
          {estado.advertencia && import.meta.env.DEV && <p className="ra-advertencia">⚠ {estado.advertencia}</p>}
          <EstadoVisible estado={estado} proyecto={proyecto} />
          {estado.fase !== 'cargando' && estado.fase !== 'error' && (
            <div className="ra-controles">
              {estado.reproduccion === 'bloqueado' && estado.fase === 'detectado' ? (
                <button type="button" className="boton boton--primario" onClick={reproducirTrasGesto}>
                  <IconoPlay /> Reproducir animación
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`boton ${estado.reproduccion === 'terminado' ? 'boton--primario' : ''}`}
                    onClick={repetir}
                    disabled={!estado.yaDetectado}
                  >
                    <IconoRepetir /> Repetir
                  </button>
                  <button type="button" className="boton" onClick={alternarPausa} disabled={!estado.yaDetectado}>
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
            </div>
          )}
        </div>
      </div>

      {estado.fase === 'cargando' && <PanelCarga progreso={estado.progreso} />}

      {estado.fase === 'error' && estado.error && (
        <PanelError
          codigo={estado.error}
          alReintentar={() => despachar({ tipo: 'reintentar' })}
          rutaVideo={rutaVideo}
          rutaProyecto={rutaProyecto(proyecto.slug)}
        />
      )}

      {estado.ayudaVisible && (estado.fase === 'buscando' || estado.fase === 'perdido') && (
        <section className="ra-tarjeta ra-tarjeta--ayuda" aria-labelledby="titulo-ayuda">
          <h2 id="titulo-ayuda">¿No reconoce el póster?</h2>
          <ul>
            <li>Alejate un poco para que el póster entre completo.</li>
            <li>Buscá buena luz y evitá reflejos sobre el papel.</li>
            <li>Sostené el celular quieto unos segundos, de frente al póster.</li>
          </ul>
          <div className="acciones">
            <button type="button" className="boton boton--chico" onClick={() => despachar({ tipo: 'ocultarAyuda' })}>
              Seguir intentando
            </button>
            <Link to={rutaVideo} className="boton boton--chico" replace>
              <IconoVideo /> Ver sin RA
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function EstadoVisible({ estado, proyecto }: { estado: EstadoRA; proyecto: ProyectoCatalogo }) {
  let texto: string;
  switch (estado.fase) {
    case 'cargando':
      texto = `Preparando la experiencia… ${porcentajeCarga(estado.progreso)}%`;
      break;
    case 'buscando':
      texto = `Apuntá la cámara al póster de ${proyecto.nombre}`;
      break;
    case 'detectado':
      texto =
        estado.reproduccion === 'bloqueado'
          ? 'Póster detectado. Tocá para reproducir.'
          : estado.reproduccion === 'terminado'
            ? 'Fin de la animación'
            : '¡Póster detectado!';
      break;
    case 'perdido':
      texto = 'Perdimos el póster. Volvé a apuntarlo.';
      break;
    case 'error':
      texto = 'No se pudo iniciar la cámara';
      break;
  }
  return (
    <p className={`ra-estado ra-estado--${estado.fase}`} role="status" aria-live="polite">
      <span className="ra-estado__punto" aria-hidden="true" />
      {texto}
    </p>
  );
}

function PanelCarga({ progreso }: { progreso: ProgresoCarga }) {
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

function PanelError({
  codigo,
  alReintentar,
  rutaVideo,
  rutaProyecto: volver,
}: {
  codigo: CodigoErrorRA;
  alReintentar: () => void;
  rutaVideo: string;
  rutaProyecto: string;
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
          <Link
            to={rutaVideo}
            replace
            className={`boton ${mensaje.reintentable ? '' : 'boton--primario'}`}
            ref={mensaje.reintentable ? undefined : (botonRef as React.RefObject<HTMLAnchorElement>)}
          >
            <IconoVideo /> Ver animación sin RA
          </Link>
          <Link to={volver} replace className="boton boton--fantasma">
            Volver al proyecto
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Evita que la pantalla se apague mientras se apunta al póster (si el navegador lo permite). */
function useMantenerPantallaEncendida(activo: boolean) {
  useEffect(() => {
    if (!activo || !('wakeLock' in navigator)) return;
    let bloqueo: WakeLockSentinel | null = null;
    let cancelado = false;
    const pedir = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((b) => {
          if (cancelado) b.release().catch(() => {});
          else bloqueo = b;
        })
        .catch(() => {});
    };
    pedir();
    document.addEventListener('visibilitychange', pedir);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', pedir);
      bloqueo?.release().catch(() => {});
    };
  }, [activo]);
}
