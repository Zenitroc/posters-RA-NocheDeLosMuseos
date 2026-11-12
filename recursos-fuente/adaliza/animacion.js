/*
 * Adaliza · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * El logo cobra vida: flota, mira para un lado y para el otro, parpadea y te guiña el ojo (con destello).
 * El robot flota, parpadea, también guiña, mueve el dedo de "¡tengo una idea!", le late el núcleo del
 * pecho y se le encienden las antenas; el check del portapapeles se vuelve a trazar.
 * Alrededor: las tarjetas se encienden en secuencia, los conectores llevan señales, el chat "escribe",
 * las barras laten, las estrellas que faltaban se completan, los checks se tildan y flotan partículas.
 * Logo y robot son recortes con su silueta sobre una "placa limpia" (póster con la figura borrada); los
 * ojos son recortes aparte sobre el visor limpio, así se pueden cerrar.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const BLUE = [60, 100, 255], CYAN = [70, 215, 255], VIOLET = [140, 100, 255], TEAL = [30, 190, 170], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

// Logo y robot: ojos [cx, cy, r] y pivotes
const LOGO_OJOS = [[213, 203, 15.8, 'logoOjoI'], [281, 203, 15.8, 'logoOjoD']];
const ROBOT_OJOS = [[474.6, 740.7, 23, 'robotOjoI'], [546, 742, 23, 'robotOjoD']];

// Tarjetas [x, y, w, h, r, color, t0]
const TARJETAS = [
  [111, 416, 214, 83, 14, BLUE, 1.2], [671, 416, 227, 92, 14, BLUE, 2.4],
  [360, 1022, 227, 98, 14, TEAL, 3.6], [684, 1076, 214, 72, 14, VIOLET, 4.8],
];
const CONECTORES = [
  { path: polyline([[198, 508], [200, 522], [210, 532], [235, 540], [250, 550], [253, 565], [254, 574]]), c: BLUE, t0: 1.6 },
  { path: polyline([[792, 519], [790, 530], [783, 537], [770, 541], [762, 550], [759, 564]]), c: BLUE, t0: 2.8 },
  { path: polyline([[833, 638], [862, 638], [878, 655], [880, 672], [870, 690], [860, 705], [856, 723]]), c: VIOLET, t0: 4.0 },
  { path: polyline([[422, 1022], [425, 1012], [435, 1004], [452, 998]]), c: TEAL, t0: 3.9 },
];
const BARRAS = [[694, 712, 641, TEAL], [720, 737, 624, BLUE], [745, 761, 619, BLUE], [791, 807, 598, WHITE]];
const CHECKS = [[690, 752.2], [690, 782.7], [690, 813]];
const ESTRELLAS = [[200.4, 736.6], [222.5, 736.6]];

/** Párpado: 1 = abierto, 0 = cerrado. Parpadeos rápidos en los instantes `ts`. */
function parpadeo(t, ts) {
  let v = 1;
  for (const t0 of ts) v = Math.min(v, 1 - env(t, t0, t0 + 0.08, t0 + 0.12, t0 + 0.22));
  return v;
}

/** Ojo: recorte del ojo aplastado verticalmente; cerrado del todo, una curva "^" feliz. */
function ojo(ctx, [cx, cy, r, nombre], abierto, mx, my, color, grosor, curva = 1) {
  const sy = Math.max(0.06, abierto);
  if (abierto > 0.12) spriteT(ctx, nombre, { dx: mx, dy: my, sx: 1, sy, px: cx, py: cy });
  else {
    ctx.beginPath(); ctx.arc(cx + mx, cy + r * 0.55 * curva, r * 0.85 * curva, Math.PI * (1.5 - 0.32 / curva), Math.PI * (1.5 + 0.32 / curva));
    ctx.lineWidth = grosor; ctx.lineCap = 'round'; ctx.strokeStyle = rgba(color, 1);
    ctx.shadowColor = rgba(color, 0.9); ctx.shadowBlur = grosor * 2; ctx.stroke(); ctx.shadowBlur = 0;
  }
}

