/* drino · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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

const SPRITES_SRC = {"aguja":{"x":722,"y":312,"w":75,"h":75,"pw":86,"ph":86,"feather":[0,0,0,0],"src":"data:image/webp;base64,UklGRsYFAABXRUJQVlA4WAoAAAAwAAAAVQAAVQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIoQAAAAEPMP8REQJybNttm49RwJIloBSUBpTGUlAClgoYXtn+eHBeR/R/Auzv70EYUUCoSlcGpxnCDmHSlQE2RahQJk25KQdkryI0IHk3ZQCbdygA0amftH84OW0pOH3J3NtK8cZK9o5PAkhr9cO2tn+Ia+3DSQlOXynm3oCsbN4ATkrwDsgmJCVOgCAU8yskJSphslNMSLNGVMKsZxM25SQ0+wcCAFZQOCAuAwAAcBMAnQEqVgBWAD49GotDIiGhFc2NkCADxLGEOADJX1fvO+tYVaN2cz4pvSA8wG5AdTTvNH7hYRj/HvxE/V3yH4+jcvK94KaYaaX5BJCOcgmekd9yomAPsUGMDb/L3G4z8+Ugil6cS+VQpBv+xCT+2HgRNnbePvqk+x7f3qTqKgUBQesWzL63+PyOrxS7GC9SqV0wP6oZiVhv/fsdvAHR4k6eNEAA/uxBwWfw4oMU2UEeoUSZdKXZeL1sqXQEwDPlhE2RkQ0Yzf9FoccTAQvxJ7Em+S3hy9+RUQI6I4F5o3sihaRU2yb9cRDC9ZXuJ8mRMecclhYN309hdBWUMaUS5N2jrZ0HT6TTymykGTrTnlLv/mqyLuOTrajP8An9x/zKaq5nlOQxz/HR1Aka9FLhlkR01EgFbz+cVa3CsoZg936oJdlUDpo0BC6PnNKO3N4z7ra1IQwacbicfnylAFh80Tq9yJN/7A0ScErnlJHs/OQP/hECk8sx/bo+oHn5Nf5nhoZcOZW7voNH0Aus8c3JIs9hjFa4KBz+Ib3FUb9xFQ+BEdS8YFIYpZBJ+WzpQc5NOIXx2F5f27vGpn2LVxZtKVh+G3t5oLTuByseUQBXNX49YfeB8+MAxoZWR9YBeTDm8mhmmszU7xKKT671lw8k7TF5SalzhMWV3huoXwrnbcwPkf3rERQNMnuP0C7Ks9E/OsWtJ6U2Ixu+2g3VbS/y572MzfQ4f+2qIS+zkwvg3+chsAE4Ax+8CVmYV56fm0kzWK8Gue7TGuc/vetSvbnu3GrAPIh0Obt+bMZynr9C4oQuH0iCTXtFZrdE9PwxfTBDo0QyFHw+oEGnYKhHX3P6nKtQkp1VpbIo7t26HBIguBV6Jl4K46kr4FpnEPlYxV8/fu3F7WHQjMftWyuvwV/9xuQlmP1Zml+ud12fPuxCWuqAIT2ctMzMNsMEBBqXHllPrFf1u7Q+YNCQi74l6ItNsGjTGukEOTZ7kloIovfRjYnCsoLCmkW2HE823NRb0K//Ws0JDUDROzBhzdyi7dAH//575//nrz//884Ra/DB8yF0D4ZPFV22yvX4AAAAAA=="},"fondoAguja":{"x":717,"y":307,"w":85,"h":85,"pw":49,"ph":49,"feather":[0,0,0,0],"src":"data:image/webp;base64,UklGRkIEAABXRUJQVlA4WAoAAAAwAAAAMAAAMAAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIRgEAAA2AZNu2aed+2yjFtm0nTc1II2zbtvFta5+vpBgRDNw2UjQH7cINbe8T7H9ycTW1hmj7OPjxJ8Pk7b16TrQFdietydhRne+KzcIoPnSRWVO33hy/+iQwVZxKktSz5DJRUU9pslnVlz/JzIQxv0cABhnvMaE7fs5F2DNRHvGD4bYJO8T2tnAQFJcwLOwlHMrBB+ZhiHAGrmMlZEVVhFO8vuBC2GMi4KIq6XiMI+z5kMGIez4SwUgQC4wEsaQ9WmEkqOvxA0WCWJZ00O9RwxhJLMijqnYR1hchlBcaCHNrt5AacwxmONbP9C3mpVvgR7etLTAu6OULZNsHdyKwgHKhHwpyvXik5KIdEoDsWIew6CNBmSoFLJnP040D+wo+cOvDMjiL62N76TMpO94sEmHE3MdLJlFyCtqesgYixhFADJXSt4dl8YsBVlA4IAYBAAAwCACdASoxADEAPjUUh0MiIQ16zBABolnAMnlUzrPnxXgm/RXTy/BRWbWXYbJCa9516QrYEP/yVLzzoQHTZLDi8MkCHRDuJySoAAD+4tXf+DeV24USaADoKJ4ft3GdSC01QoA5I9kGa+7g3QP16IIsF9l15JNjZeC7oXO3BxTrVZQHeZS5OO1J/oBVP8GL87SKqe79IFglaOZ3PvgCIXf/AW2jwQjIhDcKYQPRvsKAGPa4QRT+n1drgO/Ky6xAamVhipSHi9NttukgljBhk/J78ascJlIwqAfh50pVEvk5/fxBTppnWG8tmjjJlDe6ByxP5EM4uW//CM/vHFz19J/Wtq7gAAAA"}};
/*
 * Drino · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Los dos Drinos acompañan al chico: aparecen globos de chat de contención ("¿Cómo te sentís hoy?",
 * "Estoy acá con vos", "Respirá conmigo", "Esto también pasa"), un halo suave marca la respiración
 * (inhalá–exhalá) alrededor del grupo, el Drino naranja parpadea y suben corazones. La aguja de la brújula
 * (recorte real del póster sobre una placa limpia) busca el norte y se estabiliza: encontrar el rumbo.
 * Las cuatro funciones de abajo se iluminan en secuencia.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 14;
const VERDE = [128, 180, 100], VERDE_O = [70, 120, 60], NARANJA = [240, 163, 84], NARANJA_O = [200, 110, 40];
const PIEL = [240, 163, 84], TINTA = [44, 50, 72], BLANCO = [255, 255, 255], MENTA = [170, 220, 200];
const G = t => env(t, 0.3, 1.0, 12.8, 13.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const BRUJULA = [759.3, 349.3];
const OJOS = [[661, 494], [706, 494.4]];
const PARPADEOS = [2.2, 2.45, 6.1, 9.6, 9.85, 12.0];
const GRUPO = [505, 700];

/** Corazón (centrado en x, y). */
function corazon(ctx, x, y, s, color, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-8, -2, -5, -10, 0, -5); ctx.bezierCurveTo(5, -10, 8, -2, 0, 4);
  ctx.fillStyle = rgba(color, a); ctx.fill(); ctx.restore();
}

