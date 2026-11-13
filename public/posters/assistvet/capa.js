/* assistvet · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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

const SPRITES_SRC = {"perro":{"x":128,"y":858,"w":750,"h":374,"pw":857,"ph":427,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"fondoPerro":{"x":108,"y":838,"w":790,"h":394,"pw":451,"ph":225,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"logo":{"x":356,"y":197,"w":60,"h":60,"pw":69,"ph":69,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"iconoMic":{"x":170,"y":657,"w":40,"h":40,"pw":46,"ph":46,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"iconoIA":{"x":475,"y":657,"w":40,"h":40,"pw":46,"ph":46,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"iconoFirma":{"x":778,"y":657,"w":40,"h":40,"pw":46,"ph":46,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"}};
/*
 * AssistVet · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Cuenta el flujo del póster: "Hablás → AssistVet redacta → Firmás".
 *  1. Hablás: el micrófono escucha; a la izquierda, sobre la pared, aparece el dictado del veterinario y
 *     llegan solas las imágenes de la ecografía. Una onda de voz viaja del micrófono a la IA.
 *  2. AssistVet redacta: las chispas titilan y, a la derecha (fuera del papel), se escribe el borrador del
 *     informe órgano por órgano; marca una diferencia entre lo dictado y la imagen.
 *  3. Firmás: el sello verde se enciende, el veterinario corrige y firma; aparece el QR y el informe sale
 *     hacia la familia. El perro sigue todo con la cabeza ladeada y, al final, se pone contento.
 * El lienzo se extiende un 30 % por lado (MARGEN): el dictado y el informe viven en la pared.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10, MARGEN = 0.3;
const PURPLE = [167, 139, 250], PURPLE_D = [124, 92, 230], GREEN = [74, 201, 110], WHITE = [255, 255, 255];
const AMBER = [255, 190, 80], INK = [20, 16, 34];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const MIC = [190, 677], IA = [495, 677], FIRMA = [798, 677];
const PIVOTE = [500, 1232], PIE = 1231; // el perro se apoya en el borde del pie blanco

/* ---------------------------------------------------------------- utilidades propias */

function texto(ctx, s, x, y, peso, px, color, a, align = 'left') {
  if (a <= 0.01) return;
  ctx.font = FUENTE(peso, px); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(color, a); ctx.fillText(s, x, y);
}

/** Texto que se escribe solo: muestra `k` (0..1) del texto y un cursor mientras escribe. */
function tipeo(ctx, s, x, y, peso, px, color, a, k, t) {
  const n = Math.floor(s.length * clamp(k));
  if (n <= 0 || a <= 0.01) return;
  const parte = s.slice(0, n);
  texto(ctx, parte, x, y, peso, px, color, a);
  if (n < s.length && Math.sin(t * 16) > 0) {
    ctx.fillStyle = rgba(color, a); ctx.fillRect(x + ctx.measureText(parte).width + 1.5, y - px * 0.55, 1.4, px * 1.1);
  }
}

function corazon(ctx, x, y, s, color, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-7, -3, -4, -9, 0, -5); ctx.bezierCurveTo(4, -9, 7, -3, 0, 3);
  ctx.fillStyle = rgba(color, a); ctx.shadowColor = rgba(color, a); ctx.shadowBlur = 8; ctx.fill();
  ctx.restore();
}

/** Tilde (check) que se dibuja de a poco (k: 0..1). */
function tilde(ctx, x, y, s, color, a, k, w = 3) {
  if (k <= 0 || a <= 0.01) return;
  const p = [[x - s * 0.5, y], [x - s * 0.12, y + s * 0.38], [x + s * 0.55, y - s * 0.4]];
  const pl = polyline(p), L = pl.total * clamp(k);
  ctx.beginPath(); ctx.moveTo(...p[0]);
  for (let s2 = 2; s2 <= L; s2 += 2) ctx.lineTo(...pl.at(s2));
  ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(color, a); ctx.stroke();
}

