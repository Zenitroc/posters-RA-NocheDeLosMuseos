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

const ID_VIRTUAL = 'virtual:proyectos';
const ID_RESUELTO = '\0' + ID_VIRTUAL;

export function proyectosPlugin(): Plugin {
  let dirPosters = '';

  return {
    name: 'proyectos-catalogo',
    configResolved(config) {
      dirPosters = normalize(resolve(config.publicDir || resolve(config.root, 'public'), 'posters'));
    },
    resolveId(id) {
      return id === ID_VIRTUAL ? ID_RESUELTO : undefined;
    },
    load(id) {
      if (id !== ID_RESUELTO) return;
      const catalogo = escanearProyectos({ dirPosters });
      return `export default ${JSON.stringify(catalogo)};`;
    },
    configureServer(server) {
      server.watcher.add(dirPosters);
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
