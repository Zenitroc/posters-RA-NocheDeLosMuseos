/* drhero · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
(function (global) {
'use strict';
/*
 * Utilidades compartidas por las capas Canvas de los pósters (AgroLink, Arbiter, INFRABOT, VictoriaX).
 * Se concatenan delante del código de cada animación (ver recursos-fuente/construir.py).
 * Todo se dibuja en coordenadas de diseño 990×1400 (el póster impreso se escala a 1131×1600).
 * Regla de oro: t=0 y t=DURATION dejan el lienzo vacío → el loop es invisible y el póster impreso
 * se ve intacto cuando no hay animación.
 */
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (e0, e1, x) => { const k = clamp((x - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
const env = (t, a, b, c, d) => smooth(a, b, t) * (1 - smooth(c, d, t));
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeInOut = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** Repite `fn(p, i)` cada `period` s entre `start` y `end`; p = progreso 0..1 de cada emisión de duración `life`. */
function emitters(t, start, end, period, life, fn) {
  if (t < start || t > end) return;
  const first = Math.max(0, Math.floor((t - start - life) / period));
  const last = Math.floor((t - start) / period);
  for (let i = first; i <= last; i++) {
    const p = (t - start - i * period) / life;
    if (p >= 0 && p <= 1) fn(p, i);
  }
}

function ring(ctx, x, y, r, w, color, a) {
  if (a <= 0.003) return;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  ctx.lineWidth = w; ctx.strokeStyle = rgba(color, a); ctx.stroke();
}

/** Anillo que se expande (sonar). */
function sonar(ctx, x, y, p, r0, r1, w, color, a) {
  ring(ctx, x, y, r0 + (r1 - r0) * easeOut(p), w, color, a * (1 - p));
}

function glowDot(ctx, x, y, r, color, a) {
  if (a <= 0.003) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba([255, 255, 255], a));
  g.addColorStop(0.3, rgba(color, a * 0.85));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/** Destello de cuatro puntas. */
function sparkle(ctx, x, y, size, color, a) {
  if (a <= 0.01) return;
  glowDot(ctx, x, y, size * 0.8, color, a * 0.7);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = rgba([255, 255, 255], a);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4, rr = i % 2 === 0 ? size : size * 0.14;
    const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

/** Borde luminoso de una píldora / rectángulo redondeado. */
function glowRect(ctx, x, y, w, h, r, color, a, width = 2.5, blur = 14) {
  if (a <= 0.003) return;
  ctx.save();
  rrect(ctx, x, y, w, h, r);
  ctx.shadowColor = rgba(color, a); ctx.shadowBlur = blur;
  ctx.lineWidth = width; ctx.strokeStyle = rgba(color, a); ctx.stroke();
  ctx.restore();
}

/** Banda de brillo que cruza un rectángulo redondeado de izquierda a derecha (p: 0..1). */
function sheen(ctx, x, y, w, h, r, p, a = 0.45, color = [255, 255, 255]) {
  if (p <= 0 || p >= 1 || a <= 0.003) return;
  ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip();
  const bw = Math.max(60, w * 0.22), cx = x - bw + (w + bw * 2) * easeInOut(p);
  const g = ctx.createLinearGradient(cx - bw, 0, cx + bw, 0);
  g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.5, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}

/** Polilínea con longitud acumulada, para mover una señal a lo largo de un recorrido. */
function polyline(points) {
  const len = [0];
  for (let i = 1; i < points.length; i++) len.push(len[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const total = len[len.length - 1];
  return {
    total,
    at(s) {
      s = clamp(s, 0, total);
      let i = 1; while (i < len.length - 1 && len[i] < s) i++;
      const k = (s - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
      return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * k, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * k];
    },
  };
}

/** Señal luminosa con cola que avanza por un recorrido (p: 0..1). */
function signal(ctx, path, p, color, a, tail = 70, size = 9) {
  if (p <= 0 || p >= 1 || a <= 0.003) return;
  const head = path.total * easeInOut(p), t0 = Math.max(0, head - tail);
  ctx.lineCap = 'round';
  for (let s = t0; s < head; s += 3) {
    const [x0, y0] = path.at(s), [x1, y1] = path.at(Math.min(head, s + 3.5)), k = (s - t0) / Math.max(1, head - t0);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.lineWidth = 2 + 2.5 * k; ctx.strokeStyle = rgba(color, a * k * 0.9); ctx.stroke();
  }
  const [hx, hy] = path.at(head); glowDot(ctx, hx, hy, size, color, a);
}

/** Arcos tipo wifi que se encienden de adentro hacia afuera. */
function wifi(ctx, x, y, t, start, end, color, a, scale = 1, period = 1.6) {
  emitters(t, start, end, period, period, (p) => {
    for (let k = 0; k < 3; k++) {
      const q = clamp(p * 1.6 - k * 0.3);
      const al = Math.sin(Math.PI * q) * a;
      if (al <= 0.01) continue;
      ctx.beginPath(); ctx.arc(x, y, (9 + k * 9) * scale, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.lineWidth = 3 * scale; ctx.lineCap = 'round'; ctx.strokeStyle = rgba(color, al); ctx.stroke();
    }
  });
}

/** Marco del contexto: aplica la escala de diseño → píxeles del póster. */
function begin(ctx, W, H, DW, DH) { ctx.save(); ctx.scale(W / DW, H / DH); }

/* ------------------------------------------------------------------------------------------------
 * Sprites: recortes del póster original (los inyecta construir.mjs en SPRITES_SRC) que se mueven
 * por encima del propio póster. Como el fondo de cada recorte (cielo, degradé, papel) es suave y los
 * bordes se difuminan, desplazarlos unos píxeles no deja huellas del original.
 * ---------------------------------------------------------------------------------------------- */
const SPR = {};

function loadSprites(defs) {
  return Promise.all(Object.entries(defs).map(([name, d]) => new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = d.pw; cv.height = d.ph;
      const c = cv.getContext('2d'); c.drawImage(img, 0, 0, d.pw, d.ph);
      const k = d.pw / d.w, f = (d.feather || [0, 0, 0, 0]).map(v => v * k); // [izq, arr, der, aba] en px del recorte
      c.globalCompositeOperation = 'destination-in';
      let g = c.createLinearGradient(0, 0, d.pw, 0);
      g.addColorStop(0, 'rgba(0,0,0,' + (f[0] ? 0 : 1) + ')'); g.addColorStop(f[0] ? f[0] / d.pw : 0, 'rgba(0,0,0,1)');
      g.addColorStop(1 - (f[2] ? f[2] / d.pw : 0), 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,' + (f[2] ? 0 : 1) + ')');
      c.fillStyle = g; c.fillRect(0, 0, d.pw, d.ph);
      g = c.createLinearGradient(0, 0, 0, d.ph);
      g.addColorStop(0, 'rgba(0,0,0,' + (f[1] ? 0 : 1) + ')'); g.addColorStop(f[1] ? f[1] / d.ph : 0, 'rgba(0,0,0,1)');
      g.addColorStop(1 - (f[3] ? f[3] / d.ph : 0), 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,' + (f[3] ? 0 : 1) + ')');
      c.fillStyle = g; c.fillRect(0, 0, d.pw, d.ph);
      SPR[name] = { cv, x: d.x, y: d.y, w: d.w, h: d.h };
      ok();
    };
    img.onerror = () => fail(new Error('sprite ' + name));
    img.src = d.src;
  })));
}

/** Dibuja un sprite desplazado (dx, dy), rotado `rot` rad y escalado `sc` alrededor de (px, py) (por defecto, su centro). */
function sprite(ctx, name, dx = 0, dy = 0, sc = 1, rot = 0, a = 1, px, py) {
  const s = SPR[name]; if (!s || a <= 0.003) return;
  ctx.save();
  const cx = px ?? s.x + s.w / 2, cy = py ?? s.y + s.h / 2;
  ctx.translate(cx + dx, cy + dy); if (rot) ctx.rotate(rot); if (sc !== 1) ctx.scale(sc, sc); ctx.translate(-cx, -cy);
  if (a < 1) ctx.globalAlpha = a;
  ctx.drawImage(s.cv, s.x, s.y, s.w, s.h);
  ctx.restore();
}

/** Nube suave (varios círculos con degradé radial). */
function cloud(ctx, x, y, sc, a) {
  if (a <= 0.003) return;
  const puffs = [[0, 0, 46], [44, -14, 40], [86, 2, 44], [-42, 6, 36], [128, 10, 32], [20, 16, 40], [66, 18, 36]];
  for (const [px, py, r] of puffs) {
    const rr = r * sc, g = ctx.createRadialGradient(x + px * sc, y + py * sc, 0, x + px * sc, y + py * sc, rr);
    g.addColorStop(0, 'rgba(255,255,255,' + clamp(a) + ')'); g.addColorStop(0.55, 'rgba(255,255,255,' + clamp(a * 0.55) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + px * sc, y + py * sc, rr, 0, TAU); ctx.fill();
  }
}

/** Mancha de luz suave que se mueve (fondos vivos). */
function blob(ctx, x, y, r, color, a) {
  if (a <= 0.002) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/** Número pseudoaleatorio estable a partir de una semilla entera. */
function rnd(i, k = 0) { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }

/** Chip de datos tipo "tablero": etiqueta chica + valor grande. `a` = opacidad, `k` = progreso de entrada (0..1). */
function chip(ctx, x, y, w, h, etiqueta, valor, color, a, k = 1) {
  if (a <= 0.01) return;
  const dy = (1 - easeOut(k)) * 14;
  ctx.save(); ctx.translate(0, dy); ctx.globalAlpha = clamp(a);
  rrect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(6,18,46,0.78)'; ctx.fill();
  ctx.shadowColor = rgba(color, 0.9); ctx.shadowBlur = 12; ctx.lineWidth = 2; ctx.strokeStyle = rgba(color, 0.9); ctx.stroke();
  ctx.shadowBlur = 0;
  glowDot(ctx, x + h / 2, y + h / 2, h * 0.42, color, 0.9);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(190,215,255,0.9)'; ctx.font = '600 12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(etiqueta.toUpperCase(), x + h + 2, y + h * 0.32);
  ctx.fillStyle = '#fff'; ctx.font = '700 20px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(valor, x + h + 2, y + h * 0.68);
  ctx.restore();
}

const SPRITES_SRC = {};
/*
 * DrHero · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Todo son efectos sobre el póster impreso (sin recortes): la lámpara de quirófano late y proyecta un haz,
 * los electrocardiogramas laten, el título se barre con un destello, el tablero se enciende (tarjetas,
 * liquidaciones, gráficos que giran, monto del celular) y los cuatro pilares inferiores se activan en
 * secuencia (OCR con barrido de escáner, offline, cálculo, reportes). Fondo con haces de velocidad.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const BLUE = [30, 100, 255], CYAN = [90, 190, 255], NAVY = [20, 50, 140], WHITE = [255, 255, 255], MINT = [60, 210, 150], ORANGE = [255, 150, 70];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

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
  begin(ctx, W, H, DW, DH);
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
  donut(ctx, 863, 965, 29, 9.5, [0.36, 0.26, 0.20, 0.18], DONUT_P, [247, 248, 252], t, 1.9, 0.3, gd);
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
  cnt(820, 898, 104, 27, [247, 248, 252], 1245000, 19, 826, n => '$ ' + miles(n), 2.5);
  sparkle(ctx, 905, 905, 18, WHITE, g * env(t, 4.6, 5.0, 5.3, 5.9));
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

  ctx.restore();
}

const load = () => Promise.resolve();

global.DrHeroAnim = { WIDTH: W, HEIGHT: H, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