/** Miniatura de ecografía: abanico gris con moteado y un órgano anecoico. */
const MOTEADO = Array.from({ length: 140 }, (_, i) => [rnd(i, 1), rnd(i, 2), rnd(i, 3)]);
function ecografia(ctx, x, y, s, a, semilla) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = clamp(a);
  rrect(ctx, x - s / 2, y - s / 2, s, s, 8); ctx.fillStyle = 'rgb(6,6,10)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(PURPLE, 0.7); ctx.stroke();
  const ax = x, ay = y - s * 0.42, R = s * 0.82, a0 = Math.PI * 0.5 - 0.62, a1 = Math.PI * 0.5 + 0.62;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.arc(ax, ay, R, a0, a1); ctx.closePath();
  ctx.save(); ctx.clip();
  const gr = ctx.createRadialGradient(ax, ay, 0, ax, ay, R);
  gr.addColorStop(0, 'rgb(150,150,150)'); gr.addColorStop(1, 'rgb(45,45,48)');
  ctx.fillStyle = gr; ctx.fillRect(x - s / 2, y - s / 2, s, s);
  for (const [u, v, w] of MOTEADO) {
    const ang = a0 + (a1 - a0) * ((u + semilla * 0.37) % 1), r = R * (0.08 + 0.92 * v);
    ctx.fillStyle = `rgba(230,230,230,${0.12 + 0.35 * w})`;
    ctx.fillRect(ax + Math.cos(ang) * r, ay + Math.sin(ang) * r, 2 + w * 3, 1.4);
  }
  ctx.beginPath(); ctx.ellipse(x + (semilla ? 6 : -4), y + s * 0.08, s * (semilla ? 0.16 : 0.2), s * 0.11, semilla ? 0.4 : -0.2, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
  ctx.restore();
  texto(ctx, semilla ? 'RIÑÓN IZQ.' : 'VEJIGA', x - s / 2 + 6, y - s / 2 + 9, 700, 7.5, WHITE, 0.8);
  ctx.restore();
}

/** QR decorativo (patrón estable) con sus tres ojos. */
function qr(ctx, x, y, s, a) {
  if (a <= 0.01) return;
  const n = 17, c = s / n;
  ctx.save(); ctx.globalAlpha = clamp(a);
  rrect(ctx, x - 5, y - 5, s + 10, s + 10, 5); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.fillStyle = rgba(INK, 1);
  const ojo = (i, j) => i < 5 && j < 5 || i > n - 6 && j < 5 || i < 5 && j > n - 6;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (ojo(i, j)) continue;
    if (rnd(i * 31 + j, 7) > 0.52) ctx.fillRect(x + i * c, y + j * c, c + 0.3, c + 0.3);
  }
  for (const [i, j] of [[0, 0], [n - 5, 0], [0, n - 5]]) {
    ctx.fillRect(x + i * c, y + j * c, 5 * c, 5 * c);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + (i + 1) * c, y + (j + 1) * c, 3 * c, 3 * c);
    ctx.fillStyle = rgba(INK, 1); ctx.fillRect(x + (i + 1.8) * c, y + (j + 1.8) * c, 1.4 * c, 1.4 * c);
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- piezas de la escena */