/**
 * Globo de chat. (x, y, w, h) caja; (cx, cy) punta de la cola; lineas = texto; color del borde/acento.
 * k: aparición (escala con rebote), escribiendo: muestra "…" animado en vez del texto.
 */
function globo(ctx, x, y, w, h, cx, cy, lineas, color, a, k, escribiendo, t) {
  if (a <= 0.01 || k <= 0.01) return;
  const ox = cx, oy = cy, s = 0.6 + 0.4 * k;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(ox, oy); ctx.scale(s, s); ctx.translate(-ox, -oy);
  ctx.shadowColor = 'rgba(60,60,40,0.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  rrect(ctx, x, y, w, h, 18); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.shadowColor = 'transparent';
  // cola
  const bx = clamp(cx, x + 24, x + w - 24), by = cy < y ? y : y + h;
  ctx.beginPath(); ctx.moveTo(bx - 10, by); ctx.lineTo(cx, cy); ctx.lineTo(bx + 10, by); ctx.closePath(); ctx.fill();
  rrect(ctx, x, y, w, h, 18); ctx.lineWidth = 2.2; ctx.strokeStyle = rgba(color, 1); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (escribiendo) {
    for (let i = 0; i < 3; i++) {
      const b = Math.max(0, Math.sin(t * 8 - i * 0.9));
      ctx.fillStyle = rgba(color, 0.5 + 0.5 * b);
      ctx.beginPath(); ctx.arc(x + w / 2 + (i - 1) * 16, y + h / 2 - 4 * b, 4.5, 0, TAU); ctx.fill();
    }
  } else {
    ctx.fillStyle = rgba(TINTA, 1); ctx.font = FUENTE(600, 18);
    lineas.forEach((l, i) => ctx.fillText(l, x + w / 2, y + h / 2 + (i - (lineas.length - 1) / 2) * 22));
  }
  ctx.restore();
}

// Conversación: [inicio, fin, lado, líneas]
const CHAT = [
  [1.0, 4.6, 'izq', ['¿Cómo te sentís hoy?']],
  [3.8, 7.2, 'der', ['Estoy acá', 'con vos.']],
  [6.6, 10.6, 'izq', ['Respirá conmigo…']],
  [9.6, 12.8, 'der', ['Esto también', 'pasa.']],
];
const LADOS = {
  izq: { x: 170, y: 314, w: 250, h: 62, cx: 300, cy: 410, color: VERDE },
  der: { x: 824, y: 462, w: 156, h: 76, cx: 818, cy: 540, color: NARANJA },
};

