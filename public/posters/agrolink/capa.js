/* agrolink · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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

/*
 * AgroLink · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Idea: los tres puntos de la flota emiten señal (sonar) y la información viaja por las líneas
 * hacia cada función; las píldoras se iluminan y un destello cruza la barra "Conocé más".
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const BLUE = [70, 180, 255], GREEN = [110, 255, 130], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

const NODES = [
  { x: 572, y: 565, c: BLUE, line: polyline([[572, 560], [572, 438], [630, 438]]), delay: 0.9 },
  { x: 500, y: 954, c: GREEN, line: polyline([[500, 948], [500, 1056]]), delay: 1.4 },
  { x: 622, y: 938, c: BLUE, line: polyline([[622, 938], [710, 938], [710, 1026]]), delay: 1.9 },
];
const PILLS = [
  { x: 628, y: 412, w: 284, h: 55, r: 27, c: BLUE },
  { x: 262, y: 1054, w: 318, h: 55, r: 27, c: GREEN },
  { x: 637, y: 1024, w: 220, h: 62, r: 31, c: BLUE },
];

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // Señales viajando de cada punto de la flota a su función
  NODES.forEach((n, i) => {
    emitters(t, n.delay, 8.6, 2.6, 1.3, (p) => signal(ctx, n.line, p, n.c, 0.95 * g, 60, 9));
    emitters(t, n.delay - 0.5, 9.2, 1.7, 1.5, (p) => sonar(ctx, n.x, n.y, p, 6, 38, 2.4, n.c, 0.8 * g));
    glowDot(ctx, n.x, n.y, 15 + 3 * Math.sin(t * 4 + i), n.c, 0.55 * g);
  });

  // Píldoras: latido del borde + destello al llegar la señal
  PILLS.forEach((p, i) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 2.1);
    glowRect(ctx, p.x, p.y, p.w, p.h, p.r, p.c, (0.25 + 0.4 * pulse) * g, 2.5, 16);
    emitters(t, NODES[i].delay + 1.0, 8.8, 2.6, 1.0, (q) => sheen(ctx, p.x, p.y, p.w, p.h, p.r, q, 0.5 * g));
  });

  // Destello en la barra verde
  const barP = (t - 5.2) / 2.2;
  sheen(ctx, 0, 1183, DW, 50, 0, barP, 0.42 * g);
  // Un segundo, más corto, en el primer tramo del ciclo
  sheen(ctx, 0, 1183, DW, 50, 0, (t - 1.4) / 1.8, 0.3 * g);

  // Centelleos en el logotipo
  sparkle(ctx, 243, 99, 22, WHITE, 0.95 * g * env(t, 2.0, 2.4, 2.6, 3.2));
  sparkle(ctx, 779, 102, 20, WHITE, 0.9 * g * env(t, 4.8, 5.2, 5.4, 6.0));
  sparkle(ctx, 598, 135, 16, WHITE, 0.8 * g * env(t, 6.8, 7.1, 7.3, 7.9));

  ctx.restore();
}

const load = () => Promise.resolve();

global.AgroLinkAnim = { WIDTH: W, HEIGHT: H, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
