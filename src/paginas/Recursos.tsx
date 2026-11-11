import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Aviso } from '../componentes/Aviso.tsx';
import {
  IconoAlerta,
  IconoCheck,
  IconoCopiar,
  IconoDescargar,
  IconoImprimir,
  IconoOjo,
} from '../componentes/Iconos.tsx';
import { useTitulo } from '../componentes/useTitulo.ts';
import { SITIO_URL_CONFIGURADA, urlBaseSitio } from '../config.ts';
import { catalogo } from '../proyectos/catalogo.ts';
import type { ProyectoCatalogo, RecursoClave, TipoAnimacion } from '../proyectos/modelo.ts';
import { normalizarUrlBase, problemasUrlBase, rutaProyecto, urlProyecto } from '../proyectos/urls.ts';
import { generarQrPngDataUrl, generarQrSvg, nombreArchivoQr } from '../qr/qr.ts';

const ETIQUETAS: Record<RecursoClave, string> = {
  poster: 'Póster',
  video: 'Video MP4',
  target: 'Target .mind',
  miniatura: 'Miniatura',
  capa: 'Capa Canvas',
};

const NOMBRE_TIPO: Record<TipoAnimacion, string> = { canvas: 'Capa Canvas', video: 'Video MP4' };

function svgADataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function descargar(href: string, nombre: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Pantalla E: QR y verificación de recursos de cada proyecto (sin autenticación, ruta conocida). */
export default function Recursos() {
  useTitulo('Recursos para impresión');
  const [textoBase, setTextoBase] = useState(() => urlBaseSitio());
  const base = normalizarUrlBase(textoBase);
  const problemasBase = base ? problemasUrlBase(base) : ['Ingresá una URL válida, por ejemplo https://dominio.'];
  const { proyectos, problemas } = catalogo;

  return (
    <section className="recursos contenedor">
      <div className="no-imprimir">
        <h1>Recursos para impresión</h1>
        <p className="recursos__intro">
          El <strong>QR general</strong> abre la cámara directamente y reconoce cualquier póster de la muestra: es el que
          conviene imprimir en la entrada y en cada póster. Debajo, el QR de la página de cada proyecto, su URL y el
          estado de sus archivos. Para agregar proyectos, ver el README del repositorio.
        </p>

        <div className="recursos__config">
          <label htmlFor="url-base">URL pública del sitio (la que se codifica en los QR)</label>
          <div className="campo-fila">
            <input
              id="url-base"
              className="campo"
              type="url"
              inputMode="url"
              value={textoBase}
              onChange={(e) => setTextoBase(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <button type="button" className="boton" onClick={() => window.print()} disabled={!base}>
              <IconoImprimir /> Imprimir hoja de QR
            </button>
          </div>
          {SITIO_URL_CONFIGURADA ? (
            <small>Configurada en el build (VITE_SITIO_URL): {SITIO_URL_CONFIGURADA}</small>
          ) : (
            <small>
              VITE_SITIO_URL no está configurada: se usa la dirección desde la que abriste esta página. Configurala
              antes de imprimir definitivamente.
            </small>
          )}
          {problemasBase.map((p) => (
            <Aviso key={p} tipo="alerta">
              {p}
            </Aviso>
          ))}
        </div>

        {problemas.length > 0 && (
          <Aviso tipo="error" className="recursos__problemas">
            <strong>Carpetas con errores (no se publican):</strong>
            <ul>
              {problemas.map((p) => (
                <li key={p.carpeta}>
                  <code>public/posters/{p.carpeta}</code>: {p.errores.join(' ')}
                </li>
              ))}
            </ul>
          </Aviso>
        )}

        {base && (
          <ul className="grilla-qr">
            <li>
              <FichaGeneral base={base} />
            </li>
          </ul>
        )}

        {proyectos.length === 0 ? (
          <div className="vacio">
            <h3>No hay proyectos cargados</h3>
            <p>
              Agregá uno con <code>npm run proyecto:nuevo</code> (ver README).
            </p>
          </div>
        ) : (
          <ul className="grilla-qr">
            {proyectos.map((p) => (
              <li key={p.slug}>
                <FichaProyecto proyecto={p} base={base} />
              </li>
            ))}
          </ul>
        )}

        <p style={{ marginTop: '2rem' }}>
          <Link to="/recursos/compilar">Compilar un target .mind desde el navegador</Link> (alternativa al script{' '}
          <code>npm run proyecto:preparar</code>).
        </p>
      </div>

      {base && <HojaImpresion proyectos={proyectos.filter((p) => p.activo)} base={base} />}
    </section>
  );
}

function useQrSvg(url: string | null) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    if (url) generarQrSvg(url).then((s) => vigente && setSvg(s));
    return () => {
      vigente = false;
    };
  }, [url]);
  return url ? svg : null;
}

