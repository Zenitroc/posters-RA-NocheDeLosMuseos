/*
 * INFRABOT · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * El robot SALE DEL PAPEL: se despega de su mancha (deja el hueco), enciende los propulsores y vuela
 * alrededor del póster por la pared (el lienzo se extiende un 30 % por lado). Baja sobre la ciudad,
 * inspecciona una escuela con la lupa, detecta el problema y genera el reclamo; entonces el flujo de la
 * derecha se recorre paso a paso hasta "Resolución del problema" y el robot vuelve volando a su lugar.
 * El avioncito de papel también sale y da la vuelta al póster; el pin, el WhatsApp y el chat saltan del
 * papel. Fondo vivo con luces y burbujas; la ciudad respira y se conecta por wifi.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 14, MARGEN = 0.3;
const TEAL = [30, 190, 190], NAVY = [60, 120, 230], GREEN = [60, 200, 110], WHITE = [255, 255, 255], FUEGO = [255, 170, 60], RED = [240, 80, 70];
const G = t => env(t, 0.3, 1.0, 12.9, 13.6);

const STEPS = [ // x, y, w, h, centro del ícono
  { x: 458, y: 354, w: 532, h: 71, ic: [482, 389] },
  { x: 458, y: 468, w: 532, h: 72, ic: [482, 504] },
  { x: 458, y: 580, w: 532, h: 72, ic: [482, 621] },
  { x: 458, y: 692, w: 532, h: 72, ic: [482, 727] },
];
const BENEF = [[70, 905], [255, 905], [442, 905], [612, 905]];
const RIEL = polyline([[672, 1112], [716, 1070], [800, 1020], [880, 972], [940, 930], [990, 898]]);

// ---- Vuelo del robot (centro del recorte: 202, 552)
const CASA = [202, 552], ESCUELA = [765, 1105];
const IDA = recorrido(esquinasSuaves([CASA, [-130, 260], [-130, -150], [1130, -150], [1130, 860], [790, 960]], 160, 8));
const VUELTA = recorrido(esquinasSuaves([[790, 960], [560, 820], [300, 640], CASA], 120, 6));
const TR = { despega: 1.6, vuela: 2.1, ciudad: 6.4, inspecciona: 8.4, casa: 10.2, fin: 10.8 };
const PASOS = [7.2, 8.0, 8.8, 10.3]; // el reclamo recorre el flujo

function robot(t) {
  const alto = env(t, TR.despega, TR.vuela, TR.casa - 0.2, TR.fin);
  let x = CASA[0], y = CASA[1], sc = 1, inclina = 0;
  if (t >= TR.vuela && t < TR.ciudad) {
    const k = (t - TR.vuela) / (TR.ciudad - TR.vuela), p = IDA.at(IDA.total * easeInOut(k));
    x = p.x; y = p.y; inclina = p.dx * 0.28; sc = 1 - 0.48 * smooth(0, 0.25, k);
  } else if (t >= TR.ciudad && t < TR.inspecciona) {
    x = 790 + 6 * Math.sin(t * 2.2); y = 960 + 5 * Math.sin(t * 3.1); sc = 0.52;
  } else if (t >= TR.inspecciona && t < TR.casa) {
    const k = (t - TR.inspecciona) / (TR.casa - TR.inspecciona), p = VUELTA.at(VUELTA.total * easeInOut(k));
    x = p.x; y = p.y; inclina = p.dx * 0.28; sc = 0.52 + 0.48 * smooth(0.6, 1, k);
  }
  const flota = -6 * Math.sin(t * 3.2) * (alto > 0.05 ? 1 : 0.4);
  const aterrizaje = t > TR.casa ? -18 * Math.sin(Math.PI * clamp((t - TR.casa) / 0.3)) * Math.exp(-(t - TR.casa) * 3) : 0;
  return { x, y: y + flota - 14 * alto + aterrizaje, sc: sc * (1 + 0.06 * alto), rot: inclina + 0.04 * Math.sin(t * 1.7), alto };
}

// ---- Avioncito de papel: vuelta al póster (centro 329, 367; apunta hacia arriba a la derecha)
const AVION = [329, 367], RUMBO_AVION = -0.5;
const VUELO_AVION = recorrido(esquinasSuaves([AVION, [-150, 120], [-150, 1520], [1140, 1520], [1140, -150], [329, -150], AVION], 170, 8));
const TA = [1.0, 7.4];

/** Llamas de los propulsores bajo los pies (en coordenadas del robot sin transformar). */
function propulsores(ctx, t, a) {
  if (a <= 0.01) return;
  [[182, 712], [262, 712]].forEach(([x, y], i) => {
    const l = 34 + 10 * Math.sin(t * 40 + i * 2);
    const gr = ctx.createLinearGradient(x, y, x, y + l);
    gr.addColorStop(0, rgba([255, 250, 200], a)); gr.addColorStop(0.4, rgba(FUEGO, a * 0.9)); gr.addColorStop(1, rgba(RED, 0));
    ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.quadraticCurveTo(x, y + l * 1.2, x + 13, y); ctx.closePath();
    ctx.fillStyle = gr; ctx.fill();
    glowDot(ctx, x, y + 6, 20, FUEGO, 0.6 * a);
  });
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);
  const r = robot(t);

  // ---- Placas limpias de lo que se mueve
  sprite(ctx, 'fondoRobot'); sprite(ctx, 'fondoAvion');

  // ---- Ciudad (respira) y luces que viajan por el riel elevado
  const f = Math.sin(t / DUR * TAU * 4) * g;
  sprite(ctx, 'ciudad', 0, 4.5 * f);
  sprite(ctx, 'torre', 0, 4.5 * f);
  for (let k = 0; k < 3; k++) emitters(t, 0.5 + k * 0.9, 12.6, 2.7, 2.2, (p) => signal(ctx, RIEL, p, WHITE, 0.9 * g, 80, 8));

  // ---- Fondo vivo dentro del papel: manchas de luz y burbujas de datos
  ctx.save(); ctx.beginPath(); ctx.rect(0, 72, DW, 1158); ctx.clip();
  for (let i = 0; i < 6; i++) {
    const ph = t / DUR * TAU, x = 495 + 420 * Math.sin(ph * (1 + (i % 2)) + i * 1.7), y = 300 + i * 190 + 90 * Math.cos(ph * (1 + ((i + 1) % 2)) + i);
    blob(ctx, x, y, 260 + 50 * Math.sin(ph * 2 + i), i % 2 ? WHITE : [110, 215, 255], (i % 2 ? 0.2 : 0.16) * g);
  }
  for (let i = 0; i < 22; i++) {
    const per = 7 + rnd(i, 1) * 5, q = ((t / per + rnd(i, 2)) % 1), rr = 2.5 + rnd(i, 3) * 5;
    ring(ctx, 20 + rnd(i, 4) * 950 + Math.sin(q * 7 + i) * 16, 1215 - q * 1130, rr, 1.6, WHITE, 0.75 * g * Math.sin(Math.PI * q));
  }
  ctx.restore();

  // ---- Flujo del reclamo: se recorre cuando el robot genera el reclamo en la ciudad
  STEPS.forEach((s, i) => {
    const t0 = PASOS[i], k = t - t0;
    const act = env(k, 0, 0.3, 1.0, 1.7);
    glowRect(ctx, s.x, s.y, s.w, s.h, 35, NAVY, 0.9 * act * g, 3, 18);
    sheen(ctx, s.x, s.y, s.w, s.h, 35, k / 1.2, 0.5 * g);
    emitters(t, t0, t0 + 0.1, 9, 1.2, (p) => sonar(ctx, s.ic[0], s.ic[1], p, 22, 46, 2.4, NAVY, 0.8 * g));
    glowDot(ctx, s.ic[0], s.ic[1], 34, NAVY, 0.28 * act * g);
    if (i < 3) signal(ctx, polyline([[s.ic[0], s.ic[1] + 26], [s.ic[0] - 6, STEPS[i + 1].ic[1] - 26]]), (t - (t0 + 0.4)) / 0.5, TEAL, 0.9 * g, 40, 8);
  });
  emitters(t, PASOS[3], PASOS[3] + 2, 0.7, 1.4, (p) => sonar(ctx, 684, 741, p, 10, 34, 2.4, GREEN, 0.9 * g));
  glowDot(ctx, 684, 741, 22, GREEN, 0.5 * g * env(t, PASOS[3], PASOS[3] + 0.4, 12.0, 12.6));

  // ---- Ciudad conectada (wifi) y escuela inspeccionada
  ctx.save(); ctx.translate(0, 4.5 * f);
  wifi(ctx, 559, 1042, t, 1.0, 12.6, NAVY, 0.9 * g, 1.1, 2.0);
  wifi(ctx, 921, 1000, t, 2.0, 12.6, NAVY, 0.9 * g, 1.1, 2.0);
  ctx.restore();
  const insp = g * env(t, TR.ciudad, TR.ciudad + 0.4, TR.inspecciona - 0.3, TR.inspecciona);
  if (insp > 0.01) {
    // Haz de la lupa sobre la escuela y alerta del problema
    const lx = r.x - 92 * r.sc, ly = r.y - 82 * r.sc;
    const gr = ctx.createLinearGradient(lx, ly, ESCUELA[0], ESCUELA[1]);
    gr.addColorStop(0, rgba(WHITE, 0.55 * insp)); gr.addColorStop(1, rgba(TEAL, 0.05));
    ctx.beginPath(); ctx.moveTo(lx - 10, ly); ctx.lineTo(lx + 10, ly); ctx.lineTo(ESCUELA[0] + 60, ESCUELA[1]); ctx.lineTo(ESCUELA[0] - 60, ESCUELA[1]); ctx.closePath();
    ctx.fillStyle = gr; ctx.fill();
    emitters(t, TR.ciudad + 0.5, TR.inspecciona, 0.6, 1.0, (p) => sonar(ctx, ESCUELA[0], ESCUELA[1], p, 14, 70, 3, RED, 0.9 * insp));
    const k = clamp((t - TR.ciudad - 0.8) / 0.6);
    chip(ctx, 560, 1170, 300, 48, 'Problema detectado', 'Filtración · Escuela N° 12', RED, insp * smooth(0, 0.3, k), k);
  }
  chip(ctx, 600, 300, 280, 48, 'Reclamo generado', 'Prioridad alta · #4521', TEAL, g * env(t, 7.2, 7.6, 9.6, 10.1), clamp((t - 7.2) / 0.6));

  // ---- Robot: se despega, vuela con propulsores y vuelve
  ctx.save();
  pivotar(ctx, CASA[0], CASA[1], r.x - CASA[0], r.y - CASA[1], r.rot, r.sc, r.sc);
  propulsores(ctx, t, r.alto * g);
  ctx.restore();
  despegar(ctx, 'robot', { alto: r.alto * g, hueco: r.alto * g, dx: r.x - CASA[0], dy: r.y - CASA[1], sx: r.sc, sy: r.sc, rot: r.rot, px: CASA[0], py: CASA[1] });
  // Saludo al volver y chispas en su lugar
  sparkle(ctx, 300, 430, 22, WHITE, g * env(t, 10.4, 10.6, 10.8, 11.3));
  ctx.save(); ctx.translate(r.x - CASA[0], r.y - CASA[1]); wifi(ctx, 133, 402, t, 0.8, 1.6, TEAL, 0.9 * g, 1.2, 1.8); ctx.restore();

  // ---- Avioncito de papel: sale del papel y da la vuelta al póster
  const ka = clamp((t - TA[0]) / (TA[1] - TA[0]));
  const altoA = env(t, TA[0] - 0.3, TA[0] + 0.1, TA[1] - 0.2, TA[1] + 0.2) * g;
  if (ka > 0 && ka < 1) {
    const p = VUELO_AVION.at(VUELO_AVION.total * easeInOut(ka));
    // Estela punteada (como la del póster)
    for (let k = 1; k <= 16; k++) {
      const q = VUELO_AVION.at(VUELO_AVION.total * easeInOut(clamp(ka - k * 0.006)));
      ctx.beginPath(); ctx.arc(q.x, q.y, 2.6, 0, TAU); ctx.fillStyle = rgba([30, 50, 70], 0.7 * g * (1 - k / 17)); ctx.fill();
    }
    despegar(ctx, 'avion', { alto: altoA, hueco: altoA, dx: p.x - AVION[0], dy: p.y - AVION[1], sx: 1.3, sy: 1.3, rot: Math.atan2(p.dy, p.dx) - RUMBO_AVION, px: AVION[0], py: AVION[1] });
  } else if (altoA > 0.01) {
    despegar(ctx, 'avion', { alto: altoA, hueco: altoA, sx: 1 + 0.3 * altoA, sy: 1 + 0.3 * altoA, dy: -10 * altoA });
  }

  // ---- Pin, WhatsApp y chat saltan fuera del papel
  [['pin', 3.0, 402, 676], ['whatsapp', 3.6, 376, 488], ['chat', 4.2, 81, 697], ['pin', 11.2, 402, 676], ['whatsapp', 11.6, 376, 488]].forEach(([n, t0, px, py]) => {
    const k = clamp((t - t0) / 0.9), s = Math.sin(Math.PI * k) * g;
    if (k <= 0 || k >= 1) return;
    sprite(ctx, 'fondo' + n[0].toUpperCase() + n.slice(1));
    despegar(ctx, n, { alto: s, hueco: 0.6 * s, dy: -70 * s, sx: 1 + 0.4 * s, sy: 1 + 0.4 * s, rot: 0.3 * Math.sin(TAU * k), px, py });
  });

  // ---- Beneficios y WhatsApp
  BENEF.forEach(([x, y], i) => {
    const t0 = 10.6 + i * 0.4;
    emitters(t, t0, t0 + 0.1, 9, 1.3, (p) => sonar(ctx, x, y, p, 18, 44, 2.6, GREEN, 0.85 * g));
    glowDot(ctx, x, y, 28, GREEN, 0.3 * g * env(t, t0, t0 + 0.3, t0 + 0.8, t0 + 1.4));
  });
  glowRect(ctx, 68, 1036, 327, 107, 6, WHITE, g * env(t, 12.0, 12.3, 12.6, 13.0) * 0.9, 3, 18);

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
