/*
 * EnerScope · capa animada. Póster 2:3 (1066×1600): coordenadas de diseño 990×1486.
 * El buque metanero (recorte real del póster, sobre una placa limpia) navega: cabecea y se balancea sobre
 * la línea de flotación, con su reflejo (que arranca un poco dentro del casco) ondulando en espejo. Un destello de sol recorre el
 * casco y los tanques, titila la baliza del mástil y brilla el agua. Abajo, el gas recorre la cadena
 * Extracción → Transporte → Licuefacción → Transporte marítimo → Exportación, y se encienden
 * MODELÁ · SIMULÁ · COMPARÁ.
 */
const W = 1066, H = 1600, DW = 990, DH = 1600 * 990 / 1066, DUR = 12;
const GREEN = [46, 160, 80], GREEN_L = [120, 210, 130], WHITE = [255, 255, 255], SOL = [255, 236, 200], RED = [255, 70, 60];
const G = t => env(t, 0.3, 1.2, 10.8, 11.7);

const PIVOTE = [720, 899];           // centro de la línea de flotación: el buque gira alrededor de ella
const BALIZA = [728, 494];           // punta del mástil
const ICONOS = [[120, 1171], [311, 1171], [493, 1171], [681, 1171], [858, 1171]];
const TRAMOS = [[169, 246], [358, 417], [552, 611], [728, 789]]; // líneas punteadas entre íconos (y = 1179)
const PALABRAS = [[296, 1063, 128], [493, 1063, 118], [714, 1063, 150]]; // centro y ancho de MODELÁ · SIMULÁ · COMPARÁ

/** Movimiento del buque: balanceo (rad), subida y avance (unidades de diseño). Períodos que cierran en DUR. */
function oleaje(t) {
  const g = G(t), w = TAU / DUR;
  return {
    rot: g * (0.02 * Math.sin(w * 2 * t) + 0.006 * Math.sin(w * 5 * t + 1.1)),
    dy: g * (2.2 * Math.sin(w * 3 * t + 0.6)),
    dx: g * (2.5 * Math.sin(w * 1 * t)),
  };
}

/** Reflejo: el recorte del agua bajo el buque, en espejo del balanceo y en franjas que ondulan. */
function reflejo(ctx, t, o, g) {
  const s = SPR.reflejo; if (!s) return;
  const esc = s.cv.width / s.w, paso = 3;
  ctx.save();
  pivotar(ctx, PIVOTE[0], PIVOTE[1], o.dx, -o.dy * 0.8, -o.rot * 0.8);
  ctx.drawImage(s.cv, s.cv.width - 5 * esc, 0, 5 * esc, s.cv.height, s.x + s.w - 5, s.y, 20, s.h); // borde del papel
  for (let y = 0; y < s.h; y += paso) {
    const prof = y / s.h; // más abajo, más onda
    const dx = g * (0.6 + 2.4 * prof) * Math.sin(y * 0.21 - t * 3.1) + g * 0.9 * Math.sin(y * 0.07 + t * 1.7);
    ctx.drawImage(s.cv, 0, y * esc, s.cv.width, paso * esc + 1, s.x + dx, s.y + y, s.w, paso + 0.35);
  }
  ctx.restore();
}