/** QR de la portada del sitio: abre la cámara y reconoce cualquier póster. */
function FichaGeneral({ base }: { base: string }) {
  const url = base.replace(/\/+$/, '') + '/';
  const svg = useQrSvg(url);
  const descargarSvg = () => {
    if (!svg) return;
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    descargar(blobUrl, 'qr-general.svg');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };
  return (
    <article className="ficha-qr" aria-labelledby="ficha-general">
      <div className="ficha-qr__cabecera">
        <div>
          <h2 id="ficha-general">QR general de la muestra</h2>
          <code>/</code>
        </div>
        <span className="etiqueta etiqueta--ok">Recomendado</span>
      </div>
      <div className="ficha-qr__codigo">
        {svg ? <img src={svgADataUrl(svg)} alt={`Código QR que abre ${url}`} /> : <div className="sin-imagen">Sin QR</div>}
      </div>
      <p className="ficha-qr__url">
        <span>{url}</span>
      </p>
      <p className="ficha-qr__modo">Abre la cámara en el acto y reconoce solo cuál póster se apunta.</p>
      <div className="ficha-qr__acciones">
        <button
          type="button"
          className="boton boton--chico"
          onClick={async () => descargar(await generarQrPngDataUrl(url, 2048), 'qr-general.png')}
        >
          <IconoDescargar /> PNG
        </button>
        <button type="button" className="boton boton--chico" onClick={descargarSvg} disabled={!svg}>
          <IconoDescargar /> SVG
        </button>
        <Link to="/" className="boton boton--chico boton--fantasma">
          Abrir cámara
        </Link>
      </div>
    </article>
  );
}

