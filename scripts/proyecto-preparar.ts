/**
 * Genera los archivos derivados (miniatura.jpg y target.mind) a partir del póster.
 *
 *   npm run proyecto:preparar                    (todos los proyectos que lo necesiten)
 *   npm run proyecto:preparar -- zonar           (sólo uno)
 *   npm run proyecto:preparar -- zonar --forzar  (recompila aunque esté al día)
 *
 * Sólo recompila target.mind si falta o si el póster cambió desde la última
 * compilación (se controla con target.meta.json).
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_POSTERS, negrita, rojo, salirConError } from './lib/cli.ts';
import { ARCHIVO_MANIFIESTO } from './lib/escaner.ts';
import { prepararProyecto } from './lib/preparar.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    forzar: { type: 'boolean', default: false },
    'sin-target': { type: 'boolean', default: false },
  },
});

const slugs = positionals.length
  ? positionals
  : existsSync(DIR_POSTERS)
    ? readdirSync(DIR_POSTERS, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
        .filter((e) => existsSync(join(DIR_POSTERS, e.name, ARCHIVO_MANIFIESTO)))
        .map((e) => e.name)
    : [];

if (slugs.length === 0) salirConError('No hay proyectos para preparar en public/posters.');

console.log(negrita(`\nPreparando ${slugs.length} proyecto(s)…`));
let fallas = 0;
for (const slug of slugs) {
  try {
    await prepararProyecto(DIR_POSTERS, slug, { forzar: values.forzar, sinTarget: values['sin-target'] });
  } catch (e) {
    fallas++;
    console.error(rojo(`  ✖ ${slug}: ${(e as Error).message}`));
  }
}
console.log('');
process.exit(fallas ? 1 : 0);