/** Aguja: busca el norte (oscila amortiguada) cada tanto y se estabiliza. */
function aguja(t) {
  let r = 0;
  for (const t0 of [0.9, 7.4]) {
    const d = t - t0;
    if (d > 0) r += 0.9 * Math.exp(-d * 1.1) * Math.sin(d * 5.2);
  }
  return r * G(t);
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }

  // ---- Halo de respiración alrededor del grupo (más marcado mientras dice "Respirá conmigo")
  const resp = 0.5 - 0.5 * Math.cos(t * TAU / 4); // 4 s por ciclo (2 inhalar, 2 exhalar)
  const guia = 0.35 + 0.65 * env(t, 6.6, 7.2, 10.2, 10.8);
  ctx.save(); ctx.translate(GRUPO[0], GRUPO[1]); ctx.scale(1, 0.62);
  for (let i = 0; i < 2; i++) {
    const r = 330 + 34 * resp + i * 26;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.lineWidth = 10 - i * 4; ctx.strokeStyle = rgba(MENTA, g * guia * (0.32 - i * 0.12) * (0.55 + 0.45 * resp)); ctx.stroke();
  }
  ctx.restore();

  // ---- Brújula: la aguja busca el rumbo
  sprite(ctx, 'fondoAguja');
  sprite(ctx, 'aguja', 0, 0, 1, aguja(t), 1, BRUJULA[0], BRUJULA[1]);
  glowDot(ctx, BRUJULA[0], BRUJULA[1], 70, MENTA, 0.18 * g * (0.6 + 0.4 * Math.sin(t * 2)));

  // ---- Parpadeo del Drino naranja
  PARPADEOS.forEach(tp => {
    const d = t - tp;
    if (d < 0 || d > 0.16) return;
    const c = Math.sin(Math.PI * d / 0.16); // 0 → 1 (cerrado) → 0
    OJOS.forEach(([x, y]) => {
      const r = 7.8; // párpado: el color de la piel baja sobre el ojo
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      ctx.fillStyle = rgba(PIEL, g); ctx.fillRect(x - r, y - r, 2 * r, 2 * r * c);
      ctx.restore();
      if (c > 0.6) {
        ctx.strokeStyle = rgba(TINTA, g * (c - 0.6) / 0.4); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 6, y + 1); ctx.quadraticCurveTo(x, y + 5, x + 6, y + 1); ctx.stroke();
      }
    });
  });

  // ---- Corazones que suben desde el abrazo
  emitters(t, 1.4, 12.2, 0.9, 3.0, (p, i) => {
    const x0 = [430, 585, 520][i % 3], y0 = [690, 700, 600][i % 3];
    const x = x0 + 18 * Math.sin(p * 5 + i) + (rnd(i, 1) - 0.5) * 40 * p, y = y0 - 150 * p;
    corazon(ctx, x, y, 1.4 + 0.8 * rnd(i, 2), i % 2 ? NARANJA : VERDE, g * 0.85 * Math.sin(Math.PI * p));
  });

  // ---- Conversación
  CHAT.forEach(([a, b, lado, lineas]) => {
    const L = LADOS[lado];
    const k = resorte(t - a), al = g * (1 - smooth(b - 0.35, b, t));
    if (t < a || t > b) return;
    globo(ctx, L.x, L.y, L.w, L.h, L.cx, L.cy, lineas, L.color, al, k, t - a < 0.7, t);
  });

  // ---- Funciones de abajo, en secuencia
  const TARJETAS = [[113, 905, 361, 134, VERDE], [516, 905, 361, 134, NARANJA], [113, 1046, 361, 142, NARANJA], [516, 1046, 361, 142, VERDE]];
  TARJETAS.forEach(([x, y, w, h, col], i) => {
    [2.0, 8.4].forEach(t0 => {
      const a = t0 + i * 0.7;
      sheen(ctx, x + 10, y + 10, w - 20, h - 20, 40, (t - a) / 1.1, 0.4 * g);
      sparkle(ctx, x + 30, y + 30, 12, BLANCO, g * env(t, a, a + 0.15, a + 0.4, a + 0.8));
    });
  });
  // Privacidad
  sheen(ctx, 0, 1196, 990, 40, 0, (t - 5.0) / 2.0, 0.45 * g);

  ctx.restore();
}

/** Muelle amortiguado: 0 → 1 con un pequeño rebote (p en segundos desde el inicio). */
function resorte(p) {
  if (p <= 0) return 0;
  return 1 - Math.exp(-7 * p) * Math.cos(10 * p);
}

const load = () => loadSprites(SPRITES_SRC);

const _M = typeof MARGEN !== 'undefined' ? MARGEN : 0;
global.DrinoAnim = { WIDTH: W * (1 + 2 * _M), HEIGHT: H * (1 + 2 * _M), MARGIN: _M, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
