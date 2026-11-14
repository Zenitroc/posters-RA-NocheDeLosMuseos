/* learn-to-lead · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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

const SPRITES_SRC = {"varita":{"x":430,"y":80,"w":290,"h":290,"pw":331,"ph":331,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"fondoVarita":{"x":420,"y":70,"w":310,"h":310,"pw":177,"ph":177,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"}};
/*
 * Learn To Lead · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * La figura es un director de orquesta: su batuta (recorte real del póster, sobre una placa limpia) marca
 * un compás de 4/4 girando desde la mano. En cada tiempo la punta suelta música: un pentagrama que
 * ondula hacia arriba y sale del papel con las notas de la melodía, notas sueltas que flotan y ondas de
 * sonido. Los cuadros 1·2·3·4 (SIMULA, CREA, ANALIZA, MEJORA) se encienden cada uno en su tiempo.
 * El lienzo se extiende un 30 % por lado (MARGEN): el pentagrama y las notas siguen sobre la pared.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10, MARGEN = 0.3;
const NAVY = [9, 54, 74], TEAL = [24, 95, 117], MINT = [110, 200, 188], CLARO = [205, 244, 238], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

/* ---------------------------------------------------------------- batuta */

const PIVOTE = [521, 277], PUNTA = [683, 112];   // la mano que la sostiene y la punta en reposo (el póster)
const T0 = 1.2, TIEMPO = 0.5, TIEMPOS = 16;       // 4 compases de 4/4 a 120 por minuto
const FUERZA = [1, 0.6, 0.78, 0.55];              // el 1 de cada compás es el más marcado
const GIRO = 0.3;                                 // rad en el tiempo fuerte (≈ 17°), siempre hacia abajo

/** Giro de la batuta sin envolvente: cae acelerando a cada tiempo (ictus) y rebota hacia arriba. */
function marcar(t) {
  const k = (t - T0) / TIEMPO, i = Math.floor(k), p = k - i;
  const fuerza = j => (j < 0 || j >= TIEMPOS ? 0 : FUERZA[j % 4]);
  const rebote = p < 0.42 ? fuerza(i) * Math.pow(1 - p / 0.42, 2) : 0;
  const caida = p > 0.42 ? fuerza(i + 1) * Math.pow((p - 0.42) / 0.58, 2.2) : 0;
  return GIRO * (rebote + caida);
}
const giro = t => marcar(t) * G(t);

/** Posición de la punta para un giro dado. */
function punta(rot) {
  const vx = PUNTA[0] - PIVOTE[0], vy = PUNTA[1] - PIVOTE[1], c = Math.cos(rot), s = Math.sin(rot);
  return [PIVOTE[0] + vx * c - vy * s, PIVOTE[1] + vx * s + vy * c];
}

/* ---------------------------------------------------------------- notas */

/**
 * Figura musical dibujada a mano (sin depender de fuentes): `tipo` = 'negra' | 'corchea' | 'doble'
 * (dos corcheas unidas). (x, y) = centro de la cabeza; la plica sube hacia -y local; `rot` gira todo.
 */
