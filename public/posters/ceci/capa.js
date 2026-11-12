/* ceci · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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

const SPRITES_SRC = {"pareja":{"x":398,"y":392,"w":198,"h":214,"pw":226,"ph":244,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"fondoPareja":{"x":378,"y":360,"w":232,"h":240,"pw":133,"ph":137,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"corazonReloj":{"x":618,"y":806,"w":48,"h":48,"pw":55,"ph":55,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"}};
/*
 * CECI · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * La pareja de la ilustración se mece abrazada y le salen corazoncitos; el sol late. El celular "habla"
 * (ondas de voz) y sus tarjetas grises se convierten en mensajes reales de CECI que se escriben solos.
 * El corazón del reloj late con su pulso. Las seis funciones se encienden de a una (alternando lados) y
 * mandan una señal al celular o al reloj; cada ícono tiene su gesto (voz, alerta de caída, recordatorio,
 * chispas de la gimnasia mental, latido, escudo que brilla). Flotan lucecitas cálidas por el fondo.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const NAVY = [44, 72, 98], BLUE = [54, 106, 145], GREEN = [60, 120, 90], CORAL = [226, 110, 95], WARM = [255, 200, 120], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

// Funciones: píldora [x, y, w, h], ícono [x, y], color, destino de la señal, momento en que se enciende
const FUNCIONES = [
  { p: [52, 318, 243, 67], i: [88, 343], c: BLUE, a: [345, 351], t0: 1.0, gesto: 'voz' },
  { p: [705, 427, 240, 68], i: [745, 451], c: GREEN, a: [645, 461], t0: 2.1, gesto: 'mente' },
  { p: [52, 535, 240, 67], i: [88, 560], c: CORAL, a: [345, 568], t0: 3.2, gesto: 'caida' },
  { p: [705, 645, 240, 68], i: [745, 668], c: CORAL, a: [645, 678], t0: 4.3, gesto: 'corazon' },
  { p: [52, 752, 240, 68], i: [88, 777], c: BLUE, a: [345, 786], t0: 5.4, gesto: 'remedio' },
  { p: [705, 862, 240, 68], i: [745, 887], c: GREEN, a: [686, 880], t0: 6.5, gesto: 'escudo' },
];

// Tarjetas del celular: renglones grises que se reemplazan por mensajes
const TARJETAS = [
  { caja: [410, 628, 196, 42], punto: [393.7, 645.5, GREEN], t0: 1.6, renglones: ['¡Buen día, Rosa! ¿Jugamos', 'a recordar canciones? 🎵'] },
  { caja: [410, 719, 196, 42], punto: [393.7, 736.3, BLUE], t0: 5.6, renglones: ['Ya es hora de la pastilla', 'de las 20 h. ¿La tomaste? 💊'] },
];
const ICONOS_CEL = [[420.7, 855.5, BLUE], [494.5, 855.5, CORAL], [569, 855.5, GREEN]];

/** Pulso tipo latido (dos golpes) con período `per`. */
function latido(t, per = 0.85) {
  const q = (t % per) / per;
  return Math.exp(-Math.pow((q - 0.08) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((q - 0.3) / 0.05, 2));
}

function corazoncito(ctx, x, y, s, color, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-7, -3, -4, -9, 0, -5); ctx.bezierCurveTo(4, -9, 7, -3, 0, 3);
  ctx.fillStyle = rgba(color, a); ctx.shadowColor = rgba(color, a); ctx.shadowBlur = 6; ctx.fill();
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // ---- Placa limpia de la ilustración (la pareja se mece encima)
  sprite(ctx, 'fondoPareja');

  // ---- Lucecitas cálidas que suben por el fondo
  for (let i = 0; i < 12; i++) {
    const q = (t * (0.045 + rnd(i, 1) * 0.04) + rnd(i, 2)) % 1;
    const x = 30 + rnd(i, 3) * 930 + 14 * Math.sin(t * 0.7 + i * 1.3), y = 1180 - q * 900;
    blob(ctx, x, y, 10 + rnd(i, 4) * 12, i % 2 ? WARM : WHITE, 0.4 * g * Math.sin(Math.PI * q));
  }

  // ---- Título y lema
  sheen(ctx, 370, 80, 250, 92, 8, (t - 0.9) / 1.5, 0.45 * g);
  sheen(ctx, 286, 1022, 420, 44, 8, (t - 3.0) / 1.6, 0.45 * g);
  sheen(ctx, 286, 1066, 420, 44, 8, (t - 3.4) / 1.6, 0.45 * g);

  // ---- Ilustración: sol que late, pareja que se mece abrazada, corazoncitos
  const sol = 0.5 + 0.5 * Math.sin(t * 2.2);
  blob(ctx, 421.7, 403, 34 + 6 * sol, WARM, 0.45 * g);
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * TAU + t * 0.4, r0 = 21, r1 = 27 + 4 * sol;
    ctx.beginPath(); ctx.moveTo(421.7 + Math.cos(ang) * r0, 403 + Math.sin(ang) * r0); ctx.lineTo(421.7 + Math.cos(ang) * r1, 403 + Math.sin(ang) * r1);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = rgba([245, 180, 90], 0.75 * g); ctx.stroke();
  }
  const mece = (0.022 * Math.sin(t * 1.6) + 0.006 * Math.sin(t * 3.7)) * g;
  const respira = 1 + 0.008 * (0.5 - 0.5 * Math.cos(t * 2.2)) * g;
  spriteT(ctx, 'pareja', { rot: mece, sx: respira, sy: respira, px: 495, py: 598 });
  emitters(t, 0.9, 8.4, 0.9, 2.4, (p, i) => {
    const x = 478 + (rnd(i, 1) - 0.5) * 30 + 10 * Math.sin(p * 7 + i), y = 455 - 80 * p;
    corazoncito(ctx, x, y, 0.9 + 0.6 * p, CORAL, 0.9 * g * Math.sin(Math.PI * clamp(p * 1.2)));
  });

  // ---- Tarjetas: los renglones grises se vuelven mensajes de CECI que se escriben
  TARJETAS.forEach(({ caja: [x, y, w, h], punto: [px, py, pc], t0, renglones }) => {
    const on = g * smooth(t0 - 0.3, t0, t);
    if (on <= 0.01) return;
    ctx.fillStyle = rgba(WHITE, on); rrect(ctx, x - 2, y - 2, w + 4, h + 4, 6); ctx.fill();
    const total = renglones.join('').length;
    let quedan = Math.floor(total * clamp((t - t0) / 2.0));
    ctx.font = '600 12.5px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    renglones.forEach((r, k) => {
      const parte = r.slice(0, Math.max(0, quedan)); quedan -= r.length;
      ctx.fillStyle = rgba(k ? [110, 110, 105] : NAVY, on);
      ctx.fillText(parte, x + 4, y + 11 + k * 19);
      if (quedan < 0 && parte.length < r.length && parte.length > 0 && Math.sin(t * 14) > 0) {
        ctx.fillRect(x + 6 + ctx.measureText(parte).width, y + 4 + k * 19, 1.5, 14);
      }
    });
    emitters(t, t0, t0 + 0.1, 1, 1.2, (p) => sonar(ctx, px, py, p, 9, 26, 2, pc, 0.8 * g));
    glowDot(ctx, px, py, 14, pc, 0.45 * on * (0.6 + 0.4 * Math.sin(t * 4)));
  });

  // ---- Celular que "habla": ondas de voz desde el ícono de voz; los íconos laten en ronda
  wifi(ctx, 440, 846, t, 1.0, 8.6, BLUE, 0.9 * g, 0.9, 1.4);
  ICONOS_CEL.forEach(([x, y, c], i) => {
    const p = 0.5 + 0.5 * Math.sin(t * 2.4 - i * 1.4);
    blob(ctx, x, y, 34, c, 0.28 * p * g);
  });

  // ---- Reloj: el corazón late y el pulso se lee en pantalla
  const lat = latido(t) * g;
  blob(ctx, 642.3, 831, 40 + 8 * lat, CORAL, 0.35 * lat);
  sprite(ctx, 'corazonReloj', 0, 0, 1 + 0.16 * lat, 0, 1, 642.3, 831);
  emitters(t, 1.0, 8.6, 0.85, 1.0, (p) => sonar(ctx, 642.3, 831, p, 22, 48, 2, CORAL, 0.55 * g));
  const bpm = Math.round(71 + 2 * Math.sin(t * 0.9));
  ctx.globalAlpha = g; ctx.fillStyle = '#ffd3cc'; ctx.font = '700 11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bpm + ' lpm', 642.3, 863);
  ctx.globalAlpha = 1;

  // ---- Funciones: se encienden de a una y mandan señal; gesto propio de cada ícono
  FUNCIONES.forEach(({ p: [x, y, w, h], i: [ix, iy], c, a: [ax, ay], t0, gesto }) => {
    const on = g * env(t, t0, t0 + 0.3, t0 + 1.3, t0 + 1.9);
    glowRect(ctx, x, y, w, h, h / 2, c, on, 2.5, 16);
    sheen(ctx, x, y, w, h, h / 2, (t - t0 - 0.1) / 1.0, 0.45 * g);
    blob(ctx, ix, iy, 46, c, 0.3 * on);
    const borde = x < 400 ? x + w : x;
    emitters(t, t0 + 0.2, t0 + 0.3, 1, 1.0, (q) => signal(ctx, polyline([[borde, iy], [ax, ay]]), q, c, 0.95 * g, 40, 7));
    const k = clamp((t - t0) / 1.6);
    if (k <= 0 || k >= 1) return;
    const a = g * Math.sin(Math.PI * k);
    if (gesto === 'voz') wifi(ctx, ix + 14, iy + 4, t, t0, t0 + 1.6, WHITE, a, 0.75, 0.8);
    else if (gesto === 'caida') { sonar(ctx, ix, iy, k, 26, 70, 3, CORAL, a); sonar(ctx, ix, iy, clamp(k * 1.6 - 0.3), 26, 70, 2, CORAL, a * 0.7); }
    else if (gesto === 'corazon') { const l = latido(t, 0.7); blob(ctx, ix, iy, 30 + 10 * l, CORAL, 0.6 * a * l); }
    else if (gesto === 'mente') for (let s = 0; s < 3; s++) sparkle(ctx, ix + Math.cos(s * 2.1 + k * 4) * 34, iy + Math.sin(s * 2.1 + k * 4) * 34, 9, WHITE, a * (0.5 + 0.5 * Math.sin(t * 9 + s)));
    else if (gesto === 'remedio') { const r = 0.12 * Math.sin(k * Math.PI * 6) * a; ctx.save(); ctx.translate(ix, iy); ctx.rotate(r); glowDot(ctx, 0, -20, 8, WARM, a); ctx.restore(); }
    else if (gesto === 'escudo') { sparkle(ctx, ix + 8, iy - 10, 16, WHITE, a); sonar(ctx, ix, iy, k, 24, 56, 2.4, GREEN, a); }
  });

  // ---- Avisos de CECI (chips)
  const vent = (a, b) => [g * env(t, a, a + 0.4, b - 0.5, b), clamp((t - a) / 0.6)];
  let [ca, ck] = vent(3.4, 5.4); chip(ctx, 60, 612, 236, 46, 'Caída detectada', 'Aviso a la familia ✓', CORAL, ca, ck);
  [ca, ck] = vent(4.5, 6.6); chip(ctx, 705, 722, 236, 46, 'Pulso', bpm + ' lpm · normal', CORAL, ca, ck);
  [ca, ck] = vent(6.7, 8.7); chip(ctx, 705, 938, 236, 46, 'Llamada sospechosa', 'Bloqueada 🛡', GREEN, ca, ck);

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);

const _M = typeof MARGEN !== 'undefined' ? MARGEN : 0;
global.CeciAnim = { WIDTH: W * (1 + 2 * _M), HEIGHT: H * (1 + 2 * _M), MARGIN: _M, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
