/**
 * Revisa todos los proyectos de public/posters y muestra qué les falta.
 *
 *   npm run proyectos:validar               (informa; nunca falla)
 *   npm run proyectos:validar -- --estricto (sale con error si hay problemas
 *                                            o proyectos activos incompletos)
 *
 * Se ejecuta automáticamente antes de cada build.
 */
import { parseArgs } from 'node:util';
import { DIR_POSTERS, amarillo, gris, negrita, rojo, verde } from './lib/cli.ts';
import { escanearProyectos } from './lib/escaner.ts';

const { values } = parseArgs({ options: { estricto: { type: 'boolean', default: false } } });

const { proyectos, problemas } = escanearProyectos({ dirPosters: DIR_POSTERS });

console.log(negrita(`\nProyectos en public/posters: ${proyectos.length}`));
if (proyectos.length === 0 && problemas.length === 0) {
  console.log(gris('  (todavía no hay proyectos; ver "npm run proyecto:nuevo")'));
}

let incompletosActivos = 0;
for (const p of proyectos) {
  const { listoParaRA, faltantes, advertencias } = p.estado;
  const icono = listoParaRA ? verde('✔') : rojo('✖');
  const etiquetas = [p.activo ? '' : gris('[inactivo]'), p.demo ? amarillo('[demo]') : ''].filter(Boolean).join(' ');
  console.log(`  ${icono} ${negrita(p.slug)} — ${p.nombre} ${etiquetas}`);
  if (faltantes.length) {
    console.log(rojo(`      Falta: ${faltantes.join(', ')}`));
    if (p.activo) incompletosActivos++;
  }
  for (const a of advertencias) console.log(amarillo(`      ⚠ ${a}`));
}

for (const prob of problemas) {
  console.log(`  ${rojo('✖')} ${negrita(prob.carpeta)} ${gris('(no se publica)')}`);
  for (const e of prob.errores) console.log(rojo(`      ${e}`));
}
console.log('');

if (values.estricto && (problemas.length > 0 || incompletosActivos > 0)) {
  console.error(rojo('Validación estricta fallida.'));
  process.exit(1);
}
