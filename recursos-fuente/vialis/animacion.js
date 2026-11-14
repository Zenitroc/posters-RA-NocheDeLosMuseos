/*
 * Vialis · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * El colectivo "hace señas de luces": las luces bajas quedan encendidas y, cada tanto, los faros altos
 * destellan dos veces con resplandor, rayos y destello horizontal de lente, y su reflejo se estira sobre el
 * asfalto mojado. Los marcadores ámbar del techo titilan, una luz recorre la flecha del cartel, la red de
 * nodos de la derecha late y los cuatro íconos de abajo se encienden en secuencia.
 * El lienzo se extiende un 30 % por lado (MARGEN): el destello de los faros sigue sobre la pared.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10, MARGEN = 0.3;
const BLANCO = [255, 255, 255], CALIDO = [255, 244, 222], AZUL = [140, 190, 255], AMBAR = [255, 170, 60], CIAN = [110, 210, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

const ALTAS = [[59, 659, 7], [321, 657, 7.5]];                     // faros grandes (x, y, radio)
const BAJAS = [[75.6, 668.4, 4], [293, 669.6, 4], [307.6, 668, 3]]; // luces bajas / diurnas
const GIROS = [[49, 647], [339.6, 646]];                            // ámbar del frente
const TECHO = [[91.6, 320.5], [202, 307], [336.7, 324]];            // marcadores del techo
const FLECHA = [[152.7, 389.4], [188, 359.6], [205, 371.4], [235, 342.4], [250.6, 351.8], [275.6, 326.7]];
const NODOS = [[922, 597], [714, 707], [853, 679]];
const ICONOS = [[158, 870], [400, 870], [615, 870], [834, 870]];
const PISO = 795; // donde termina el asfalto (empieza el bloque blanco de los íconos)

/** Intensidad de los faros altos: pares de destellos rápidos ("señas de luces"). */
const SENAS = [1.4, 4.7, 7.7];
function altas(t) {
  let v = 0;
  for (const t0 of SENAS) for (const d of [0, 0.42]) {
    const s = t - t0 - d;
    v = Math.max(v, smooth(0, 0.05, s) * (1 - smooth(0.2, 0.32, s)));
  }
  return v;
}

/** Destello completo de un faro: resplandor, rayos largos, línea horizontal de lente y núcleo encandilante. */
function faro(ctx, x, y, r, k, t) {
  if (k <= 0.01) return;
  // Resplandor (acotado: no lava todo el frente)
  let gr = ctx.createRadialGradient(x, y, 0, x, y, r * 9);
  gr.addColorStop(0, rgba(BLANCO, 0.95 * k)); gr.addColorStop(0.25, rgba(CALIDO, 0.55 * k)); gr.addColorStop(1, rgba(CALIDO, 0));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 9, 0, TAU); ctx.fill();
  // Destello horizontal de lente (anamórfico), fino y azulado
  for (const [largo, alto, a] of [[r * 60, 1.6, 0.55], [r * 26, 3.2, 0.85]]) {
    gr = ctx.createLinearGradient(x - largo, 0, x + largo, 0);
    gr.addColorStop(0, rgba(AZUL, 0)); gr.addColorStop(0.5, rgba(BLANCO, a * k)); gr.addColorStop(1, rgba(AZUL, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, largo, alto, 0, 0, TAU); ctx.fill();
  }
  // Rayos (estrella de 8 puntas) que giran apenas
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.2 + 0.06 * Math.sin(t * 3));
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    const l = r * (i % 2 ? 6 : 12) * (0.85 + 0.15 * k);
    gr = ctx.createLinearGradient(0, 0, l, 0);
    gr.addColorStop(0, rgba(BLANCO, 0.95 * k)); gr.addColorStop(1, rgba(BLANCO, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -1.4); ctx.lineTo(l, 0); ctx.lineTo(0, 1.4); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // Halo de color y núcleo blanco
  ring(ctx, x, y, r * 4.2, 1.2, AZUL, 0.25 * k);
  ctx.fillStyle = rgba(BLANCO, k); ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, TAU); ctx.fill();
}

/** Reflejo del faro sobre el asfalto mojado: columna de luz alargada y suave que ondula. */
function reflejoPiso(ctx, x, y0, ancho, k, t) {
  if (k <= 0.01) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 100, y0, 200, PISO - y0); ctx.clip();
  const largo = PISO - y0 + 20;
  for (let i = 0; i < 3; i++) {
    const cx = x + 1.5 * Math.sin(t * 6 + i * 2), cy = y0 + largo * (0.35 + i * 0.12);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, largo / ancho * (0.55 - i * 0.12));
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, ancho);
    gr.addColorStop(0, rgba(CALIDO, (0.4 - i * 0.1) * k)); gr.addColorStop(1, rgba(CALIDO, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, ancho, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }
  const k = altas(t) * g;

  // ---- Luces bajas siempre encendidas (titilan apenas) y su reflejo tenue
  BAJAS.forEach(([x, y, r], i) => {
    const v = g * (0.8 + 0.08 * Math.sin(t * 9 + i * 2));
    glowDot(ctx, x, y, r * 4.5, CALIDO, 0.65 * v);
    ctx.fillStyle = rgba(BLANCO, 0.9 * v); ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, TAU); ctx.fill();
  });
  ALTAS.forEach(([x, y, r]) => glowDot(ctx, x, y, r * 3.2, CALIDO, 0.45 * g));
  reflejoPiso(ctx, 59, 722, 12, 0.5 * g, t);
  reflejoPiso(ctx, 315, 722, 14, 0.5 * g, t);

  // ---- Señas de luces: los faros altos destellan
  if (k > 0.01) {
    reflejoPiso(ctx, 59, 722, 26, k, t);
    reflejoPiso(ctx, 321, 722, 30, k, t);
    ALTAS.forEach(([x, y, r]) => faro(ctx, x, y, r, k, t));
  }

  // ---- Ámbar: giros del frente y marcadores del techo titilan
  const amb = Math.pow(Math.max(0, Math.sin(t * TAU / 1.6)), 4);
  GIROS.forEach(([x, y]) => glowDot(ctx, x, y, 13, AMBAR, g * (0.25 + 0.55 * amb)));
  TECHO.forEach(([x, y], i) => glowDot(ctx, x, y, 11, AMBAR, g * (0.3 + 0.5 * Math.pow(Math.max(0, Math.sin(t * TAU / 1.6 - i * 0.6)), 4))));

  // ---- Cartel: una luz recorre la flecha de tendencia
  const flecha = polyline(FLECHA);
  emitters(t, 0.9, 8.6, 2.4, 1.4, p => signal(ctx, flecha, p, CIAN, 0.95 * g, 60, 11));
  glowDot(ctx, FLECHA[5][0], FLECHA[5][1], 26, CIAN, 0.5 * g * Math.pow(Math.max(0, Math.sin((t - 0.9) * TAU / 2.4 - 1.2)), 6));

  // ---- Red de nodos de la derecha
  NODOS.forEach(([x, y], i) => {
    emitters(t, 1 + i * 0.7, 8.6, 2.2, 1.4, p => sonar(ctx, x, y, p, 10, 44, 2.2, CIAN, 0.8 * g));
  });

  // ---- Íconos de abajo, en secuencia
  ICONOS.forEach(([x, y], i) => {
    emitters(t, 2.2 + i * 0.6, 8.6, 3.2, 1.3, p => sonar(ctx, x, y, p, 60, 88, 3, [40, 90, 220], 0.75 * g));
  });

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
