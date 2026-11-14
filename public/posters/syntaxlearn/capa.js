/* syntaxlearn · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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

const SPRITES_SRC = {};
/*
 * SyntaxLearn · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Celebra el 1.er puesto en el CoNaIISI 2026: una escarapela dorada con laureles llega con un estallido de
 * papelitos junto al QR (sin taparlo) y queda balanceándose. El producto cobra vida: el autómata procesa la
 * cadena "ab" (q0 → q1 → q2) y la acepta, el roadmap avanza hacia los temas habilitados, aparece la pista de
 * la IA tras un error, el verificador marca la no equivalencia y se encienden los pasos "Cómo funciona".
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 12;
const CIAN = [90, 175, 255], VERDE = [80, 220, 140], VIOLETA = [185, 125, 255], AMBAR = [255, 180, 60], ROJO = [245, 95, 95];
const BLANCO = [255, 255, 255], FONDO = [12, 22, 46];
const ORO = [238, 186, 64], ORO_CLARO = [255, 230, 150], ORO_OSCURO = [176, 122, 26];
const G = t => env(t, 0.3, 1.0, 10.8, 11.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

/* ---------------------------------------------------------------- escarapela del 1.er puesto */

const MEDALLA = [845, 188], R = 56, LLEGA = 0.7;

/** Muelle amortiguado: 0 → 1 con un pequeño rebote (p en segundos desde el inicio). */
function resorte(p) {
  if (p <= 0) return 0;
  return 1 - Math.exp(-6 * p) * Math.cos(9 * p);
}

/** Hoja de laurel (elipse en punta) en el ángulo dado. */
function hoja(ctx, ang, r, s) {
  ctx.save(); ctx.rotate(ang); ctx.translate(r, 0); ctx.rotate(Math.PI / 2 + 0.5 * s);
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(5, 0, 0, 9); ctx.quadraticCurveTo(-5, 0, 0, -9); ctx.fill();
  ctx.restore();
}

function escarapela(ctx, t, g) {
  const k = resorte(t - LLEGA);
  if (k <= 0.001 || g <= 0.002) return;
  const [cx, cy] = MEDALLA;
  const mece = 0.045 * Math.sin((t - LLEGA) * 1.6) * smooth(LLEGA, LLEGA + 1.5, t);
  ctx.save();
  ctx.globalAlpha = clamp(g * smooth(LLEGA, LLEGA + 0.2, t));
  ctx.translate(cx, cy - (1 - k) * 60);
  ctx.rotate(mece + (1 - k) * 0.9);
  ctx.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k);

  // Cintas (azul y cian del póster, con borde dorado)
  for (const s of [-1, 1]) {
    ctx.save(); ctx.rotate(s * 0.3 + 0.04 * Math.sin(t * 2.2 + s));
    ctx.beginPath();
    ctx.moveTo(-15, 22); ctx.lineTo(15, 22); ctx.lineTo(15, R + 48); ctx.lineTo(0, R + 36); ctx.lineTo(-15, R + 48); ctx.closePath();
    ctx.fillStyle = s < 0 ? 'rgb(40,105,230)' : 'rgb(50,195,235)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(ORO, 1); ctx.stroke();
    ctx.restore();
  }
  // Halo
  blob(ctx, 0, 0, R * 2.1, ORO_CLARO, 0.32 * (0.7 + 0.3 * Math.sin(t * 3)));
  // Borde festoneado dorado
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const ang = (i / 96) * TAU, r = R + 5.5 * Math.cos(ang * 24);
    if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r); else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  ctx.closePath();
  const go = ctx.createLinearGradient(-R, -R, R, R);
  go.addColorStop(0, rgba(ORO_CLARO, 1)); go.addColorStop(0.5, rgba(ORO, 1)); go.addColorStop(1, rgba(ORO_OSCURO, 1));
  ctx.fillStyle = go; ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5; ctx.fill();
  ctx.shadowColor = 'transparent';
  // Disco central con laureles
  ctx.beginPath(); ctx.arc(0, 0, R - 10, 0, TAU); ctx.fillStyle = rgba(FONDO, 1); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, R - 13, 0, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(ORO_CLARO, 0.85); ctx.stroke();
  ctx.fillStyle = rgba(ORO, 0.95);
  for (let i = 0; i < 6; i++) { // laureles a los costados (no tapan los textos)
    const a = Math.PI * (0.8 + i * 0.075);
    hoja(ctx, a, R - 17, -1); hoja(ctx, Math.PI - a, R - 17, 1);
  }
  // Estrella arriba
  ctx.save(); ctx.translate(0, -27); ctx.fillStyle = rgba(ORO_CLARO, 1);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.restore();
  // Textos
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = rgba(ORO_CLARO, 1);
  ctx.font = FUENTE(800, 32); ctx.fillText('1.º', 0, -5);
  ctx.font = FUENTE(800, 8.5); ctx.fillText('PRIMER PUESTO', 0, 17);
  ctx.fillStyle = '#fff'; ctx.font = FUENTE(700, 8); ctx.fillText('CoNaIISI 2026', 0, 29);
  // Brillo que cruza el disco
  const q = ((t - LLEGA - 0.6) % 3.0) / 1.0;
  if (q > 0 && q < 1) {
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R + 6, 0, TAU); ctx.clip();
    const bx = -R * 1.6 + q * R * 3.2, gb = ctx.createLinearGradient(bx - 22, -R, bx + 22, R);
    gb.addColorStop(0, 'rgba(255,255,255,0)'); gb.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gb.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gb; ctx.fillRect(-R - 8, -R - 8, 2 * R + 16, 2 * R + 16); ctx.restore();
  }
  ctx.restore();

  // Estallido de papelitos al llegar
  const d = t - LLEGA - 0.15;
  if (d > 0 && d < 2.2) {
    const COL = [ORO, ORO_CLARO, CIAN, [40, 105, 230], VERDE, VIOLETA];
    for (let i = 0; i < 34; i++) {
      const ang = rnd(i, 1) * TAU, v = 90 + 150 * rnd(i, 2);
      const x = cx + Math.cos(ang) * v * d * (1 - 0.25 * d);
      const y = cy + Math.sin(ang) * v * d * (1 - 0.25 * d) + 70 * d * d;
      const a = g * (1 - smooth(1.2, 2.2, d));
      ctx.save(); ctx.translate(x, y); ctx.rotate(d * (4 + 6 * rnd(i, 3)) + i);
      ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(d * 8 + i)));
      ctx.fillStyle = rgba(COL[i % COL.length], a); ctx.fillRect(-4, -2.5, 8, 5);
      ctx.restore();
    }
  }
  // Destellos alrededor de vez en cuando
  emitters(t, LLEGA + 0.2, 10.4, 2.4, 1.0, (p, i) => {
    for (let s = 0; s < 3; s++) {
      const ang = rnd(i, s + 5) * TAU, dd = R + 12 + 22 * p;
      sparkle(ctx, cx + Math.cos(ang) * dd, cy + Math.sin(ang) * dd, 9 * (1 - p) + 3, ORO_CLARO, g * Math.sin(Math.PI * p));
    }
  });
}