/** Destello de sol que cruza el buque (sólo sobre el recorte, vía lienzo auxiliar). */
let AUX = null;
function barcoConDestello(ctx, p, a) {
  const s = SPR.barco; if (!s) return;
  // El casco sigue más allá del borde del papel: al inclinarse, se estira su última franja para no dejar hueco.
  const esc = s.cv.width / s.w;
  ctx.drawImage(s.cv, s.cv.width - 5 * esc, 0, 5 * esc, s.cv.height, s.x + s.w - 5, s.y, 30, s.h);
  if (p <= 0 || p >= 1 || a <= 0.01) { ctx.drawImage(s.cv, s.x, s.y, s.w, s.h); return; }
  if (!AUX) { AUX = document.createElement('canvas'); AUX.width = s.cv.width; AUX.height = s.cv.height; }
  const c = AUX.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, AUX.width, AUX.height); c.drawImage(s.cv, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  const cx = -0.3 * AUX.width + 1.6 * AUX.width * easeInOut(p), bw = AUX.width * 0.16;
  const gr = c.createLinearGradient(cx - bw, 0, cx + bw, AUX.height * 0.35);
  gr.addColorStop(0, rgba(SOL, 0)); gr.addColorStop(0.5, rgba(SOL, 0.5 * a)); gr.addColorStop(1, rgba(SOL, 0));
  c.fillStyle = gr; c.fillRect(0, 0, AUX.width, AUX.height);
  ctx.drawImage(AUX, s.x, s.y, s.w, s.h);
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }
  const o = oleaje(t);

  // ---- Agua: placa limpia detrás del buque, reflejo que ondula y brillos que titilan
  sprite(ctx, 'fondoBarco');
  reflejo(ctx, t, o, g);
  for (let i = 0; i < 22; i++) {
    const x = 470 + rnd(i, 1) * 510, y = 908 + rnd(i, 2) * 95, ph = rnd(i, 3) * DUR, per = 1.6 + rnd(i, 4) * 1.6;
    const q = ((t + ph) % per) / per;
    glowDot(ctx, x + 6 * Math.sin(t + i), y, 5 + 4 * rnd(i, 5), SOL, g * 0.55 * Math.sin(Math.PI * q) * (1 - (y - 905) / 130));
  }

  // ---- Buque: el recorte balanceándose sobre la línea de flotación
  ctx.save();
  pivotar(ctx, PIVOTE[0], PIVOTE[1], o.dx, o.dy, o.rot);
  barcoConDestello(ctx, (t - 3.2) / 3.4, g);
  // Baliza roja del mástil
  const b = Math.max(0, Math.sin(t * TAU / 1.5)) ** 6;
  glowDot(ctx, BALIZA[0], BALIZA[1], 16, RED, g * (0.25 + 0.75 * b));
  ctx.restore();

  ctx.save();
  // Ola en la proa
  emitters(t, 0.8, 11, 1.3, 1.6, (p, i) => {
    const x = 470 - 26 * easeOut(p), y = 897 + o.dy + 3 * Math.sin(p * 3 + i);
    ctx.fillStyle = rgba(WHITE, g * 0.35 * (1 - p));
    ctx.beginPath(); ctx.ellipse(x, y, 9 + 20 * p, 2 + 1.5 * p, 0, 0, TAU); ctx.fill();
  });
  ctx.restore();

  // ---- Cadena de valor del GNL: el gas recorre los tramos y cada etapa se enciende
  const CICLO = 4.6, T0 = 1.4;
  for (let c = 0; c < 2; c++) {
    const tc = t - T0 - c * CICLO;
    ICONOS.forEach(([x, y], i) => {
      const ti = tc - i * 0.85;
      if (ti > -0.1 && ti < 1.4) {
        sonar(ctx, x, y, clamp(ti / 1.2), 34, 62, 2.6, GREEN, 0.8 * g);
        glowDot(ctx, x, y, 52, GREEN_L, 0.22 * g * env(ti, 0, 0.2, 0.5, 1.2));
      }
      if (i < TRAMOS.length) {
        const [xa, xb] = TRAMOS[i], p = (ti - 0.25) / 0.6;
        if (p > 0 && p < 1) signal(ctx, polyline([[xa, 1179], [xb, 1179]]), p, GREEN, g, 40, 8);
      }
    });
  }
  PALABRAS.forEach(([x, y, w], i) => {
    for (let c = 0; c < 2; c++) {
      const tp = t - (T0 + 0.2 + i * 1.3) - c * CICLO;
      sheen(ctx, x - w / 2 - 6, y - 16, w + 12, 32, 6, tp / 0.9, 0.55 * g, WHITE);
    }
  });

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
