/* enerscope · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
(function (global) {
'use strict';
/*
 * Utilidades compartidas por las capas Canvas de los pósters (ver PROYECTOS en construir.mjs).
 * Se concatenan delante del código de cada animación (ver recursos-fuente/construir.mjs).
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

/**
 * Marco del contexto: aplica la escala de diseño → píxeles del póster. Si la animación declara
 * `const MARGEN = 0.3` (fracción por lado), el lienzo es más grande que el póster y el origen se corre
 * al borde del póster: las coordenadas de diseño siguen siendo las del póster y lo negativo o mayor
 * que DW/DH queda "afuera del papel".
 */
function begin(ctx, W, H, DW, DH) {
  ctx.save();
  const m = typeof MARGEN !== 'undefined' ? MARGEN : 0;
  if (m) ctx.translate(W * m, H * m);
  ctx.scale(W / DW, H / DH);
}

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

/**
 * Aplica al contexto la transformación de una pieza: desplaza (dx, dy), rota `rot` y escala (sx, sy)
 * alrededor del pivote (px, py). Sirve para dibujar piezas anidadas (ojos dentro de una cabeza que se mueve).
 */
function pivotar(ctx, px, py, dx = 0, dy = 0, rot = 0, sx = 1, sy = sx) {
  ctx.translate(px + dx, py + dy); if (rot) ctx.rotate(rot); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy); ctx.translate(-px, -py);
}

/** Sprite con escala no uniforme: o = { dx, dy, sx, sy, rot, a, px, py }. */
function spriteT(ctx, name, o = {}) {
  const s = SPR[name], a = o.a ?? 1; if (!s || a <= 0.003) return;
  ctx.save();
  pivotar(ctx, o.px ?? s.x + s.w / 2, o.py ?? s.y + s.h / 2, o.dx, o.dy, o.rot, o.sx ?? 1, o.sy ?? o.sx ?? 1);
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

/* ------------------------------------------------------------------------------------------------
 * "Salir del papel": un recorte se despega del póster. Deja su hueco (sombra interior, como un
 * recorte en el papel) y, mientras está levantado, proyecta sombra sobre el póster o la pared.
 * Requiere que construir.mjs haya generado <base>Hueco y <base>Sombra ("sombras": true).
 * ---------------------------------------------------------------------------------------------- */

/**
 * o = { dx, dy, sx, sy, rot, px, py, a } como en spriteT, más:
 *   alto: 0..1 cuánto se levantó (sombra más corrida y difusa), hueco: 0..1 opacidad del hueco,
 *   base: nombre de las sombras si difiere del recorte.
 */
function despegar(ctx, name, o = {}) {
  const s = SPR[name]; if (!s) return;
  const base = o.base ?? name, alto = clamp(o.alto ?? 0), a = o.a ?? 1;
  if ((o.hueco ?? 0) > 0.01) sprite(ctx, base + 'Hueco', 0, 0, 1, 0, o.hueco); // el hueco queda aunque el recorte no se vea
  const px = o.px ?? s.x + s.w / 2, py = o.py ?? s.y + s.h / 2;
  if (alto > 0.01 && SPR[base + 'Sombra']) {
    spriteT(ctx, base + 'Sombra', { ...o, px, py, dx: (o.dx ?? 0) + 16 * alto, dy: (o.dy ?? 0) + 26 * alto, a: a * Math.min(1, alto * 1.6) * 0.85 });
  }
  spriteT(ctx, name, { ...o, px, py });
}

/** Paso de caminata (títere de papel): rebote vertical y balanceo. f = pasos por segundo. */
function caminata(t, f = 2.2, amp = 1) {
  const fase = t * f * Math.PI;
  return { bote: -Math.abs(Math.sin(fase)) * 9 * amp, balanceo: Math.sin(fase) * 0.07 * amp };
}

/** Sombra elíptica en el "piso" (pies de quien camina fuera del papel). */
function sombraPiso(ctx, x, y, w, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.22);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  g.addColorStop(0, `rgba(0,0,0,${clamp(a * 0.45)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, TAU); ctx.fill(); ctx.restore();
}

/** Recorrido con dirección: at(s) → { x, y, dx, dy } (dx, dy: dirección unitaria). */
function recorrido(points) {
  const pl = polyline(points);
  return {
    total: pl.total,
    at(s) {
      const [x, y] = pl.at(s), [x0, y0] = pl.at(s - 4), [x1, y1] = pl.at(s + 4);
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      return { x, y, dx: (x1 - x0) / l, dy: (y1 - y0) / l };
    },
  };
}

/** Redondea las esquinas de un recorrido poligonal (para giros suaves). */
function esquinasSuaves(points, r = 80, pasos = 6) {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i], [cx, cy] = points[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), rr = Math.min(r, l1 / 2, l2 / 2);
    const p0 = [bx + (ax - bx) * rr / l1, by + (ay - by) * rr / l1], p2 = [bx + (cx - bx) * rr / l2, by + (cy - by) * rr / l2];
    for (let k = 0; k <= pasos; k++) {
      const u = k / pasos, v = 1 - u;
      out.push([v * v * p0[0] + 2 * v * u * bx + u * u * p2[0], v * v * p0[1] + 2 * v * u * by + u * u * p2[1]]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

const SPRITES_SRC = {"barco":{"x":452,"y":486,"w":538,"h":418,"pw":579,"ph":450,"feather":[0,0,0,9],"src":"data:image/webp;base64,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"},"fondoBarco":{"x":440,"y":478,"w":550,"h":432,"pw":296,"ph":233,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"reflejo":{"x":452,"y":884,"w":538,"h":126,"pw":579,"ph":136,"feather":[26,3,0,34],"src":"data:image/jpeg;base64,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"}};
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

const _M = typeof MARGEN !== 'undefined' ? MARGEN : 0;
global.EnerScopeAnim = { WIDTH: W * (1 + 2 * _M), HEIGHT: H * (1 + 2 * _M), MARGIN: _M, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