/* ---------------------------------------------------------------- producto */

const Q = { q0: [567.5, 620.6], q1: [637.5, 721], q2: [708.75, 600] };
const ARISTA_A = [[583, 646], [617.5, 697.5]], ARISTA_B = [[655, 696], [698.75, 629]];
const CORRIDAS = [1.6, 7.0]; // comienzo de cada corrida del autómata

/** Corrida del autómata con la cadena "ab": q0 → (a) → q1 → (b) → q2, aceptada. */
function automata(ctx, t, g) {
  CORRIDAS.forEach(t0 => {
    const d = t - t0;
    if (d < 0 || d > 4.2) return;
    const fin = 1 - smooth(3.4, 4.2, d);
    // Estados activos
    const activo = (q, a, b) => {
      const k = g * fin * env(d, a, a + 0.15, b, b + 0.3);
      if (k <= 0.01) return;
      ring(ctx, Q[q][0], Q[q][1], 30, 3.5, CIAN, k);
      glowDot(ctx, Q[q][0], Q[q][1], 48, CIAN, 0.35 * k);
    };
    activo('q0', 0, 0.75);
    activo('q1', 1.35, 1.95);
    // Ficha que viaja por las aristas
    const viaje = (arista, a, letra) => {
      const p = (d - a) / 0.6;
      if (p <= 0 || p >= 1) return;
      signal(ctx, polyline(arista), p, VERDE, g * fin, 40, 10);
      const [x0, y0] = arista[0], [x1, y1] = arista[1], e = easeInOut(p);
      ctx.save(); ctx.font = FUENTE(800, 15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(BLANCO, g * fin * Math.sin(Math.PI * p));
      ctx.fillText(letra, x0 + (x1 - x0) * e + 14, y0 + (y1 - y0) * e - 10); ctx.restore();
    };
    viaje(ARISTA_A, 0.7, 'a');
    viaje(ARISTA_B, 1.9, 'b');
    // q2 (final) acepta
    const ka = g * fin * smooth(2.5, 2.7, d);
    if (ka > 0.01) {
      ring(ctx, Q.q2[0], Q.q2[1], 30, 3.5, VERDE, ka);
      ring(ctx, Q.q2[0], Q.q2[1], 23, 2.5, VERDE, ka);
      glowDot(ctx, Q.q2[0], Q.q2[1], 52, VERDE, 0.35 * ka);
      emitters(t, t0 + 2.5, t0 + 2.6, 5, 1.0, p => sonar(ctx, Q.q2[0], Q.q2[1], p, 30, 70, 3, VERDE, 0.85 * g));
      glowRect(ctx, 768, 644, 167.6, 40, 5, VERDE, ka * (0.6 + 0.4 * Math.sin((d - 2.5) * 6)), 3, 16);
      sheen(ctx, 768, 644, 167.6, 40, 5, (d - 2.6) / 0.8, 0.5 * g, [190, 255, 210]);
    }
    // Cadena "ab": cada letra se marca al consumirse
    [[0.7, 0], [1.9, 1]].forEach(([a, i]) => {
      const k = g * fin * smooth(a, a + 0.1, d);
      ctx.fillStyle = rgba(VERDE, 0.22 * k); ctx.fillRect(779 + i * 9.5, 616, 9.5, 17);
    });
  });
}

function roadmap(ctx, t, g) {
  // Del tema completado hacia los habilitados
  emitters(t, 1.2, 10.2, 3.0, 1.0, p => {
    signal(ctx, polyline([[692.5, 371], [622.5, 400]]), p, VERDE, g, 30, 8);
    signal(ctx, polyline([[692.5, 371], [769, 394]]), p, VERDE, g, 30, 8);
  });
  // En progreso late; refuerzo IA titila en violeta
  glowRect(ctx, 729, 402, 112, 40, 2, CIAN, g * (0.35 + 0.35 * Math.sin(t * 3)), 2.5, 14);
  glowRect(ctx, 789, 324, 133.5, 46.6, 2, VIOLETA, g * (0.3 + 0.3 * Math.sin(t * 2.2 + 1)), 2.5, 14);
  sparkle(ctx, 915, 326, 10, VIOLETA, g * env(t, 3.0, 3.3, 3.6, 4.2));
  sparkle(ctx, 915, 326, 10, VIOLETA, g * env(t, 8.4, 8.7, 9.0, 9.6));
}

function leccion(ctx, t, g) {
  [2.4, 7.8].forEach(t0 => {
    // Respuesta equivocada: el recuadro rojo parpadea…
    const ke = g * env(t, t0, t0 + 0.15, t0 + 0.9, t0 + 1.3);
    glowRect(ctx, 509, 830, 91.6, 22.5, 3, ROJO, ke * (0.6 + 0.4 * Math.sin(t * 14)), 2.5, 12);
    // …y la IA ofrece la pista
    const kp = g * env(t, t0 + 1.0, t0 + 1.4, t0 + 3.4, t0 + 4.2);
    glowRect(ctx, 505.6, 863, 426.4, 78, 4, CIAN, 0.8 * kp, 2.5, 18);
    sheen(ctx, 505.6, 863, 426.4, 78, 4, (t - t0 - 1.1) / 1.2, 0.3 * g, [180, 220, 255]);
    sparkle(ctx, 522.5, 880, 13, CIAN, kp);
  });
  // Verificador: "no es equivalente" late en ámbar
  [4.6, 9.4].forEach(t0 => {
    const k = g * env(t, t0, t0 + 0.2, t0 + 1.2, t0 + 1.8);
    glowRect(ctx, 690.6, 1030.6, 245, 50, 4, AMBAR, k * (0.65 + 0.35 * Math.sin((t - t0) * 9)), 3, 16);
  });
}

const PASOS = [478, 544.5, 608, 673, 737];
const PALABRAS = [[243, 844, 184], [283, 905, 144], [311, 969, 113], [293, 1030, 131]];

function izquierda(ctx, t, g) {
  // Cómo funciona: los cinco pasos se encienden en orden
  [1.0, 6.4].forEach(t0 => PASOS.forEach((y, i) => {
    const a = t0 + i * 0.55, k = g * env(t, a, a + 0.15, a + 0.5, a + 1.0);
    glowRect(ctx, 31, y - 14, 27, 28, 3, CIAN, k, 2.5, 14);
    sheen(ctx, 31, y - 16, 430, 34, 4, (t - a) / 0.9, 0.22 * g, [170, 210, 255]);
  }));
  // Personalizado · Interactivo · Trazable · Verificado
  PALABRAS.forEach(([x, y, w], i) => {
    [3.6, 9.0].forEach(t0 => sheen(ctx, x - 6, y - 18, w + 12, 36, 6, (t - t0 - i * 0.45) / 0.8, 0.5 * g));
  });
  // Estrellitas alrededor de la notebook
  for (let i = 0; i < 9; i++) {
    const x = 18 + rnd(i, 1) * 170, y = 815 + rnd(i, 2) * 245, per = 1.4 + rnd(i, 3) * 1.4, q = ((t + rnd(i, 4) * per) % per) / per;
    sparkle(ctx, x, y, 7 + 5 * rnd(i, 5), [255, 240, 200], g * 0.9 * Math.pow(Math.sin(Math.PI * q), 3));
  }
  // Rayos de "Aprender haciendo"
  glowDot(ctx, 350, 285, 40, AMBAR, g * 0.22 * (0.6 + 0.4 * Math.sin(t * 2.6)));
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }
  izquierda(ctx, t, g);
  roadmap(ctx, t, g);
  automata(ctx, t, g);
  leccion(ctx, t, g);
  // Pregunta final
  sheen(ctx, 141, 1172, 705, 46, 8, (t - 5.4) / 1.4, 0.45 * g);
  escarapela(ctx, t, g);
  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);

const _M = typeof MARGEN !== 'undefined' ? MARGEN : 0;
global.SyntaxLearnAnim = { WIDTH: W * (1 + 2 * _M), HEIGHT: H * (1 + 2 * _M), MARGIN: _M, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
