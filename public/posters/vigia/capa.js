/* vigia · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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

const SPRITES_SRC = {"orejaIzq":{"x":236,"y":498,"w":92,"h":76,"pw":105,"ph":87,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"orejaDer":{"x":424,"y":506,"w":92,"h":70,"pw":105,"ph":80,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"fondoOrejaIzq":{"x":226,"y":490,"w":120,"h":92,"pw":69,"ph":53,"feather":[0,0,0,0],"src":"data:image/webp;base64,UklGRk4FAABXRUJQVlA4WAoAAAAwAAAARAAANAAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIWAEAAA2AbNuWISnatm3btu3+SI3skW3bdjnWimpEItAcRQQDt40UZflw+BHg99QMrc2EaBWIBWbWhgB4VnkJud2BAgFWHxG9UVZoAgBUiAjiEmKKo7/s2tbSwTrRzQVJamNjgOOaGTI9oKDxhGN2JtSSaJaWvt2vIN4FZkfeIUI3h9Ycjb5/guytsuznT4eR9ibQuYNIRnkYohJyAYX2A++fly9VWqpE3BApmXp0e72gkGmfdMmoIfp8jstr24IsApoUdLPI7vVaFjGeXOSoCfiFNVo1A75wQGLrC+IANxvwT9KuX12tDdmz0GYeaoJjYh9iimNgY0YZxcLaDnwXQiC0Hsc0xEWgT4grLVW0CkHSwqd3NQQS7NyKqmPVkMbG0EihFdUCmhU6kPuchonG7BINOegHG1l/nmUt1dUQC12VCctlYDUA+x688Ga5nA2sQiyLyUoCpdT+izUAVlA4IAACAADwCwCdASpFADUAPj0aikMiIaEYyu1UIAPEs4BoOs7k325fPY2UAV8puwe1mGzfXfT3ccUE/z9iJ5lR6+9jt0fegTtEWSbbQd0UrGjw/YqyBH5oO20Whmf+6m6extUQIXd7Huv8KZZ14AD+91R//6hj//ocN//+n0G84Azp/uYtwLV94A7gCNxAayHoQpQxmAzeCNaHh88C1FfOVChGksvdJsg6AAriRQn/7bNVHKR18E4PiYjZUeRH9P7yqEhhWKVrm5YFnh1xiKdHPW4jx2pfyn+W1sWyWNSSgysLwkKBO5OIdyBleWe9Q3Kx9st9AHGjLsBgwzoxh5ubjWc1ZHYQ9qyegSNlE3DLGfUKnlYfTcy264gSD4xuX83hwx5TcSnukffTMSf7ir4Kn98CrnNDf054H6L2Yx8BuKyDjJqANh3Wv3/Wx/KP/96PP/7XZKipZrdtmUeHviyvWDlep+2SootZLO73QTn01dYhjhzPKM/rAJX2gQYmgSLdeDj8WJk2gK9fQyqpT+AWLNSmiLjh3/UVGvc8ILSxOlAlXlNiRa+zFAhRHAhjzM2iyGlQzlJ4dmHlafa40UzGr+u1md/AMs1XWqrrvFcg0ZqIrnlgAlB20i3ZdeJh73D5882pVuEO3KOOxBW5jdv5VTaMefAjJePL9PsR4oiv1eQAAAAAAA=="},"fondoOrejaDer":{"x":416,"y":498,"w":108,"h":84,"pw":62,"ph":48,"feather":[0,0,0,0],"src":"data:image/webp;base64,UklGRpAEAABXRUJQVlA4WAoAAAAwAAAAPQAALwAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIawEAAA2As23b8eaN7dS27Xbz1Mk/MVtt27bN2Gljf+/3lFtEKGzbtnHSvWvnCfQrGZXPCoLL9EHyXElBBGJkRgTBfq4M3OnR5CIlZbbFUNBn8EOD7++mPA09kvB8VlaLidjfMTPyMtC50n5wg7Wc31JlIn6l0vjMCPeRQouzR32mC5NCZkWE0tdJsFZaZ8dnJKU7ztdJ5D38vDrRBykSElS4pk0E3hIfgl/8zrbb0bBeUBIkRHK01Ho2FvjCEHLy6phUT1kwgcYPw8fqr2lhubWDIhOdgyICKdG/2qBV5lU4LLzRBQuXnQGHD83ZM58FN2Otx8xgwZU30yzQFQdK+N0h11iEcHjcfrxIo0IdaTIuLwmpcEcqnrwzII/cAQ0KrVIIyfHZQBQVTz4MnB7jx/IGH/c3hRmRFAEx9ZvGFu1yKjaTjxQ3MyOCkRGJEIvFCiWPiyMdDsUhrmc6V9rPlYjiRigiMiL4I89VbsLaQgBWUDggLgEAADAHAJ0BKj4AMAA+PRqLQyIhoRgKrVQgA8S0gGQp+uIfMVY9AIi/gJy6moLIEHQ5WjuOxwGEVaropMMRRkXgA1rfAAD+/7ln///33DQAKHyDtv+Hy37BmngJGy0QpJW8Mww2VPHFQh5HeUn/TnXTf99e//9G6//0pd//9IFEHSBI97b8xk5jIqP+08/TIW9OV+BQMp+7M9MLOZjcruSVzm1vJyo3ercrfXGUH1RXiBWIyIl2Usuq/8ZBjXwQXUh8+ufMZIbQgxsgeg+9c6kPXHTg/Boz10KZhLHuGgAGeMf+9NQwrfiQw5PI3c9TRD3lojYnM+9YfZoeCzrCIi6/6c/3BkpAvfBOw7VASwZg7NiQaL+a78ZGgxZ/9/b//9Ma//0RI//+ntYDk5lowAAA"}};
/*
 * VigIA · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * La vaca mueve las orejas (recortes reales del póster sobre placas limpias) mientras su posición se
 * transmite en tiempo real: pulsos de ubicación sobre el animal, datos que viajan hasta la caravana
 * electrónica (que emite ondas de radio y deja pasar un reflejo de sol) y, arriba a la derecha, llegan
 * las alertas al productor: celo detectado, actividad baja (posible enfermedad) y salida del campo.
 * Cada alerta enciende su ícono de abajo (reproducción, rodeo, salud).
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 12;
const VERDE = [120, 200, 40], AZUL = [30, 110, 200], AMBAR = [245, 160, 30], ROJO = [230, 60, 50];
const BLANCO = [255, 255, 255], TINTA = [24, 34, 48];
const G = t => env(t, 0.3, 1.0, 10.8, 11.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const VACA = [215, 640];                 // lomo de la vaca (pulso de ubicación)
const OREJA = [283, 535];                // donde iría la caravana
const ANILLO = [820, 362];               // ojal de la caravana grande
const PANEL = [[637, 425], [895, 467], [887, 754], [599, 679]];
const ICONOS = [[198, 962], [481, 962], [761, 962]];

const ALERTAS = [
  { t0: 2.0, color: VERDE, titulo: 'Vaca 127 · Celo detectado', sub: 'Momento ideal para inseminar', icono: 0 },
  { t0: 5.0, color: AMBAR, titulo: 'Vaca 054 · Actividad baja', sub: 'Posible enfermedad: revisar', icono: 2 },
  { t0: 8.0, color: ROJO, titulo: 'Vaca 211 salió del campo', sub: 'Alerta de perímetro', icono: 1 },
];

/** Sacudón de oreja: sube rápido y vuelve con un rebote. */
function sacudon(t, momentos) {
  let r = 0;
  for (const t0 of momentos) {
    const d = t - t0;
    if (d > 0 && d < 1.2) r += Math.exp(-d * 5) * Math.sin(d * 18);
  }
  return r;
}