function nota(ctx, x, y, s, tipo, color, a, rot = 0) {
  if (a <= 0.01 || s <= 0.01) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = rgba(color, a); ctx.strokeStyle = rgba(color, a);
  const cabeza = (cx, cy) => { ctx.beginPath(); ctx.ellipse(cx, cy, 4.7, 3.3, -0.38, 0, TAU); ctx.fill(); };
  const plica = (cx, cy, alto) => { ctx.fillRect(cx + 3.4, cy - alto, 1.5, alto); };
  if (tipo === 'doble') {
    cabeza(0, 0); cabeza(13, -3);
    plica(0, 0, 18); plica(13, -3, 18);
    ctx.beginPath(); ctx.moveTo(3.4, -18); ctx.lineTo(17.9, -21); ctx.lineTo(17.9, -16.6); ctx.lineTo(3.4, -13.6); ctx.closePath(); ctx.fill();
  } else {
    cabeza(0, 0); plica(0, 0, 19);
    if (tipo === 'corchea') {
      ctx.beginPath(); ctx.moveTo(4.9, -19);
      ctx.bezierCurveTo(6.5, -13, 12.5, -12, 10.5, -4.5);
      ctx.bezierCurveTo(10.6, -10, 7, -11.5, 4.9, -13.5);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

/** Nota con halo claro (para que se lea como luz sobre el papel o la pared). */
function notaLuz(ctx, x, y, s, tipo, color, a, rot) {
  if (a <= 0.01) return;
  ctx.save(); ctx.shadowColor = rgba(CLARO, a); ctx.shadowBlur = 10 * s;
  nota(ctx, x, y, s, tipo, color, a, rot);
  ctx.restore();
}

/* ---------------------------------------------------------------- pentagrama */

const ESP = 12; // separación entre líneas
// Sale de la punta, cruza la esquina superior derecha del póster ondulando y sigue por la pared
const CAMINO = recorrido(esquinasSuaves([[690, 104], [770, 150], [870, 170], [950, 120], [1030, 60], [1140, 40], [1290, -30]], 80, 10));
const MELODIA = [ // [posición en el pentagrama (0 = 1.ª línea … 8 = 5.ª línea), figura] por tiempo
  [2, 'negra'], [4, 'corchea'], [6, 'negra'], [5, 'doble'],
  [4, 'negra'], [6, 'corchea'], [8, 'negra'], [7, 'doble'],
  [6, 'negra'], [4, 'doble'], [3, 'corchea'], [5, 'negra'],
  [7, 'doble'], [6, 'corchea'], [4, 'negra'], [2, 'negra'],
];
const VEL = 165; // unidades por segundo a lo largo del pentagrama

/** Punto del pentagrama: s a lo largo, `alto` sobre la línea central; el comienzo sigue a la punta. */
function enPentagrama(t, s, alto, tip) {
  const p = CAMINO.at(s), nx = p.dy, ny = -p.dx;      // normal "hacia arriba" del pentagrama
  const abre = smooth(0, 130, s);                       // las líneas nacen juntas en la punta y se abren
  const onda = 16 * Math.sin(s / 80 - t * 2.6) * abre;
  const pega = 1 - smooth(0, 150, s);                   // el arranque acompaña a la batuta
  const o = onda + alto * (0.15 + 0.85 * abre);
  return {
    x: p.x + nx * o + (tip[0] - PUNTA[0]) * pega,
    y: p.y + ny * o + (tip[1] - PUNTA[1]) * pega,
    ang: Math.atan2(p.dy, p.dx),
  };
}

function pentagrama(ctx, t, g, tip) {
  const largo = CAMINO.total * easeInOut((t - 0.7) / 1.8);
  if (largo < 4 || g <= 0.003) return;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const alto = (i - 2) * ESP;
    let prev = enPentagrama(t, 0, alto, tip);
    for (let s = 8; s <= largo; s += 8) {
      const q = enPentagrama(t, s, alto, tip);
      const a = g * 0.8 * smooth(0, 40, s) * (1 - smooth(CAMINO.total - 160, CAMINO.total, s)) * (0.4 + 0.6 * smooth(largo, largo - 60, s));
      if (a > 0.004) {
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y);
        ctx.lineWidth = 2.4; ctx.strokeStyle = rgba(TEAL, a); ctx.stroke();
      }
      prev = q;
    }
  }
  // Clave de sol estilizada al comienzo, cuando el pentagrama ya se abrió
  const cs = enPentagrama(t, 165, 0, tip);
  claveSol(ctx, cs.x, cs.y, cs.ang, NAVY, g * 0.9 * smooth(1.4, 2.2, t), 1.45);

  // Notas de la melodía: cada tiempo suelta una que viaja por el pentagrama
  for (let i = 0; i < TIEMPOS; i++) {
    const tb = T0 + i * TIEMPO, s = (t - tb) * VEL + 60;
    if (t < tb || s > CAMINO.total) continue;
    const [pos, tipo] = MELODIA[i];
    const q = enPentagrama(t, s, (pos - 4) * ESP / 2, tip);
    const a = g * smooth(60, 110, s) * (1 - smooth(CAMINO.total - 200, CAMINO.total - 20, s));
    const pop = 1 + 0.35 * (1 - easeOut((t - tb) / 0.35));
    notaLuz(ctx, q.x, q.y, 1.85 * pop, tipo, i % 4 === 0 ? NAVY : TEAL, a, q.ang);
  }
}

/** Clave de sol simplificada (espiral + trazo vertical). */
function claveSol(ctx, x, y, rot, color, a, s = 1) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.strokeStyle = rgba(color, a); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(2, 26); ctx.bezierCurveTo(-6, 28, -6, 20, 0, 20);
  ctx.lineTo(4, -26);
  ctx.bezierCurveTo(5, -34, 12, -30, 8, -22);
  ctx.bezierCurveTo(4, -14, -10, -8, -10, 4);
  ctx.bezierCurveTo(-10, 14, 8, 14, 9, 4);
  ctx.bezierCurveTo(9, -4, -2, -6, -2, 2);
  ctx.stroke(); ctx.restore();
}

/* ---------------------------------------------------------------- cuadros 1·2·3·4 */

const CUADROS = [ // [x, y, w, h] del número y ancho del bloque con su texto
  [85.8, 815.8, 57, 70, 345], [480.6, 815.8, 55, 70, 410],
  [85.8, 953.2, 57, 71, 345], [480.6, 955, 55, 69, 410],
];