/** El perro: asoma, ladea la cabeza siguiendo el flujo y al final se alegra. Nunca deja hueco abajo. */
function perro(ctx, t, g) {
  const rot = g * (0.032 * env(t, 1.3, 1.9, 2.8, 3.4) - 0.03 * env(t, 3.7, 4.3, 5.0, 5.6)
    + 0.016 * Math.sin(t * 10) * env(t, 6.3, 6.6, 7.8, 8.4));
  const asoma = 26 * env(t, 0.35, 0.75, 0.95, 1.6);
  const dy = g * (4 + 3 * Math.sin(t * 1.7)) + asoma + Math.abs(Math.sin(rot)) * 385;
  const sc = 1 + g * 0.007 * (0.5 - 0.5 * Math.cos(t * 2.4));
  ctx.save();
  ctx.beginPath(); ctx.rect(-50, 0, DW + 100, PIE); ctx.clip();
  sprite(ctx, 'fondoPerro'); // placa limpia: el póster sin el perro
  ctx.save();
  pivotar(ctx, PIVOTE[0], PIVOTE[1], 0, dy, rot, sc);
  sprite(ctx, 'perro');
  // brillo en los ojos cuando se pone contento
  const feliz = g * env(t, 6.3, 6.7, 7.9, 8.5);
  for (const [ex, ey] of [[397, 1041], [608, 1041]]) sparkle(ctx, ex, ey, 10 + 3 * Math.sin(t * 8), WHITE, feliz * (0.55 + 0.45 * Math.sin(t * 7 + ex)));
  ctx.restore();
  ctx.restore();
  // corazones que suben desde la cabeza
  emitters(t, 6.5, 8.3, 0.35, 1.8, (p, i) => {
    const x = 380 + rnd(i, 1) * 240 + 14 * Math.sin(p * 6 + i), y = 930 - 150 * p;
    corazon(ctx, x, y, 1.4 + 1.2 * p, i % 3 ? [255, 120, 150] : PURPLE, g * Math.sin(Math.PI * clamp(p * 1.15)));
  });
}

/** Ícono de una columna: halo, latido del recorte y anillos. */
function icono(ctx, nombre, [x, y], color, on, t, g) {
  blob(ctx, x, y, 60, color, 0.4 * on);
  sprite(ctx, nombre, 0, 0, 1 + 0.22 * on * (0.75 + 0.25 * Math.sin(t * 6)), 0, g);
  if (on > 0.05) emitters(t, 0, DUR, 0.7, 1.1, (p) => sonar(ctx, x, y, p, 20, 54, 2, color, 0.7 * on));
}

/** Onda de voz (barras tipo audio) entre el micrófono y la IA. */
function ondaVoz(ctx, t, a) {
  if (a <= 0.01) return;
  const x0 = MIC[0] + 34, x1 = IA[0] - 34;
  for (let x = x0; x <= x1; x += 4.5) {
    const u = (x - x0) / (x1 - x0);
    const habla = 0.5 + 0.5 * Math.sin(t * 3.1 + u * 9) * Math.sin(t * 5.3 - u * 14 + 1.3);
    const h = 3 + 22 * Math.sin(Math.PI * u) * habla;
    ctx.fillStyle = rgba(mix(WHITE, PURPLE, u), a * (0.55 + 0.45 * Math.sin(Math.PI * u)));
    rrect(ctx, x - 1.3, MIC[1] - h / 2, 2.6, h, 1.3); ctx.fill();
  }
}

/** Renglones de texto que fluyen de la IA a la firma. */
function flujoTexto(ctx, t, a) {
  if (a <= 0.01) return;
  const x0 = IA[0] + 34, x1 = FIRMA[0] - 34;
  for (let i = 0; i < 9; i++) {
    const q = (t * 0.55 + i / 9) % 1, x = x0 + (x1 - x0) * q, w = 10 + rnd(i, 4) * 14, y = FIRMA[1] + (rnd(i, 5) - 0.5) * 16;
    ctx.fillStyle = rgba(mix(PURPLE, GREEN, q), a * Math.sin(Math.PI * q));
    rrect(ctx, x - w / 2, y - 1.8, w, 3.6, 1.8); ctx.fill();
  }
}