function estrella(ctx, x, y, r, color, a, sc = 1) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    i ? ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr) : ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
  ctx.closePath(); ctx.fillStyle = rgba(color, a); ctx.shadowColor = rgba(color, a); ctx.shadowBlur = 8; ctx.fill(); ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // ---- Placas limpias primero
  sprite(ctx, 'fondoLogo'); sprite(ctx, 'fondoRobot');

  // ---- Partículas de luz que suben por el fondo
  for (let i = 0; i < 14; i++) {
    const q = (t * (0.05 + rnd(i, 1) * 0.05) + rnd(i, 2)) % 1;
    const x = 40 + rnd(i, 3) * 910 + 18 * Math.sin(t * 0.8 + i), y = 1000 - q * 560;
    glowDot(ctx, x, y, 6 + rnd(i, 4) * 8, i % 3 ? WHITE : CYAN, 0.55 * g * Math.sin(Math.PI * q));
  }

  // ---- Título: destellos que lo barren
  sheen(ctx, 390, 138, 486, 120, 10, (t - 1.0) / 1.6, 0.3 * g);
  sheen(ctx, 390, 138, 486, 120, 10, (t - 5.4) / 1.4, 0.35 * g);
  sheen(ctx, 380, 284, 498, 24, 4, (t - 2.2) / 1.6, 0.35 * g);
  sheen(ctx, 154, 338, 726, 38, 6, (t - 3.2) / 1.8, 0.3 * g);

  // ---- Logo: flota, mira, parpadea y guiña
  const guinoL = env(t, 4.7, 4.85, 5.75, 5.95);           // 1 = ojo derecho cerrado
  const flotaL = -2.6 * Math.sin(t * 2.0) * g;
  const ladeoL = (0.028 * Math.sin(t * 1.3) + 0.085 * guinoL) * g;
  const mirarL = (-4 * env(t, 1.9, 2.2, 2.6, 2.9) + 4 * env(t, 3.0, 3.3, 3.8, 4.1)) * g;
  const parpL = parpadeo(t, [1.4, 7.6]);
  ctx.save();
  pivotar(ctx, 247, 290, 0, flotaL, ladeoL, 1 + 0.03 * guinoL * g);
  ctx.drawImage(SPR.logo.cv, SPR.logo.x, SPR.logo.y, SPR.logo.w, SPR.logo.h);
  ojo(ctx, LOGO_OJOS[0], parpL * (1 - 0.18 * guinoL), mirarL, 0, WHITE, 4);
  ojo(ctx, LOGO_OJOS[1], Math.min(parpL, 1 - guinoL), mirarL, 0, WHITE, 6.5, 1.25);
  // Antenas
  [[191, 102], [303, 102]].forEach(([x, y], i) => {
    const p = 0.5 + 0.5 * Math.sin(t * 3.2 + i * Math.PI);
    glowDot(ctx, x, y, 20 + 6 * p, CYAN, (0.35 + 0.35 * p) * g);
  });
  ctx.restore();
  sparkle(ctx, 318, 172, 26, WHITE, g * env(t, 4.85, 5.05, 5.35, 5.8));
  sparkle(ctx, 333, 205, 14, WHITE, g * env(t, 5.0, 5.2, 5.4, 5.8));
  emitters(t, 4.8, 4.9, 1, 1.2, (p) => sonar(ctx, 247, 200, p, 90, 150, 3, BLUE, 0.6 * g));

  // ---- Tarjetas que se encienden y conectores con señales
  TARJETAS.forEach(([x, y, w, h, r, c, t0]) => {
    glowRect(ctx, x, y, w, h, r, c, g * env(t, t0, t0 + 0.3, t0 + 1.0, t0 + 1.6), 2.5, 16);
    sheen(ctx, x, y, w, h, r, (t - t0 - 0.1) / 1.1, 0.5 * g);
  });
  CONECTORES.forEach(({ path, c, t0 }) => emitters(t, t0, 8.6, 3.2, 1.2, (p) => signal(ctx, path, p, c, 0.95 * g, 40, 7)));

  // ---- Chat: "escribiendo…" (los tres puntos saltan) y renglones que se iluminan
  const chatOn = g * smooth(0.8, 1.2, t);
  if (chatOn > 0.01) {
    rrect(ctx, 400, 541, 37, 15, 4); ctx.fillStyle = rgba([45, 115, 245], chatOn); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const salto = Math.max(0, Math.sin(t * 7 - i * 0.9)) * 3.2;
      ctx.beginPath(); ctx.arc(408.6 + i * 10.35, 548.6 - salto, 2.9, 0, TAU); ctx.fillStyle = rgba(WHITE, chatOn); ctx.fill();
    }
  }
  [[533], [548.6], [562.7]].forEach(([y], i) => {
    const p = (t * 0.6 - i * 0.18) % 1;
    sheen(ctx, 455, y - 4, 46, 8, 4, p, 0.8 * g);
  });

  // ---- Barras: brillo en el tope de cada una, en ola
  BARRAS.forEach(([x0, x1, y, c], i) => {
    const p = 0.5 + 0.5 * Math.sin(t * 3 - i * 0.8);
    glowDot(ctx, (x0 + x1) / 2, y, 14 + 4 * p, c === WHITE ? CYAN : c, 0.6 * p * g);
    sheen(ctx, x0, y, x1 - x0, 677 - y, 2, ((t - 2.6 - i * 0.25) % 3.2) / 0.9, 0.6 * g);
  });

  // ---- Checks: se tildan en secuencia
  CHECKS.forEach(([x, y], i) => {
    const t0 = 3.0 + i * 0.6;
    emitters(t, t0, t0 + 0.1, 1, 1.2, (p) => sonar(ctx, x, y, p, 9, 30, 2.4, CYAN, 0.9 * g));
    glowDot(ctx, x, y, 18, CYAN, 0.6 * g * env(t, t0, t0 + 0.15, t0 + 0.4, t0 + 0.9));
  });

  // ---- Estrellas: las dos que faltaban se completan
  ESTRELLAS.forEach(([x, y], i) => {
    const t0 = 4.2 + i * 0.5, k = clamp((t - t0) / 0.4);
    estrella(ctx, x, y, 9.5, [40, 160, 240], g * smooth(t0, t0 + 0.25, t), 0.6 + 0.4 * easeOut(k) + 0.25 * Math.sin(Math.PI * k));
    sparkle(ctx, x, y, 14, WHITE, g * env(t, t0 + 0.15, t0 + 0.3, t0 + 0.4, t0 + 0.7));
  });

  // ---- Robot: flota, parpadea, guiña, mueve el dedo; núcleo y antenas laten
  const guinoR = env(t, 6.6, 6.75, 7.4, 7.6);
  const flotaR = -3.6 * (0.5 - 0.5 * Math.cos(t * TAU / 2.5)) * g;
  const ladeoR = (0.016 * Math.sin(t * 0.9) - 0.03 * guinoR) * g;
  const mirarR = (3 * env(t, 1.5, 1.8, 2.4, 2.7) - 3 * env(t, 5.0, 5.3, 5.8, 6.1)) * g;
  const parpR = parpadeo(t, [2.9, 8.1]);
  const dedo = (0.16 * Math.sin((t - 3.2) * 9) * env(t, 3.2, 3.4, 4.5, 4.8) + 0.03 * Math.sin(t * 1.7)) * g;
  ctx.save();
  pivotar(ctx, 512, 1015, 0, flotaR, ladeoR);
  ctx.drawImage(SPR.robot.cv, SPR.robot.x, SPR.robot.y, SPR.robot.w, SPR.robot.h);
  ojo(ctx, ROBOT_OJOS[0], parpR * (1 - 0.15 * guinoR), mirarR, 0, CYAN, 4.5);
  ojo(ctx, ROBOT_OJOS[1], Math.min(parpR, 1 - guinoR), mirarR, 0, CYAN, 5);
  sprite(ctx, 'robotMano', 0, 0, 1, dedo, 1, 628, 850);
  // Núcleo del pecho
  const lat = Math.pow(Math.max(0, Math.sin(t * 2.4)), 4);
  blob(ctx, 509.7, 874.6, 46 + 10 * lat, CYAN, (0.25 + 0.4 * lat) * g);
  glowDot(ctx, 509.7, 874.6, 16 + 4 * lat, CYAN, (0.3 + 0.5 * lat) * g);
  emitters(t, 1.0, 8.6, 1.3, 1.1, (p) => sonar(ctx, 509.7, 874.6, p, 24, 52, 2.2, CYAN, 0.6 * g));
  // Antenas
  [[437.7, 639.3], [597, 641]].forEach(([x, y], i) => {
    const p = 0.5 + 0.5 * Math.sin(t * 4 + i * Math.PI);
    glowDot(ctx, x, y, 16 + 5 * p, CYAN, (0.3 + 0.45 * p) * g);
  });
  // Check del portapapeles que se vuelve a trazar
  const check = polyline([[371, 896], [395, 911], [416, 862]]);
  emitters(t, 2.0, 8.4, 3.0, 1.0, (p) => signal(ctx, check, p, CYAN, 0.95 * g, 50, 8));
  ctx.restore();
  sparkle(ctx, 656, 770 + flotaR, 20, WHITE, g * env(t, 3.4, 3.6, 3.8, 4.3));
  sparkle(ctx, 560, 728 + flotaR, 18, WHITE, g * env(t, 6.75, 6.95, 7.15, 7.6));

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