function FichaProyecto({ proyecto: p, base }: { proyecto: ProyectoCatalogo; base: string | null }) {
  const url = base ? urlProyecto(base, p.slug) : null;
  const svg = useQrSvg(url);
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      window.prompt('Copiá la URL:', url);
    }
  };

  const descargarSvg = () => {
    if (!svg) return;
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    descargar(blobUrl, nombreArchivoQr(p.slug, 'svg'));
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const descargarPng = async () => {
    if (!url) return;
    descargar(await generarQrPngDataUrl(url, 2048), nombreArchivoQr(p.slug, 'png'));
  };

  return (
    <article className="ficha-qr" aria-labelledby={`ficha-${p.slug}`}>
      <div className="ficha-qr__cabecera">
        <div>
          <h2 id={`ficha-${p.slug}`}>{p.nombre}</h2>
          <code>{p.slug}</code>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {p.estado.listoParaRA ? (
            <span className="etiqueta etiqueta--ok">Listo</span>
          ) : (
            <span className="etiqueta etiqueta--error">Incompleto</span>
          )}
          {!p.activo && <span className="etiqueta">Inactivo</span>}
          {p.demo && <span className="etiqueta etiqueta--demo">Demo</span>}
        </div>
      </div>

      <div className="ficha-qr__codigo">
        {svg ? <img src={svgADataUrl(svg)} alt={`Código QR que abre ${url}`} /> : <div className="sin-imagen">Sin QR</div>}
      </div>

      {url && (
        <p className="ficha-qr__url">
          <span>{url}</span>
          <button type="button" className="boton boton--chico boton--fantasma" onClick={copiar} aria-label="Copiar URL">
            {copiado ? <IconoCheck /> : <IconoCopiar />}
          </button>
        </p>
      )}

      <ul className="lista-recursos" aria-label="Recursos">
        {(Object.keys(ETIQUETAS) as RecursoClave[]).map((clave) => {
          const tiene = Boolean(p.urls[clave]);
          // Video y capa son alternativos: falta sólo si no hay ninguno de los dos.
          const opcional =
            clave === 'miniatura' ||
            (clave === 'video' && Boolean(p.urls.capa)) ||
            (clave === 'capa' && Boolean(p.urls.video)) ||
            (clave === 'capa' && !p.urls.video && !p.estado.faltantes.includes('animacion'));
          const medidas = clave === 'miniatura' ? undefined : p.medidas[clave];
          return (
            <li key={clave} className={tiene ? 'ok' : opcional ? 'opcional' : 'falta'}>
              {tiene ? <IconoCheck /> : <IconoAlerta />}
              <span>
                {ETIQUETAS[clave]}
                {medidas && ` · ${medidas.ancho}×${medidas.alto}`}
                {!tiene && (opcional ? ' (opcional)' : ' — falta')}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="ficha-qr__modo">
        Animación en RA ({p.animacion.modo}):{' '}
        {p.estado.animaciones.length === 0
          ? 'ninguna disponible'
          : p.estado.animaciones.map((t, i) => (i === 0 ? NOMBRE_TIPO[t] : ` → respaldo ${NOMBRE_TIPO[t]}`)).join('')}
      </p>

      {p.estado.advertencias.length > 0 && (
        <ul className="advertencias">
          {p.estado.advertencias.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      <div className="ficha-qr__acciones">
        <button type="button" className="boton boton--chico" onClick={descargarPng} disabled={!url}>
          <IconoDescargar /> PNG
        </button>
        <button type="button" className="boton boton--chico" onClick={descargarSvg} disabled={!svg}>
          <IconoDescargar /> SVG
        </button>
        <Link to={`/recursos/vista-previa/${p.slug}`} className="boton boton--chico">
          <IconoOjo /> Vista previa
        </Link>
        <Link to={rutaProyecto(p.slug)} className="boton boton--chico boton--fantasma">
          Abrir página
        </Link>
      </div>
      {p.estado.listoParaRA && p.estado.animaciones.length > 1 && (
        <p className="ficha-qr__pruebas">
          Probar RA forzando:{' '}
          {p.estado.animaciones.map((t, i) => (
            <span key={t}>
              {i > 0 && ' · '}
              <Link to={`${rutaProyecto(p.slug)}/ra?modo=${t}`}>{NOMBRE_TIPO[t]}</Link>
            </span>
          ))}
        </p>
      )}
    </article>
  );
}

/** Versión para imprimir: sólo QR, nombre y URL (se activa con window.print()). */
function HojaImpresion({ proyectos, base }: { proyectos: ProyectoCatalogo[]; base: string }) {
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  const urls = useMemo(() => proyectos.map((p) => [p.slug, urlProyecto(base, p.slug)] as const), [proyectos, base]);

  useEffect(() => {
    let vigente = true;
    Promise.all(urls.map(async ([slug, url]) => [slug, await generarQrSvg(url)] as const)).then((pares) => {
      if (vigente) setSvgs(Object.fromEntries(pares));
    });
    return () => {
      vigente = false;
    };
  }, [urls]);

  return (
    <div className="hoja-impresion" aria-hidden="true">
      {proyectos.map((p) => (
        <div className="hoja-impresion__ficha" key={p.slug}>
          <h2>{p.nombre}</h2>
          <p className="llamado">Escaneá y apuntá tu celular al póster</p>
          {svgs[p.slug] && <img src={svgADataUrl(svgs[p.slug])} alt="" />}
          <p>{urlProyecto(base, p.slug)}</p>
        </div>
      ))}
    </div>
  );
}