function texto(ctx, s, x, y, peso, px, color, a) {
  if (a <= 0.01) return;
  ctx.font = FUENTE(peso, px); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(color, a); ctx.fillText(s, x, y);
}

/** Notificación al productor. */
function alerta(ctx, x, y, al, a, k) {
  if (a <= 0.01) return;
  const w = 248, h = 54;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.shadowColor = 'rgba(0,30,60,0.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  rrect(ctx, x, y, w, h, 12); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); rrect(ctx, x, y, w, h, 12); ctx.clip(); ctx.fillStyle = rgba(al.color, 1); ctx.fillRect(x, y, 6, h); ctx.restore();
  ctx.fillStyle = rgba(al.color, 1); ctx.beginPath(); ctx.arc(x + 24, y + h / 2, 9, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = FUENTE(800, 12); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x + 24, y + h / 2 + 0.5);
  texto(ctx, al.titulo, x + 42, y + 20, 700, 13.5, TINTA, 1);
  texto(ctx, al.sub, x + 42, y + 37, 500, 11.5, [90, 100, 115], 1);
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }

  // ---- Orejas que se sacuden (cada una a su tiempo)
  const ri = 0.09 * g * sacudon(t, [1.4, 6.3, 9.1]), rd = -0.09 * g * sacudon(t, [3.6, 6.5]);
  sprite(ctx, 'fondoOrejaIzq'); sprite(ctx, 'fondoOrejaDer');
  sprite(ctx, 'orejaIzq', 0, 0, 1, ri + 0.012 * g * Math.sin(t * 1.3), 1, 320, 540);
  sprite(ctx, 'orejaDer', 0, 0, 1, rd - 0.012 * g * Math.sin(t * 1.1 + 1), 1, 434, 545);

  // ---- Posición en tiempo real: pulsos sobre la vaca y en la oreja (caravana)
  emitters(t, 0.8, 10.4, 1.6, 1.4, p => {
    ctx.save(); ctx.translate(VACA[0], VACA[1] + 120); ctx.scale(1, 0.32);
    ring(ctx, 0, 0, 40 + 150 * easeOut(p), 5, VERDE, 0.7 * g * (1 - p)); ctx.restore();
  });
  glowDot(ctx, OREJA[0], OREJA[1], 16, VERDE, g * (0.45 + 0.45 * Math.max(0, Math.sin(t * TAU / 1.6)) ** 6));

  // ---- Datos que viajan de la vaca a la caravana grande
  const arco = polyline(Array.from({ length: 24 }, (_, i) => {
    const u = i / 23; return [OREJA[0] + (ANILLO[0] - OREJA[0]) * u, OREJA[1] + (ANILLO[1] - OREJA[1]) * u - 120 * Math.sin(Math.PI * u)];
  }));
  emitters(t, 1.0, 10.2, 1.6, 0.9, p => signal(ctx, arco, p, VERDE, 0.9 * g, 60, 9));
  // Ondas de radio desde el ojal
  wifi(ctx, ANILLO[0], ANILLO[1] - 22, t, 1.0, 10.4, AZUL, 0.85 * g, 1.2, 1.6);

  // ---- Reflejo de sol que cruza el panel de la caravana
  [3.2, 8.6].forEach(t0 => {
    const p = (t - t0) / 1.4;
    if (p <= 0 || p >= 1) return;
    ctx.save(); ctx.beginPath(); PANEL.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
    const cx = 560 + 420 * easeInOut(p), gr = ctx.createLinearGradient(cx - 70, 420, cx + 70, 760);
    gr.addColorStop(0, rgba(BLANCO, 0)); gr.addColorStop(0.5, rgba(BLANCO, 0.32 * g)); gr.addColorStop(1, rgba(BLANCO, 0));
    ctx.fillStyle = gr; ctx.fillRect(590, 420, 320, 340); ctx.restore();
  });

  // ---- Alertas al productor (la más nueva arriba) y su ícono
  ALERTAS.forEach((al, i) => {
    const d = t - al.t0;
    if (d < 0) return;
    const k = resorte(d), nuevas = ALERTAS.filter(b => t >= b.t0 && b.t0 > al.t0).length;
    const y = 112 + 62 * nuevas;
    alerta(ctx, 734, y, al, g * smooth(0, 0.15, d), k);
    // ícono correspondiente
    const [x, yi] = ICONOS[al.icono];
    emitters(t, al.t0, al.t0 + 0.1, 5, 1.4, p => sonar(ctx, x, yi, p, 74, 118, 3.5, al.color, 0.85 * g));
    glowDot(ctx, x, yi, 110, al.color, 0.22 * g * env(d, 0, 0.2, 0.8, 1.6));
    // pulso de color sobre la vaca
    emitters(t, al.t0, al.t0 + 0.1, 5, 1.2, p => sonar(ctx, VACA[0] + 60, VACA[1] - 30, p, 20, 110, 4, al.color, 0.8 * g));
  });

  // ---- "se pierde"
  sheen(ctx, 70, 385, 350, 72, 10, (t - 9.6) / 1.1, 0.45 * g);

  ctx.restore();
}

/** Muelle amortiguado: 0 → 1 con un pequeño rebote. */
function resorte(p) {
  if (p <= 0) return 0;
  return 1 - Math.exp(-7 * p) * Math.cos(10 * p);
}

const load = () => loadSprites(SPRITES_SRC);

const _M = typeof MARGEN !== 'undefined' ? MARGEN : 0;
global.VigIAAnim = { WIDTH: W * (1 + 2 * _M), HEIGHT: H * (1 + 2 * _M), MARGIN: _M, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
