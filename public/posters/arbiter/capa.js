/* arbiter · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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
 * Arbiter · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Idea: un barrido de análisis recorre la foto y cada documento detectado se ilumina (cajas y
 * etiquetas); los riesgos (fraude, documento falso) se marcan en rojo/ámbar.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const TEAL = [40, 235, 215], RED = [255, 80, 70], AMBER = [255, 185, 50], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 0.9, 9.0, 9.7);

// quad: 4 esquinas del recuadro; lab: [x, y, w, h] de la etiqueta; c: color; t0: instante de detección
const DOCS = [
  { quad: [[410, 252], [468, 249], [480, 352], [418, 358]], lab: [420, 225, 160, 19], c: TEAL, t0: 1.3 },
  { quad: [[514, 281], [580, 286], [565, 389], [506, 383]], lab: [514, 254, 148, 19], c: TEAL, t0: 1.7 },
  { quad: [[666, 397], [740, 397], [740, 489], [666, 489]], lab: [666, 372, 195, 19], c: RED, t0: 2.1 },
  { quad: [[346, 460], [429, 471], [421, 531], [343, 522]], lab: [348, 437, 147, 19], c: TEAL, t0: 2.6 },
  { quad: [[486, 526], [584, 526], [584, 628], [486, 628]], lab: [490, 501, 233, 19], c: AMBER, t0: 3.0 },
  { quad: [[92, 543], [166, 530], [191, 670], [108, 686]], lab: [100, 510, 99, 19], c: TEAL, t0: 3.5 },
  { quad: [[606, 596], [650, 594], [657, 650], [612, 655]], lab: [612, 569, 178, 19], c: TEAL, t0: 3.9 },
  { quad: [[791, 654], [898, 662], [890, 733], [786, 722]], lab: [722, 631, 194, 19], c: RED, t0: 4.3 },
  { quad: [[163, 717], [344, 712], [344, 792], [163, 777]], lab: [164, 691, 200, 19], c: TEAL, t0: 4.8 },
];

function bracketQuad(ctx, q, color, a, len = 14) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(color, a); ctx.lineWidth = 3.2;
  for (let i = 0; i < 4; i++) {
    const p = q[i], n = q[(i + 1) % 4], pr = q[(i + 3) % 4];
    const d1 = Math.hypot(n[0] - p[0], n[1] - p[1]), d2 = Math.hypot(pr[0] - p[0], pr[1] - p[1]);
    ctx.beginPath();
    ctx.moveTo(p[0] + (pr[0] - p[0]) / d2 * len, p[1] + (pr[1] - p[1]) / d2 * len);
    ctx.lineTo(p[0], p[1]);
    ctx.lineTo(p[0] + (n[0] - p[0]) / d1 * len, p[1] + (n[1] - p[1]) / d1 * len);
    ctx.stroke();
  }
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // Barrido de análisis (baja y vuelve a subir)
  const sp = (t - 0.5) / 4.6;
  if (sp > 0 && sp < 1) {
    const yy = 135 + 760 * (sp < 0.5 ? sp * 2 : 2 - sp * 2), a = Math.sin(Math.PI * sp) * g;
    const gr = ctx.createLinearGradient(0, yy - 70, 0, yy + 4);
    gr.addColorStop(0, rgba(TEAL, 0)); gr.addColorStop(1, rgba(TEAL, 0.22 * a));
    ctx.fillStyle = gr; ctx.fillRect(0, yy - 70, DW, 74);
    ctx.save(); ctx.shadowColor = rgba(TEAL, a); ctx.shadowBlur = 16;
    ctx.fillStyle = rgba(TEAL, 0.9 * a); ctx.fillRect(0, yy, DW, 2); ctx.restore();
  }

  // Detección de cada documento
  DOCS.forEach((d, i) => {
    const k = t - d.t0;
    if (k < 0) return;
    const flash = env(k, 0, 0.25, 0.7, 1.6);            // destello inicial
    const hold = smooth(0.2, 0.7, k) * (1 - smooth(6.4 - d.t0 * 0.0, 8.8, t)); // marca sostenida
    const breath = 0.7 + 0.3 * Math.sin(t * 3 + i);
    const a = clamp(flash + hold * 0.55 * breath) * g;
    if (a <= 0.01) return;
    const q = d.quad;
    ctx.save();
    ctx.beginPath(); q.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.fillStyle = rgba(d.c, 0.22 * flash * g); ctx.fill();
    ctx.shadowColor = rgba(d.c, a); ctx.shadowBlur = 14;
    ctx.lineWidth = 2.4; ctx.strokeStyle = rgba(d.c, 0.9 * a); ctx.stroke();
    ctx.restore();
    bracketQuad(ctx, q, d.c, a);
    // etiqueta
    const [lx, ly, lw, lh] = d.lab;
    ctx.save();
    ctx.fillStyle = rgba(d.c, 0.28 * a); ctx.fillRect(lx - 4, ly - 3, lw + 8, lh + 6);
    ctx.shadowColor = rgba(d.c, a); ctx.shadowBlur = 10;
    ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(d.c, 0.9 * a); ctx.strokeRect(lx - 4, ly - 3, lw + 8, lh + 6);
    ctx.restore();
    // sonar del documento
    emitters(t, d.t0, d.t0 + 0.1, 5, 1.2, (p) => {
      const c = q.reduce((s, v) => [s[0] + v[0] / 4, s[1] + v[1] / 4], [0, 0]);
      sonar(ctx, c[0], c[1], p, 10, 70, 2, d.c, 0.7 * g);
    });
  });

  // Isotipo: destello en el asterisco y pulso del anillo
  sparkle(ctx, 200, 948, 30, WHITE, 0.95 * g * env(t, 5.4, 5.9, 6.2, 7.0));
  sparkle(ctx, 200, 948, 24, TEAL, 0.9 * g * env(t, 1.0, 1.4, 1.7, 2.3));
  emitters(t, 3.0, 8.4, 2.4, 1.6, (p) => sonar(ctx, 108, 1038, p, 6, 40, 2.2, TEAL, 0.7 * g));

  ctx.restore();
}

const load = () => Promise.resolve();

global.ArbiterAnim = { WIDTH: W, HEIGHT: H, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