/** Pared izquierda: el dictado del veterinario y las imágenes que llegan solas. */
function dictado(ctx, t, g) {
  const ent = easeOut((t - 1.0) / 0.7), sal = smooth(2.9, 3.5, t);
  const a = g * smooth(1.0, 1.3, t) * (1 - sal);
  if (a <= 0.01) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(-400, -100, 398, DH + 200); ctx.clip(); // asoma por detrás del borde del póster
  const x = -268 + (1 - ent) * 270, y = 560, w = 252, h = 96;
  ctx.globalAlpha = clamp(a);
  rrect(ctx, x, y, w, h, 14); ctx.fillStyle = 'rgba(20,16,34,0.93)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(PURPLE, 0.75); ctx.stroke();
  glowDot(ctx, x + 22, y + 22, 13, PURPLE, 0.6 + 0.4 * Math.sin(t * 9));
  texto(ctx, 'DICTADO EN VIVO', x + 40, y + 22, 700, 10, PURPLE, 1);
  wifi(ctx, x + w - 26, y + 30, t, 1.0, 3.2, WHITE, 0.8, 0.55, 0.9);
  const frase = ['«Hígado de tamaño normal,', 'riñones conservados, vejiga', 'con contenido anecoico…»'];
  let k = clamp((t - 1.4) / 1.4) * frase.join('').length;
  frase.forEach((r, i) => { tipeo(ctx, r, x + 16, y + 46 + i * 16, 500, 12, WHITE, 1, k / r.length, t); k -= r.length; });
  ctx.globalAlpha = 1;
  ctx.restore();

  // Imágenes del estudio: llegan, y después vuelan hacia la IA
  [[-205, 735, 1.5], [-85, 735, 1.9]].forEach(([ix, iy, t0], s) => {
    const llega = easeOut((t - t0) / 0.5), vuela = easeInOut((t - 2.8 - s * 0.12) / 0.7);
    if (llega <= 0) return;
    const px = ix + (IA[0] - ix) * vuela, py = iy + (1 - llega) * 40 + (IA[1] - iy) * vuela - Math.sin(Math.PI * vuela) * 90;
    ecografia(ctx, px, py, 96 * (1 - 0.8 * vuela), g * llega * (1 - smooth(0.75, 1, vuela)), s);
  });
  texto(ctx, 'IMÁGENES DEL ESTUDIO', -268, 668, 700, 9.5, PURPLE, g * smooth(1.5, 1.8, t) * (1 - smooth(2.7, 3.0, t)));
}

const ORGANOS = [
  ['Hígado', 'Tamaño y ecogenicidad normales'],
  ['Riñones', 'Relación córtico-medular conservada'],
  ['Vejiga', 'Contenido anecoico, pared regular'],
];

