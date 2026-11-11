/* victoriax · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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
 * VictoriaX · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Idea: dos corrientes de luz (aprendizaje azul, simulación rosa) convergen en la X central,
 * que irradia ondas; los hitos del camino y el diagrama se encienden en secuencia.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const BLUE = [70, 140, 255], PINK = [245, 80, 200], VIOLET = [150, 100, 245], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);
const CX = 493, CY = 572;

const CHECKS = [[196, 466], [250, 528], [196, 617], [262, 688], [268, 750]];
const FLOW = [[700, 351], [735, 392], [765, 432], [770, 488], [858, 512], [792, 540], [846, 582]];
const BOTTOM = [[126, 1035], [126, 1128], [503, 1035], [503, 1128]];
const STREAMS = (() => { // partículas de las dos corrientes
  const a = []; let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) a.push({ side: i % 2 ? 1 : -1, off: (rnd() - 0.5) * 2, ph: rnd(), sp: 0.16 + rnd() * 0.14, sz: 2.5 + rnd() * 3 });
  return a;
})();

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // Corrientes de luz hacia la X
  STREAMS.forEach(p => {
    const q = (t * p.sp + p.ph) % 1;
    const startX = CX + p.side * 330, x = startX + (CX + p.side * 30 - startX) * easeInOut(q);
    const y = CY + p.off * (62 * (1 - 0.88 * q)) + Math.sin(t * 2 + p.ph * 9) * 4 * (1 - q);
    const a = Math.sin(Math.PI * q) * 0.9 * g;
    glowDot(ctx, x, y, p.sz * 3.2, p.side < 0 ? BLUE : PINK, a);
  });

  // Ondas desde la X (azul → rosa)
  emitters(t, 0.8, 8.8, 1.7, 2.2, (p) => {
    const r = 50 + 200 * easeOut(p), a = (1 - p) * 0.6 * g;
    const gr = ctx.createLinearGradient(CX - r, 0, CX + r, 0);
    gr.addColorStop(0, rgba(BLUE, a)); gr.addColorStop(0.5, rgba(VIOLET, a)); gr.addColorStop(1, rgba(PINK, a));
    ctx.beginPath(); ctx.arc(CX, CY, r, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = gr; ctx.stroke();
  });
  glowDot(ctx, CX, CY, 110 + 18 * Math.sin(t * 3), VIOLET, 0.28 * g);
  sparkle(ctx, CX, CY - 4, 46, WHITE, 0.9 * g * (0.55 + 0.45 * Math.sin(t * 2.4)));

  // Camino de aprendizaje: hitos que se activan en orden
  CHECKS.forEach(([x, y], i) => {
    const t0 = 1.2 + i * 0.7;
    emitters(t, t0, 8.6, 4.2, 1.3, (p) => sonar(ctx, x, y, p, 16, 44, 2.6, BLUE, 0.9 * g));
    glowDot(ctx, x, y, 26, BLUE, 0.4 * g * env(t, t0, t0 + 0.3, t0 + 0.7, t0 + 1.3));
  });

  // Diagrama de flujo: nodos en secuencia
  FLOW.forEach(([x, y], i) => {
    const t0 = 1.4 + i * 0.6;
    emitters(t, t0, 8.6, 4.4, 1.2, (p) => sonar(ctx, x, y, p, 10, 40, 2.4, PINK, 0.9 * g));
    glowDot(ctx, x, y, 30, PINK, 0.4 * g * env(t, t0, t0 + 0.3, t0 + 0.7, t0 + 1.3));
  });

  // Gráficos: barra/línea con destello
  sparkle(ctx, 880, 650, 20, WHITE, 0.95 * g * env(t, 3.0, 3.4, 3.7, 4.3));
  sparkle(ctx, 910, 628, 16, WHITE, 0.95 * g * env(t, 6.0, 6.4, 6.7, 7.3));
  sparkle(ctx, 880, 780, 20, VIOLET, 0.95 * g * env(t, 4.6, 5.0, 5.3, 5.9));

  // Pilares inferiores
  BOTTOM.forEach(([x, y], i) => {
    const t0 = 5.2 + i * 0.5, col = i % 2 ? PINK : BLUE;
    emitters(t, t0, t0 + 0.1, 9, 1.3, (p) => sonar(ctx, x, y, p, 36, 64, 2.6, col, 0.85 * g));
  });

  // Código QR
  glowRect(ctx, 845, 1012, 145, 153, 22, VIOLET, g * env(t, 7.4, 7.8, 8.4, 9.1) * 0.95, 3.5, 20);
  sheen(ctx, 845, 1012, 145, 153, 22, (t - 7.2) / 1.5, 0.45 * g);

  ctx.restore();
}

const load = () => Promise.resolve();

global.VictoriaXAnim = { WIDTH: W, HEIGHT: H, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
