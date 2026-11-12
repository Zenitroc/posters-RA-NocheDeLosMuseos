/*
 * DrHero · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * SALE DEL PAPEL (el lienzo se extiende un 30 % por lado): el cirujano se despega del póster y se asoma
 * hacia vos; el celular de "Mis honorarios" salta fuera del papel tres veces, rotando, y en lo más alto
 * suelta una lluvia de monedas con el pago registrado; los cuatro pilares de abajo saltan fuera del papel.
 * Además, efectos sobre el impreso: la lámpara de quirófano late y proyecta un haz,
 * los electrocardiogramas laten, el título se barre con un destello, el tablero se enciende (tarjetas,
 * liquidaciones, gráficos que giran, monto del celular) y los cuatro pilares inferiores se activan en
 * secuencia (OCR con barrido de escáner, offline, cálculo, reportes). Fondo con haces de velocidad.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 14, MARGEN = 0.3;
const BLUE = [30, 100, 255], CYAN = [90, 190, 255], NAVY = [20, 50, 140], WHITE = [255, 255, 255], MINT = [60, 210, 150], ORANGE = [255, 150, 70];
const G = t => env(t, 0.3, 1.0, 12.9, 13.6);

// ---- Cirujano: se despega y se asoma hacia afuera (pivote abajo a la izquierda)
const asoma = t => env(t, 1.4, 2.2, 4.4, 5.2);

// ---- Celular: salta fuera del papel y rota (centro 873, 948). Tres saltos; en el punto más alto suelta
// monedas y aparece el pago registrado.
const CEL = [873, 948];
const SALTOS = [
  { t0: 5.2, dur: 1.3, h: 300, giro: TAU, sc: 1.5, pago: '+$ 185.000' },
  { t0: 7.0, dur: 1.2, h: 230, giro: -TAU, sc: 1.4, pago: '+$ 210.000' },
  { t0: 8.8, dur: 1.6, h: 360, giro: 2 * TAU, sc: 1.6, pago: '+$ 162.500' },
];
const T_CEL = [5.0, 10.6];

function celular(t) {
  let dy = 0, rot = 0, sc = 1, sy = 1, aire = 0, salto = null;
  for (const s of SALTOS) {
    const k = (t - s.t0) / s.dur;
    if (k > 0 && k < 1) {
      dy = -s.h * 4 * k * (1 - k); rot = s.giro * easeInOut(k); sc = 1 + (s.sc - 1) * Math.sin(Math.PI * k);
      aire = Math.sin(Math.PI * k); salto = { ...s, k };
    } else if (k >= 1 && k < 1.6) {
      // aterrizaje elástico: se aplasta y rebota
      const q = (k - 1) / 0.6;
      sy = 1 - 0.14 * Math.sin(Math.PI * q * 3) * (1 - q);
    }
  }
  const alto = env(t, T_CEL[0], T_CEL[0] + 0.25, T_CEL[1] - 0.3, T_CEL[1]);
  return { dy: dy - 10 * alto, rot, sc: sc * (1 + 0.05 * alto), sy, aire, alto, salto };
}

/** Moneda dorada con "$". */
function moneda(ctx, x, y, r, giro, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.15, Math.abs(Math.cos(giro))), 1); ctx.globalAlpha = clamp(a);
  const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
  gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.6, '#f5c542'); gr.addColorStop(1, '#c8901a');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = gr; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#a8740f'; ctx.stroke();
  ctx.fillStyle = '#8a5d06'; ctx.font = `800 ${r * 1.2}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 1);
  ctx.restore();
}

const ECG_L = polyline([[0, 398], [52, 398], [62, 372], [72, 340], [84, 398], [94, 362], [104, 398], [118, 398]]);
const ECG_R = polyline([[838, 193], [872, 193], [880, 150], [892, 225], [905, 175], [918, 200], [938, 193]]);
const SWOOSH = polyline([[600, 663], [680, 656], [770, 652], [880, 648]]);
const CARDS = [[505, 766, 86, 56], [596, 766, 98, 56], [710, 766, 102, 56]];
const ROWS = [[646, 886, MINT], [646, 910, MINT], [642, 934, ORANGE]];
const PILARES = [[152, 1125], [372, 1125], [590, 1125], [815, 1125]];
const BULBS = [[47, 106], [173, 102], [21, 157], [161, 161], [92, 130], [100, 178]];

const DONUT_L = [[10, 55, 160], [30, 110, 235], [60, 140, 245], [18, 90, 215], [25, 105, 230], [60, 140, 245], [35, 120, 240], [12, 60, 170]];
const DONUT_P = [[20, 95, 230], [35, 115, 235], [125, 178, 245], [28, 105, 232]];

/** Torta con segmentos que respiran. Primero tapa la impresa (color de fondo `bg`), luego se llena de 0 a 360°. */
function donut(ctx, x, y, R, r, base, cols, bg, t, grow0, amp, a) {
  if (a <= 0.003) return;
  ctx.save();
  ctx.fillStyle = rgba(bg, a); ctx.beginPath(); ctx.arc(x, y, R + 2.5, 0, TAU); ctx.fill();
  const n = base.length, vals = base.map((b, i) => b * (1 + amp * Math.sin(t * 1.3 + i * 1.9) * smooth(grow0 + 1.2, grow0 + 2.4, t)));
  const sum = vals.reduce((s, v) => s + v, 0), fill = easeInOut(clamp((t - grow0) / 1.4)) * TAU;
  let ang = -Math.PI / 2, used = 0;
  for (let i = 0; i < n; i++) {
    const span = vals[i] / sum * TAU, drawn = clamp(fill - used, 0, span);
    used += span;
    if (drawn > 0.001) {
      const pop = 1 + 0.06 * Math.max(0, Math.sin(t * 1.3 + i * 1.9)) * smooth(grow0 + 1.2, grow0 + 2.4, t);
      ctx.beginPath(); ctx.arc(x, y, R * pop, ang, ang + drawn); ctx.arc(x, y, r, ang + drawn, ang, true); ctx.closePath();
      ctx.fillStyle = rgba(cols[i], a); ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = rgba([247, 249, 253], a * 0.9); ctx.stroke();
    }
    ang += span;
  }
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);
  const cel = celular(t), sa = asoma(t) * g;
  // Placas limpias de lo que sale del papel
  if (sa > 0.001) sprite(ctx, 'fondoCirujano');
  if (cel.aire > 0.001) sprite(ctx, 'fondoCelular');
  const ph = t / DUR * TAU;

  // ---- Haces de velocidad que cruzan el fondo celeste (de abajo-izquierda a arriba-derecha)
  if (g > 0.002) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 90, DW, 1010); ctx.clip();
    for (let i = 0; i < 9; i++) {
      const q = (t * (0.07 + 0.015 * (i % 3)) + rnd(i, 1)) % 1;
      const x = -200 + q * (DW + 500), y = 1000 - q * 900 + (rnd(i, 2) - 0.5) * 300, len = 230 + rnd(i, 3) * 140;
      const gr = ctx.createLinearGradient(x - len, y + len * 0.28, x, y);
      gr.addColorStop(0, rgba(WHITE, 0)); gr.addColorStop(1, rgba(WHITE, 0.5 * g * Math.sin(Math.PI * q)));
      ctx.beginPath(); ctx.moveTo(x - len, y + len * 0.28); ctx.lineTo(x, y);
      ctx.lineWidth = 3 + rnd(i, 4) * 5; ctx.lineCap = 'round'; ctx.strokeStyle = gr; ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      blob(ctx, 180 + i * 220 + 90 * Math.sin(ph * 2 + i * 1.7), 560 + 60 * Math.cos(ph * 3 + i), 190, i % 2 ? CYAN : WHITE, 0.16 * g);
    }
    ctx.restore();
  }

  // ---- Lámpara de quirófano: late y proyecta un haz hacia el cirujano
  const pul = 0.6 + 0.4 * Math.sin(t * 2.4);
  if (g > 0.002) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 80, DW, 600); ctx.clip();
    const bx = 125, by = 175, sway = Math.sin(ph * 2) * 20;
    const gr = ctx.createLinearGradient(bx, by, bx + 40 + sway, by + 420);
    gr.addColorStop(0, rgba(WHITE, 0.55 * g * pul)); gr.addColorStop(1, rgba(WHITE, 0));
    ctx.beginPath(); ctx.moveTo(bx - 70, by); ctx.lineTo(bx + 70, by);
    ctx.lineTo(bx + 190 + sway, by + 430); ctx.lineTo(bx - 40 + sway, by + 430); ctx.closePath();
    ctx.fillStyle = gr; ctx.fill();
    ctx.restore();
  }
  BULBS.forEach(([x, y], i) => glowDot(ctx, x, y, 44 + 8 * Math.sin(t * 3 + i), WHITE, g * pul * 0.55));
  sparkle(ctx, 110, 135, 40, WHITE, g * (0.5 + 0.5 * Math.sin(t * 2.4 + 1)));

  // ---- Electrocardiogramas
  emitters(t, 0.8, 8.8, 2.4, 1.5, (p) => signal(ctx, ECG_L, p, CYAN, g, 70, 11));
  emitters(t, 1.4, 8.8, 2.4, 1.5, (p) => signal(ctx, ECG_R, p, BLUE, g, 70, 11));

  // ---- Título: destello que lo barre + latido
  sheen(ctx, 347, 97, 491, 115, 12, (t - 1.2) / 1.6, 0.6 * g);
  sheen(ctx, 347, 97, 491, 115, 12, (t - 6.2) / 1.6, 0.5 * g);
  sparkle(ctx, 633, 130, 26, WHITE, g * env(t, 3.0, 3.4, 3.7, 4.3));

  // ---- Subrayado de "ya hizo la cuenta." y flechas »
  emitters(t, 2.0, 8.4, 3.0, 1.4, (p) => signal(ctx, SWOOSH, p, BLUE, g, 90, 10));
  const ch = (t * 0.9) % 1;
  glowDot(ctx, 920 + 28 * easeInOut(ch), 668, 26, BLUE, g * Math.sin(Math.PI * ch) * 0.8);

  // ---- Tablero: tarjetas, filas, gráficos
  CARDS.forEach(([x, y, w, h], i) => {
    const t0 = 1.6 + i * 0.9;
    glowRect(ctx, x, y, w, h, 8, BLUE, g * env(t, t0, t0 + 0.3, t0 + 0.9, t0 + 1.5) * 0.95, 2.5, 14);
    sheen(ctx, x, y, w, h, 8, (t - t0 - 0.2) / 1.0, 0.5 * g);
  });
  ROWS.forEach(([x, y, c], i) => {
    const t0 = 4.4 + i * 0.7;
    emitters(t, t0, 8.6, 4.3, 1.1, (p) => sonar(ctx, x, y, p, 8, 26, 2.2, c, 0.9 * g));
    glowDot(ctx, x, y, 22, c, 0.5 * g * env(t, t0, t0 + 0.3, t0 + 0.6, t0 + 1.1));
  });
  // Gráficos de torta redibujados sobre los impresos: se llenan y luego respiran con datos "en vivo"
  const gd = g * smooth(1.2, 1.8, t);
  donut(ctx, 726.5, 914, 30.5, 15.5, [0.17, 0.13, 0.12, 0.13, 0.12, 0.11, 0.11, 0.11], DONUT_L, [238, 244, 250], t, 1.6, 0.35, gd);
  donut(ctx, 863, 965, 29, 9.5, [0.36, 0.26, 0.20, 0.18], DONUT_P, [247, 248, 252], t, 1.9, 0.3, gd * (1 - cel.alto));
  glowDot(ctx, 726.5, 914, 52, CYAN, 0.22 * g * pul);

  // Contadores: tapan el número impreso y lo cuentan hasta su valor
  const cnt = (x, y, w, h, bg, valor, px, cx, fmt, t0) => {
    const k = easeOut(clamp((t - t0) / 1.8));
    ctx.fillStyle = rgba(bg, g * smooth(t0 - 0.4, t0 - 0.2, t)); ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = clamp(g * smooth(t0 - 0.4, t0 - 0.2, t));
    ctx.fillStyle = '#14195a'; ctx.font = `italic 800 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(fmt(Math.round(valor * k)), cx, y + h / 2 + 1);
    ctx.globalAlpha = 1;
  };
  const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  cnt(511, 794, 30, 22, [237, 243, 251], 48, 18, 513, String, 1.6);
  cnt(603, 794, 88, 22, [235, 243, 250], 5842300, 17, 606, n => '$ ' + miles(n), 1.9);
  cnt(715, 794, 26, 22, [233, 241, 251], 12, 18, 718, String, 2.2);
  if (cel.alto < 0.01) cnt(820, 898, 104, 27, [247, 248, 252], 1245000, 19, 826, n => '$ ' + miles(n), 2.5);
  sparkle(ctx, 905, 905, 18, WHITE, g * env(t, 3.6, 4.0, 4.3, 4.9));
  sparkle(ctx, 626, 800, 18, WHITE, g * env(t, 5.8, 6.2, 6.5, 7.1));

  // ---- Pilares inferiores
  PILARES.forEach(([x, y], i) => {
    const t0 = 3.4 + i * 1.0;
    emitters(t, t0, 8.6, 4.2, 1.4, (p) => sonar(ctx, x, y, p, 36, 76, 2.8, BLUE, 0.9 * g));
    glowDot(ctx, x, y, 62, CYAN, 0.38 * g * env(t, t0, t0 + 0.3, t0 + 0.8, t0 + 1.4));
  });
  // OCR: línea de escáner sube y baja sobre el documento
  const sc = 0.5 - 0.5 * Math.cos(ph * 4);
  ctx.fillStyle = rgba(CYAN, 0.9 * g * env(t, 3.2, 3.6, 7.6, 8.2));
  ctx.fillRect(116, 1090 + 78 * sc, 70, 3);
  // Reportes: destello en la flecha
  sparkle(ctx, 838, 1100, 22, WHITE, g * env(t, 6.0, 6.4, 6.8, 7.4));

  // ---- El cirujano se despega del papel y se asoma hacia vos (crece desde abajo a la izquierda)
  if (sa > 0.001) {
    despegar(ctx, 'cirujano', { alto: sa, hueco: sa, sx: 1 + 0.16 * sa, sy: 1 + 0.16 * sa, dx: -40 * sa, dy: -10 * sa, rot: -0.05 * sa + 0.03 * Math.sin(t * 3) * sa, px: 60, py: 900 });
    // Gesto de "todo bajo control": guiño de luz en los anteojos
    sparkle(ctx, 250 - 40 * sa, 440 - 60 * sa, 24, WHITE, g * env(t, 2.6, 2.9, 3.1, 3.6));
  }

  // ---- El celular salta fuera del papel, rota y suelta monedas en lo más alto
  if (cel.alto > 0.001) {
    despegar(ctx, 'celular', {
      alto: Math.max(0.35 * cel.alto, cel.aire) * g, hueco: cel.aire * g,
      dy: cel.dy + 130 * (1 - cel.sy), sx: cel.sc, sy: cel.sc * cel.sy, rot: cel.rot, px: CEL[0], py: CEL[1], // aplastado desde la base
    });
    SALTOS.forEach((s, n) => {
      const ta = s.t0 + s.dur / 2, q = t - ta;
      if (q < 0 || q > 1.4) return;
      const ay = CEL[1] - s.h;
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * TAU + n, v = 260 + rnd(i, n) * 160;
        moneda(ctx, CEL[0] + Math.cos(ang) * v * q, ay + Math.sin(ang) * v * q * 0.8 + 420 * q * q, 13, t * 8 + i, g * (1 - q / 1.4));
      }
      const k = clamp(q / 0.3);
      chip(ctx, CEL[0] - 290, ay - 150, 270, 48, 'Pago registrado', s.pago, [40, 200, 120], g * env(q, 0, 0.2, 1.0, 1.4), k);
    });
    glowDot(ctx, CEL[0], CEL[1] + cel.dy, 130, [90, 190, 255], 0.22 * cel.aire * g);
  }
  chip(ctx, 640, 760, 300, 48, 'Mis honorarios', '$ 1.802.500 (+3 pagos)', [40, 200, 120], g * env(t, 11.8, 12.2, 12.7, 13.0), clamp((t - 11.8) / 0.6));

  // ---- Pilares: saltan fuera del papel en secuencia
  [[1, 153], [2, 372], [3, 593], [4, 818]].forEach(([n, x]) => {
    const t0 = 2.4 + n * 0.5 + (n > 2 ? 6.2 : 0), k = clamp((t - t0) / 0.9), s = Math.sin(Math.PI * k) * g;
    if (k <= 0 || k >= 1) return;
    sprite(ctx, 'fondoPilar' + n);
    despegar(ctx, 'pilar' + n, { alto: s, hueco: 0.4 * s, dy: -80 * s, sx: 1 + 0.35 * s, sy: 1 + 0.35 * s, rot: 0.3 * Math.sin(TAU * k), px: x, py: 1170 });
  });

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