/** Pared derecha: el borrador del informe, la firma, el QR y el envío. */
function informe(ctx, t, g) {
  const ent = easeOut((t - 3.0) / 0.7), envia = easeInOut((t - 7.7) / 0.8);
  const a = g * smooth(3.0, 3.3, t) * (1 - smooth(0.6, 1, envia));
  if (a <= 0.01) return;
  const x = 1010 - (1 - ent) * 268 + envia * 120, y = 372 - envia * 160, w = 262, h = 404;
  ctx.save();
  ctx.beginPath(); ctx.rect(DW + 2, -400, 600, DH + 800); ctx.clip();
  ctx.globalAlpha = clamp(a);
  const firmado = smooth(6.0, 6.3, t);
  rrect(ctx, x, y, w, h, 16); ctx.fillStyle = 'rgba(20,16,34,0.95)'; ctx.fill();
  ctx.save(); ctx.shadowColor = rgba(mix(PURPLE, GREEN, firmado), 0.9); ctx.shadowBlur = 16;
  ctx.lineWidth = 2; ctx.strokeStyle = rgba(mix(PURPLE, GREEN, firmado), 0.9); ctx.stroke(); ctx.restore();

  // cabecera
  sprite(ctx, 'logo', x + 26 - 386, y + 26 - 227, 0.62, 0, 1, 386, 227);
  texto(ctx, 'AssistVet', x + 46, y + 26, 800, 15, WHITE, 1);
  const chipW = 84, cx = x + w - chipW - 12;
  rrect(ctx, cx, y + 15, chipW, 22, 11); ctx.fillStyle = rgba(mix(PURPLE_D, [40, 150, 80], firmado), 0.9); ctx.fill();
  texto(ctx, firmado > 0.5 ? 'FIRMADO ✓' : 'BORRADOR IA', cx + chipW / 2, y + 26.5, 800, 9.5, WHITE, 1, 'center');
  texto(ctx, 'Informe ecográfico · Abdomen', x + 16, y + 56, 600, 11.5, [210, 205, 230], 1);
  texto(ctx, 'Paciente: Toby · canino, 6 años', x + 16, y + 74, 500, 11, [160, 155, 180], 1);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 16, y + 88, w - 32, 1);

  // órganos que se escriben de a uno
  ORGANOS.forEach(([org, hallazgo], i) => {
    const t0 = 3.4 + i * 0.6, oy = y + 108 + i * 50;
    const on = smooth(t0, t0 + 0.2, t);
    if (on <= 0.01) return;
    glowDot(ctx, x + 22, oy, 7, PURPLE, on);
    texto(ctx, org, x + 34, oy, 700, 12.5, WHITE, on);
    tipeo(ctx, hallazgo, x + 34, oy + 18, 500, 11, [205, 200, 225], on, (t - t0 - 0.1) / 0.5, t);
  });

  // diferencia entre dictado e imagen → el veterinario la revisa
  const aviso = smooth(5.0, 5.2, t), corrige = smooth(5.7, 5.9, t);
  if (aviso > 0.01) {
    const vy = y + 248;
    rrect(ctx, x + 14, vy - 13, w - 28, 26, 8);
    ctx.fillStyle = rgba(mix([80, 55, 10], [20, 70, 40], corrige), 0.85 * aviso); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(mix(AMBER, GREEN, corrige), aviso); ctx.stroke();
    texto(ctx, corrige > 0.5 ? '✓ Vejiga: sedimento leve (corregido)' : '⚠ La imagen muestra sedimento: revisar',
      x + 24, vy, 700, 10.5, mix(AMBER, [170, 255, 200], corrige), aviso);
    if (aviso < 1 || (t > 5.0 && t < 5.7)) ring(ctx, x + w - 22, vy, 8 + 4 * Math.sin(t * 10), 1.5, AMBER, aviso * (1 - corrige));
  }

  // firma manuscrita que se traza
  const traza = clamp((t - 5.95) / 0.7);
  if (traza > 0) {
    const sx = x + 22, sy = y + 318;
    ctx.beginPath();
    for (let i = 0; i <= 60 * traza; i++) {
      const u = i / 60, px = sx + u * 120, py = sy - 6 * Math.sin(u * 19) - 8 * Math.sin(u * 5 + 1) * (1 - u);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(WHITE, 0.95); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(sx, sy + 16, 130, 1);
    texto(ctx, 'M.V. responsable', sx, sy + 28, 500, 9.5, [170, 165, 190], 1);
  }
  // sello verde
  const sello = smooth(6.3, 6.5, t);
  if (sello > 0.01) {
    const k = 1 + 0.4 * (1 - easeOut((t - 6.3) / 0.35));
    ctx.save(); ctx.translate(x + 110, y + 300); ctx.rotate(-0.18); ctx.scale(k, k);
    ring(ctx, 0, 0, 24, 2.5, GREEN, sello * 0.9);
    tilde(ctx, 0, 0, 22, GREEN, sello, (t - 6.3) / 0.35, 3.5);
    ctx.restore();
  }
  // QR de autenticidad
  const vq = smooth(6.8, 7.1, t);
  if (vq > 0.01) {
    qr(ctx, x + w - 82, y + 290, 62, vq);
    texto(ctx, 'Verificá el informe', x + w - 51, y + 368, 600, 8.5, [190, 185, 210], vq, 'center');
    sheen(ctx, x + w - 87, y + 285, 72, 72, 5, (t - 7.0) / 0.6, 0.6);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // "Enviado a la familia"
  const env2 = g * env(t, 7.9, 8.15, 8.7, 9.1);
  chip(ctx, 1012, 560, 252, 46, 'Enviado a la familia', 'Al instante, con QR ✓', GREEN, env2, clamp((t - 7.9) / 0.5));
}

/* ---------------------------------------------------------------- cuadro */

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // ---- Fondo vivo: manchas violeta y verde que derivan detrás de los títulos
  ctx.save(); ctx.beginPath(); ctx.rect(0, 150, DW, 680); ctx.clip();
  blob(ctx, 160 + 60 * Math.sin(t * 0.6), 420 + 40 * Math.cos(t * 0.5), 260, PURPLE_D, 0.1 * g);
  blob(ctx, 840 + 50 * Math.cos(t * 0.5), 640 + 40 * Math.sin(t * 0.7), 240, GREEN, 0.07 * g);
  ctx.restore();

  // ---- Logo y titulares en secuencia (Vos atendés → AssistVet escribe → Vos validás)
  emitters(t, 0.6, 0.7, 1, 1.4, (p) => sonar(ctx, 386, 227, p, 26, 70, 2, PURPLE, 0.8 * g));
  sprite(ctx, 'logo', 0, 0, 1 + 0.08 * g * env(t, 0.6, 0.9, 1.1, 1.6), 0, g);
  sheen(ctx, 240, 330, 510, 80, 10, (t - 0.8) / 1.3, 0.35 * g);
  blob(ctx, 495, 460, 300, PURPLE, 0.12 * g * env(t, 3.0, 3.4, 4.6, 5.2));
  sheen(ctx, 145, 420, 700, 86, 10, (t - 3.1) / 1.5, 0.4 * g);
  blob(ctx, 495, 553, 260, GREEN, 0.12 * g * env(t, 5.6, 6.0, 7.0, 7.6));
  sheen(ctx, 262, 512, 466, 86, 10, (t - 5.8) / 1.3, 0.4 * g);

  // ---- Las tres columnas
  const onMic = g * env(t, 1.0, 1.3, 2.9, 3.3), onIA = g * env(t, 3.0, 3.3, 5.0, 5.5), onFirma = g * env(t, 5.6, 5.9, 7.6, 8.1);
  icono(ctx, 'iconoMic', MIC, WHITE, onMic, t, g);
  icono(ctx, 'iconoIA', IA, PURPLE, onIA, t, g);
  icono(ctx, 'iconoFirma', FIRMA, GREEN, onFirma, t, g);
  ondaVoz(ctx, t, g * env(t, 1.2, 1.6, 2.8, 3.2));
  flujoTexto(ctx, t, g * env(t, 4.6, 5.0, 5.7, 6.0));
  if (onIA > 0.02) for (let s = 0; s < 4; s++) {
    const ang = s * 1.57 + t * 1.3, r = 34 + 6 * Math.sin(t * 4 + s);
    sparkle(ctx, IA[0] + Math.cos(ang) * r, IA[1] + Math.sin(ang) * r, 7 + 3 * Math.sin(t * 8 + s * 2), PURPLE, onIA * (0.5 + 0.5 * Math.sin(t * 6 + s)));
  }
  if (onFirma > 0.02) tilde(ctx, FIRMA[0], FIRMA[1] - 46, 18, GREEN, onFirma, (t - 5.7) / 0.4, 3);
  sheen(ctx, 140, 704, 100, 28, 6, (t - 1.1) / 0.9, 0.5 * g);
  sheen(ctx, 382, 704, 226, 28, 6, (t - 3.1) / 1.0, 0.5 * g);
  sheen(ctx, 755, 704, 90, 28, 6, (t - 5.7) / 0.9, 0.5 * g);

  // ---- Señales: voz → IA → firma
  emitters(t, 2.6, 2.7, 1, 0.8, (p) => signal(ctx, polyline([MIC, [IA[0] - 30, IA[1]]]), p, PURPLE, 0.9 * g, 60, 8));
  emitters(t, 5.2, 5.3, 1, 0.8, (p) => signal(ctx, polyline([[IA[0] + 30, IA[1]], FIRMA]), p, GREEN, 0.9 * g, 60, 8));

  // ---- El perro
  perro(ctx, t, g);

  // ---- Fuera del papel: dictado (izquierda) e informe (derecha)
  dictado(ctx, t, g);
  emitters(t, 3.0, 3.1, 1, 0.7, (p) => signal(ctx, polyline([[IA[0] + 24, IA[1] - 20], [700, 560], [DW + 14, 470]]), p, PURPLE, 0.9 * g, 70, 8));
  informe(ctx, t, g);

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);

const _M = typeof MARGEN !== 'undefined' ? MARGEN : 0;
global.AssistVetAnim = { WIDTH: W * (1 + 2 * _M), HEIGHT: H * (1 + 2 * _M), MARGIN: _M, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
