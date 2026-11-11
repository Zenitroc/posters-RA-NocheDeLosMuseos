/* infrabot · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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
 * INFRABOT · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Idea: el flujo del reclamo se recorre paso a paso (detecta → analiza → presupuesta → coordina),
 * el robot y los íconos emiten señal, la ciudad se conecta por wifi y los beneficios se encienden.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const TEAL = [30, 190, 190], NAVY = [60, 120, 230], GREEN = [60, 200, 110], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

const STEPS = [ // x, y, w, h, centro del ícono
  { x: 458, y: 354, w: 532, h: 71, ic: [482, 389] },
  { x: 458, y: 468, w: 532, h: 72, ic: [482, 504] },
  { x: 458, y: 580, w: 532, h: 72, ic: [482, 621] },
  { x: 458, y: 692, w: 532, h: 72, ic: [482, 727] },
];
const BENEF = [[70, 905], [255, 905], [442, 905], [612, 905]];

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // Flujo del reclamo: cada paso se ilumina en orden
  STEPS.forEach((s, i) => {
    const t0 = 0.9 + i * 1.35, k = t - t0;
    const act = env(k, 0, 0.3, 1.0, 1.7);
    glowRect(ctx, s.x, s.y, s.w, s.h, 35, NAVY, 0.9 * act * g, 3, 18);
    sheen(ctx, s.x, s.y, s.w, s.h, 35, k / 1.2, 0.5 * g);
    emitters(t, t0, t0 + 0.1, 9, 1.2, (p) => sonar(ctx, s.ic[0], s.ic[1], p, 22, 46, 2.4, NAVY, 0.8 * g));
    glowDot(ctx, s.ic[0], s.ic[1], 34, NAVY, 0.28 * act * g);
    // señal que baja al siguiente paso
    if (i < 3) {
      const path = polyline([[s.ic[0], s.ic[1] + 26], [s.ic[0] - 6, STEPS[i + 1].ic[1] - 26]]);
      signal(ctx, path, (t - (t0 + 0.9)) / 0.8, TEAL, 0.9 * g, 40, 8);
    }
  });
  // Resolución: tilde verde
  emitters(t, 4.9, 8.6, 2.2, 1.4, (p) => sonar(ctx, 684, 741, p, 10, 34, 2.4, GREEN, 0.9 * g));
  glowDot(ctx, 684, 741, 22, GREEN, 0.5 * g * env(t, 4.9, 5.3, 8.2, 8.8));

  // Robot: chispas alrededor y wifi sobre su cabeza
  sparkle(ctx, 150, 430, 18, WHITE, 0.95 * g * env(t, 1.2, 1.6, 1.9, 2.5));
  sparkle(ctx, 330, 560, 16, WHITE, 0.95 * g * env(t, 3.3, 3.7, 4.0, 4.6));
  sparkle(ctx, 120, 650, 17, WHITE, 0.95 * g * env(t, 5.6, 6.0, 6.3, 6.9));
  sparkle(ctx, 305, 440, 15, WHITE, 0.95 * g * env(t, 7.2, 7.6, 7.9, 8.5));
  wifi(ctx, 133, 402, t, 0.8, 9.0, TEAL, 0.9 * g, 1.2, 1.8);

  // Íconos flotantes: WhatsApp, ubicación, reproducir, mensaje
  [[375, 458, 28, 1.0], [401, 648, 26, 2.0], [45, 575, 24, 3.0], [80, 667, 28, 4.0]].forEach(([x, y, r, off]) => {
    emitters(t, off, 8.8, 4.0, 1.4, (p) => sonar(ctx, x, y, p, r, r + 26, 2.4, TEAL, 0.75 * g));
  });

  // Ciudad: señal wifi sobre los edificios
  wifi(ctx, 559, 1042, t, 1.0, 9.0, NAVY, 0.9 * g, 1.1, 2.0);
  wifi(ctx, 921, 1000, t, 2.0, 9.0, NAVY, 0.9 * g, 1.1, 2.0);
  wifi(ctx, 578, 1163, t, 3.0, 9.0, NAVY, 0.9 * g, 1.1, 2.0);

  // Beneficios: se encienden de izquierda a derecha
  BENEF.forEach(([x, y], i) => {
    const t0 = 5.6 + i * 0.6;
    emitters(t, t0, t0 + 0.1, 9, 1.3, (p) => sonar(ctx, x, y, p, 18, 44, 2.6, GREEN, 0.85 * g));
    glowDot(ctx, x, y, 28, GREEN, 0.3 * g * env(t, t0, t0 + 0.3, t0 + 0.8, t0 + 1.4));
  });

  // Recuadro de WhatsApp
  glowRect(ctx, 68, 1036, 327, 107, 6, WHITE, g * env(t, 7.8, 8.2, 8.6, 9.2) * 0.9, 3, 18);
  sheen(ctx, 68, 1036, 327, 107, 6, (t - 7.6) / 1.4, 0.35 * g);

  ctx.restore();
}

const load = () => Promise.resolve();

global.InfrabotAnim = { WIDTH: W, HEIGHT: H, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