/* ---------------------------------------------------------------- render */

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }
  const rot = giro(t), tip = punta(rot);

  // ---- Halo que late con el compás detrás de la figura
  let latido = 0;
  for (let i = 0; i < TIEMPOS; i++) {
    const d = t - (T0 + i * TIEMPO);
    if (d >= 0 && d < 1) latido = Math.max(latido, Math.exp(-d / 0.22) * FUERZA[i % 4]);
  }
  blob(ctx, 640, 330, 240 + 30 * latido, MINT, g * (0.08 + 0.1 * latido));

  // ---- Cuadros 1·2·3·4: cada uno se enciende en su tiempo del compás
  for (let i = 0; i < TIEMPOS; i++) {
    const tb = T0 + i * TIEMPO, d = t - tb;
    if (d < -0.05 || d > 1.1) continue;
    const [x, y, w, h, bloque] = CUADROS[i % 4];
    const k = Math.exp(-Math.max(0, d) / 0.3) * smooth(-0.05, 0.02, d);
    glowRect(ctx, x - 4, y - 4, w + 8, h + 8, 6, MINT, g * k, 3, 18);
    sheen(ctx, x, y - 4, bloque, h + 8, 6, d / 0.7, 0.4 * g, CLARO);
  }

  // ---- Batuta: placa limpia (el póster sin la batuta) y la batuta real girando desde la mano
  sprite(ctx, 'fondoVarita');

  // Estela: el barrido de la mitad exterior de la batuta en los últimos instantes (sólo se nota si va rápido)
  const base = Math.atan2(PUNTA[1] - PIVOTE[1], PUNTA[0] - PIVOTE[0]), largo = Math.hypot(PUNTA[0] - PIVOTE[0], PUNTA[1] - PIVOTE[1]);
  const estela = ctx.createRadialGradient(PIVOTE[0], PIVOTE[1], largo * 0.45, PIVOTE[0], PIVOTE[1], largo + 4);
  estela.addColorStop(0, rgba(MINT, 0)); estela.addColorStop(0.75, rgba(MINT, 0.45)); estela.addColorStop(1, rgba(CLARO, 0.7));
  let ant = rot;
  for (let j = 1; j <= 8; j++) {
    const r = giro(t - j * 0.018);
    if (Math.abs(r - ant) > 0.002) {
      ctx.save(); ctx.globalAlpha = g * (1 - j / 9) * 0.8;
      ctx.beginPath(); ctx.moveTo(PIVOTE[0], PIVOTE[1]);
      ctx.arc(PIVOTE[0], PIVOTE[1], largo + 4, base + Math.min(r, ant), base + Math.max(r, ant));
      ctx.closePath(); ctx.fillStyle = estela; ctx.fill(); ctx.restore();
    }
    ant = r;
  }
  sprite(ctx, 'varita', 0, 0, 1, rot, 1, PIVOTE[0], PIVOTE[1]);

  // ---- Música
  pentagrama(ctx, t, g, tip);

  for (let i = 0; i < TIEMPOS; i++) {
    const tb = T0 + i * TIEMPO, d = t - tb;
    if (d < 0 || d > 2.8) continue;
    const pt = punta(giro(tb)); // donde estaba la punta en el golpe

    // Ondas de sonido desde la punta
    if (d < 0.9) {
      const p = d / 0.9;
      sonar(ctx, pt[0], pt[1], p, 6, 46 + 20 * FUERZA[i % 4], 2.2, MINT, 0.85 * g);
      if (i % 4 === 0) sonar(ctx, pt[0], pt[1], clamp(p * 1.3 - 0.15), 6, 80, 1.6, TEAL, 0.6 * g);
    }
    glowDot(ctx, pt[0], pt[1], 26, MINT, g * 0.7 * Math.exp(-d / 0.18));
    if (i % 4 === 0) sparkle(ctx, pt[0] + 4, pt[1] - 4, 22, WHITE, g * env(d, 0, 0.08, 0.2, 0.5));

    // Notas sueltas que flotan desde la punta (hacia arriba y a los costados, algunas a la pared)
    for (let n = 0; n < 2; n++) {
      const sem = i * 2 + n;
      const ang = -Math.PI / 2 + (rnd(sem, 1) - 0.6) * 2.2, vel = 70 + 60 * rnd(sem, 2);
      const vida = clamp(d / 2.8);
      const x = pt[0] + Math.cos(ang) * vel * d + 12 * Math.sin(d * 3.2 + sem);
      const y = pt[1] + Math.sin(ang) * vel * d - 16 * d * d;
      const tipo = ['corchea', 'negra', 'doble', 'corchea'][Math.floor(rnd(sem, 3) * 4)];
      const a = g * smooth(0.05 * n, 0.12 + 0.05 * n, d) * (1 - smooth(0.55, 1, vida));
      const tam = (2.1 + 1.1 * rnd(sem, 4)) * (0.4 + 0.6 * easeOut(d / 0.3));
      notaLuz(ctx, x, y, tam, tipo, rnd(sem, 5) < 0.5 ? TEAL : NAVY, a, 0.35 * Math.sin(d * 2.4 + sem));
    }
  }

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);

const _M = typeof MARGEN !== 'undefined' ? MARGEN : 0;
global.LearnToLeadAnim = { WIDTH: W * (1 + 2 * _M), HEIGHT: H * (1 + 2 * _M), MARGIN: _M, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
