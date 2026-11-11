/**
 * Plugin de Vite que expone el catálogo como módulo virtual:
 *
 *   import catalogo from 'virtual:proyectos';
 *
 * El catálogo se recalcula en cada build y, en desarrollo, cada vez que
 * cambia algo dentro de public/posters (recarga completa del navegador).
 */
import { normalize, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';
import { escanearProyectos } from './escaner.ts';
import { combinarTargets, type TargetCombinado } from './target-combinado.ts';

const ID_VIRTUAL = 'virtual:proyectos';
const ID_RESUELTO = '\0' + ID_VIRTUAL;
/** Ruta pública del .mind con todos los pósters. */
const RUTA_ESCANER = 'escaner/targets.mind';

export function proyectosPlugin(): Plugin {
  let dirPosters = '';
  let base = '/';

  /** Pósters listos para RA, en el orden del catálogo, fusionados en un solo .mind. */
  const calcular = () => {
    const catalogo = escanearProyectos({ dirPosters });
    const aptos = catalogo.proyectos.filter((p) => p.activo && p.estado.listoParaRA && p.urls.target);
    const combinado: TargetCombinado | null = combinarTargets(
      dirPosters,
      aptos.map((p) => ({ slug: p.slug, archivo: decodeURIComponent(new URL(p.urls.target!, 'http://x').pathname.split('/').pop()!) })),
    );
    if (combinado) {
      catalogo.escaner = { url: `${base}${RUTA_ESCANER}?v=${combinado.hash}`, slugs: combinado.slugs };
    }
    return { catalogo, combinado };
  };

  return {
    name: 'proyectos-catalogo',
    configResolved(config) {
      dirPosters = normalize(resolve(config.publicDir || resolve(config.root, 'public'), 'posters'));
      base = config.base.endsWith('/') ? config.base : config.base + '/';
    },
    resolveId(id) {
      return id === ID_VIRTUAL ? ID_RESUELTO : undefined;
    },
    load(id) {
      if (id !== ID_RESUELTO) return;
      return `export default ${JSON.stringify(calcular().catalogo)};`;
    },
    generateBundle() {
      const { combinado } = calcular();
      if (combinado) this.emitFile({ type: 'asset', fileName: RUTA_ESCANER, source: combinado.buffer });
    },
    configureServer(server) {
      server.watcher.add(dirPosters);
      server.middlewares.use(`${base}${RUTA_ESCANER}`.replace(/\/+/g, '/'), (_req, res) => {
        const { combinado } = calcular();
        if (!combinado) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(combinado.buffer);
      });
      const alCambiar = (archivo: string) => {
        const ruta = normalize(archivo);
        if (ruta !== dirPosters && !ruta.startsWith(dirPosters + sep)) return;
        const grafo = server.environments.client.moduleGraph;
        const modulo = grafo.getModuleById(ID_RESUELTO);
        if (modulo) grafo.invalidateModule(modulo);
        server.ws.send({ type: 'full-reload' });
      };
      for (const evento of ['add', 'change', 'unlink', 'addDir', 'unlinkDir'] as const) {
        server.watcher.on(evento, alCambiar);
      }
    },
  };
}
