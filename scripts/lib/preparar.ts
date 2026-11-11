/** Genera miniatura y target.mind de un proyecto a partir de su póster. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizarManifiesto } from '../../src/proyectos/modelo.ts';
import { amarillo, gris, verde } from './cli.ts';
import { ARCHIVO_MANIFIESTO } from './escaner.ts';
import { compilarTarget, generarMiniatura, LADO_MAXIMO_TARGET } from './mindar.ts';
import { ARCHIVO_META_TARGET, VERSION_MINDAR, sha1, type MetaTarget } from './target-meta.ts';

export interface OpcionesPreparar {
  forzar?: boolean;
  sinTarget?: boolean;
}

export async function prepararProyecto(dirPosters: string, slug: string, opciones: OpcionesPreparar = {}) {
  const dir = join(dirPosters, slug);
  const rutaManifiesto = join(dir, ARCHIVO_MANIFIESTO);
  if (!existsSync(rutaManifiesto)) throw new Error(`No existe ${slug}/${ARCHIVO_MANIFIESTO}.`);

  const resultado = normalizarManifiesto(JSON.parse(readFileSync(rutaManifiesto, 'utf8')));
  if (!resultado.ok) throw new Error(`Manifiesto inválido:\n  ${resultado.errores.join('\n  ')}`);
  const { archivos } = resultado.manifiesto;

  const rutaPoster = join(dir, archivos.poster);
  if (!existsSync(rutaPoster)) {
    console.log(amarillo(`  ⚠ ${slug}: falta el póster (${archivos.poster}); no se puede generar miniatura ni target.`));
    return;
  }
  const posterSha1 = sha1(readFileSync(rutaPoster));

  const rutaMiniatura = join(dir, archivos.miniatura);
  if (opciones.forzar || !existsSync(rutaMiniatura)) {
    writeFileSync(rutaMiniatura, await generarMiniatura(rutaPoster));
    console.log(verde(`  ✔ ${slug}: miniatura generada (${archivos.miniatura})`));
  }

  if (opciones.sinTarget) return;

  const rutaTarget = join(dir, archivos.target);
  const rutaMeta = join(dir, ARCHIVO_META_TARGET);
  let desactualizado = false;
  if (existsSync(rutaTarget) && existsSync(rutaMeta)) {
    try {
      desactualizado = (JSON.parse(readFileSync(rutaMeta, 'utf8')) as MetaTarget).posterSha1 !== posterSha1;
    } catch {
      desactualizado = true;
    }
  }

  if (!opciones.forzar && existsSync(rutaTarget) && !desactualizado) {
    console.log(gris(`  · ${slug}: target.mind al día (usá --forzar para recompilar)`));
    return;
  }

  console.log(`  … ${slug}: compilando imagen objetivo de MindAR (puede tardar 30–90 s)`);
  let ultimo = -1;
  const inicio = Date.now();
  const { mind, ancho, alto } = await compilarTarget(rutaPoster, (p) => {
    const paso = Math.floor(p / 10) * 10;
    if (paso > ultimo) {
      ultimo = paso;
      process.stdout.write(gris(` ${paso}%`));
    }
  });
  process.stdout.write('\n');
  writeFileSync(rutaTarget, mind);
  const meta: MetaTarget = {
    posterSha1,
    posterArchivo: archivos.poster,
    ancho,
    alto,
    compilador: `mind-ar@${VERSION_MINDAR} OfflineCompiler (lado máx. ${LADO_MAXIMO_TARGET}px)`,
    fecha: new Date().toISOString(),
  };
  writeFileSync(rutaMeta, JSON.stringify(meta, null, 2) + '\n');
  const segundos = ((Date.now() - inicio) / 1000).toFixed(0);
  console.log(verde(`  ✔ ${slug}: ${archivos.target} generado (${ancho}×${alto}, ${(mind.byteLength / 1024).toFixed(0)} KB, ${segundos} s)`));
}
