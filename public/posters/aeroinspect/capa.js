/* aeroinspect · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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

const SPRITES_SRC = {"dron":{"x":508,"y":232,"w":300,"h":206,"pw":343,"ph":235,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"fondoDron":{"x":498,"y":222,"w":320,"h":275,"pw":183,"ph":157,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"}};
/*
 * AeroInspect · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * El dron (recorte real del póster, sobre una placa limpia) vuela en un ocho suave, inclinándose hacia donde
 * avanza, con las hélices girando. Su haz de escaneo barre los silos y marca, una por una, una grieta, una
 * corrosión y una deformación (recuadro + etiqueta con la confianza de la IA). A la derecha, sobre la pared,
 * se arma el reporte con cada hallazgo y termina programando el mantenimiento. Los cuatro íconos de abajo
 * se encienden según la etapa: inspección, análisis, misión y alerta.
 * El lienzo se extiende un 30 % por lado (MARGEN): el reporte vive en la pared.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 12, MARGEN = 0.3;
const CIAN = [80, 200, 255], AZUL = [30, 90, 200], ROJO = [235, 64, 52], AMBAR = [245, 160, 30], VERDE = [52, 180, 100];
const BLANCO = [255, 255, 255], TINTA = [24, 34, 58];
const G = t => env(t, 0.3, 1.0, 10.8, 11.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const CENTRO = [657, 330];   // centro del dron (pivote de su inclinación)
const CAMARA = [643, 380];   // lente de la cámara
const HELICES = [[557, 291], [628, 261], [764, 275], [709, 316]];
const ICONOS = [[153, 990], [375, 990], [622, 990], [849, 990]];

// Hallazgos: dónde mira el dron, qué marca y cuándo
const HALLAZGOS = [
  { t0: 1.6, x: 505, y: 705, w: 52, h: 58, tipo: 'Grieta', conf: 94, color: ROJO },
  { t0: 4.3, x: 360, y: 720, w: 50, h: 62, tipo: 'Corrosión', conf: 88, color: AMBAR },
  { t0: 7.0, x: 668, y: 660, w: 48, h: 54, tipo: 'Deformación', conf: 81, color: AMBAR },
];
const ESCANEO = 2.0; // segundos que el haz barre cada zona antes de marcar

/** Vuelo en ocho: desplazamiento e inclinación (hacia donde avanza). */
function vuelo(t) {
  const g = G(t), w = TAU / DUR;
  const dx = g * 34 * Math.sin(w * t), dy = g * 13 * Math.sin(w * 2 * t) + g * 2.5 * Math.sin(t * 5.3);
  const vx = g * 34 * w * Math.cos(w * t);
  return { dx, dy, rot: 0.028 * vx };
}

function texto(ctx, s, x, y, peso, px, color, a, align = 'left') {
  if (a <= 0.01) return;
  ctx.font = FUENTE(peso, px); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(color, a); ctx.fillText(s, x, y);
}

/** Recuadro de detección con esquinas y etiqueta. k: aparición (0..1). */
function deteccion(ctx, h, k, a) {
  if (a <= 0.01 || k <= 0) return;
  const e = 1 + 0.5 * (1 - easeOut(k)), w = h.w * e, hh = h.h * e, x = h.x - w / 2, y = h.y - hh / 2, c = 12;
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(h.color, 1); ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.shadowColor = rgba(h.color, 0.8); ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
  ctx.moveTo(x + w - c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + c);
  ctx.moveTo(x + w, y + hh - c); ctx.lineTo(x + w, y + hh); ctx.lineTo(x + w - c, y + hh);
  ctx.moveTo(x + c, y + hh); ctx.lineTo(x, y + hh); ctx.lineTo(x, y + hh - c);
  ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = rgba(h.color, 0.12); ctx.fillRect(x, y, w, hh);
  // Etiqueta
  const ke = clamp((k - 0.3) / 0.7);
  if (ke > 0) {
    const s = `${h.tipo} ${h.conf}%`;
    ctx.font = FUENTE(700, 15); const tw = ctx.measureText(s).width + 18;
    ctx.globalAlpha = a * ke;
    rrect(ctx, x, y - 30, tw, 24, 6); ctx.fillStyle = rgba(h.color, 0.95); ctx.fill();
    texto(ctx, s, x + 9, y - 18, 700, 15, BLANCO, 1);
  }
  ctx.restore();
}

/** Haz de escaneo desde la cámara hasta una zona, con una línea que la barre. */
function haz(ctx, cam, h, p, a) {
  if (a <= 0.01) return;
  const x0 = h.x - h.w * 0.9, x1 = h.x + h.w * 0.9, y0 = h.y - h.h * 0.8, y1 = h.y + h.h * 0.8;
  const sy = y0 + (y1 - y0) * (0.5 - 0.5 * Math.cos(p * Math.PI * 3)); // barre arriba-abajo
  const gr = ctx.createLinearGradient(cam[0], cam[1], h.x, h.y);
  gr.addColorStop(0, rgba(BLANCO, 0.75 * a)); gr.addColorStop(0.25, rgba(CIAN, 0.32 * a)); gr.addColorStop(1, rgba(CIAN, 0.12 * a));
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(cam[0] - 2, cam[1]); ctx.lineTo(x0, sy); ctx.lineTo(x1, sy); ctx.lineTo(cam[0] + 2, cam[1]); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.shadowColor = rgba(CIAN, a); ctx.shadowBlur = 12;
  ctx.strokeStyle = rgba(BLANCO, 0.9 * a); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(x1, sy); ctx.stroke(); ctx.restore();
  glowDot(ctx, cam[0], cam[1], 22, CIAN, 0.8 * a);
}

/** Reporte sobre la pared (derecha del póster). */
function reporte(ctx, t, g) {
  const a0 = g * smooth(1.2, 1.8, t);
  if (a0 <= 0.01) return;
  const x = 1012, y = 520, w = 270, h = 280;
  ctx.save(); ctx.globalAlpha = a0;
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  rrect(ctx, x, y, w, h, 14); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill();
  ctx.shadowColor = 'transparent';
  rrect(ctx, x, y, w, 46, 14); ctx.fillStyle = rgba(AZUL, 1); ctx.fill(); ctx.fillRect(x, y + 30, w, 16);
  texto(ctx, 'Reporte de inspección', x + 16, y + 17, 700, 16, BLANCO, 1);
  texto(ctx, 'Planta de acopio · Silos', x + 16, y + 35, 500, 12, [200, 220, 255], 1);
  // Progreso del vuelo
  const prog = clamp((t - 1.2) / 8.4);
  rrect(ctx, x + 16, y + 62, w - 32, 7, 3.5); ctx.fillStyle = 'rgba(30,90,200,0.15)'; ctx.fill();
  rrect(ctx, x + 16, y + 62, (w - 32) * prog, 7, 3.5); ctx.fillStyle = rgba(CIAN, 1); ctx.fill();
  texto(ctx, `Vuelo automático · ${Math.round(prog * 100)}%`, x + 16, y + 84, 500, 12, [90, 100, 120], 1);
  // Hallazgos
  HALLAZGOS.forEach((hz, i) => {
    const k = clamp((t - hz.t0 - ESCANEO) / 0.4);
    if (k <= 0) return;
    const yy = y + 116 + i * 42;
    ctx.globalAlpha = a0 * k;
    ctx.fillStyle = rgba(hz.color, 1); ctx.beginPath(); ctx.arc(x + 24, yy, 6, 0, TAU); ctx.fill();
    texto(ctx, hz.tipo, x + 38, yy - 7, 700, 14, TINTA, 1);
    texto(ctx, `Confianza IA ${hz.conf}%`, x + 38, yy + 10, 500, 11, [100, 110, 130], 1);
    texto(ctx, i === 0 ? 'ALTA' : 'MEDIA', x + w - 16, yy, 700, 11, hz.color, 1, 'right');
  });
  // Mantenimiento programado
  const km = clamp((t - 9.6) / 0.4);
  if (km > 0) {
    ctx.globalAlpha = a0 * km;
    rrect(ctx, x + 16, y + h - 58, w - 32, 40, 10); ctx.fillStyle = rgba(VERDE, 0.14); ctx.fill();
    texto(ctx, '✓ Mantenimiento programado', x + 28, y + h - 38, 700, 13, [20, 120, 60], 1);
  }
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }
  const v = vuelo(t);
  // Punto del dron (en coordenadas del póster) luego de moverlo e inclinarlo
  const mover = ([px, py]) => {
    const c = Math.cos(v.rot), s = Math.sin(v.rot), x = px - CENTRO[0], y = py - CENTRO[1];
    return [CENTRO[0] + v.dx + x * c - y * s, CENTRO[1] + v.dy + x * s + y * c];
  };
  const cam = mover(CAMARA);

  // ---- Haces de escaneo y detecciones sobre los silos
  HALLAZGOS.forEach(hz => {
    const d = t - hz.t0;
    if (d > 0 && d < ESCANEO + 0.3) haz(ctx, cam, hz, d / ESCANEO, g * env(d, 0, 0.25, ESCANEO, ESCANEO + 0.3));
    if (d > ESCANEO - 0.1) {
      const k = clamp((d - ESCANEO + 0.1) / 0.5);
      emitters(t, hz.t0 + ESCANEO, hz.t0 + ESCANEO + 0.1, 5, 1.2, p => sonar(ctx, hz.x, hz.y, p, 10, 60, 3, hz.color, 0.8 * g));
      deteccion(ctx, hz, k, g);
    }
  });

  // ---- Dron: placa limpia y recorte volando
  sprite(ctx, 'fondoDron');
  sprite(ctx, 'dron', v.dx, v.dy, 1, v.rot, 1, CENTRO[0], CENTRO[1]);
  // Hélices girando (discos de movimiento)
  HELICES.forEach(([hx, hy], i) => {
    const [x, y] = mover([hx, hy]);
    ctx.save(); ctx.translate(x, y - 3); ctx.rotate(v.rot); ctx.scale(1, 0.22);
    const gr = ctx.createRadialGradient(0, 0, 6, 0, 0, 44);
    gr.addColorStop(0, rgba(TINTA, 0)); gr.addColorStop(0.75, rgba(TINTA, 0.16 * g)); gr.addColorStop(1, rgba(TINTA, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill();
    const ang = t * 38 + i * 1.3; // aspa borrosa que gira
    ctx.rotate(ang); ctx.fillStyle = rgba(TINTA, 0.22 * g);
    ctx.beginPath(); ctx.ellipse(0, 0, 42, 5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  });
  // Luces de navegación
  const parpadeo = Math.pow(Math.max(0, Math.sin(t * TAU / 1.1)), 8);
  glowDot(ctx, ...mover([556, 300]), 12, ROJO, g * (0.3 + 0.7 * parpadeo));
  glowDot(ctx, ...mover([762, 286]), 12, VERDE, g * (0.3 + 0.7 * parpadeo));

  // ---- Reporte en la pared
  reporte(ctx, t, g);

  // ---- Íconos: inspección (vuelo), análisis (cada hallazgo), misión, alertas (reporte)
  const etapas = [[1.0, 0], [3.6, 1], [6.3, 1], [9.0, 1], [5.0, 2], [9.6, 3]];
  etapas.forEach(([t0, i]) => {
    const [x, y] = ICONOS[i];
    emitters(t, t0, t0 + 0.1, 5, 1.3, p => sonar(ctx, x, y, p, 26, 58, 2.6, AZUL, 0.75 * g));
    glowDot(ctx, x, y, 40, CIAN, 0.3 * g * env(t, t0, t0 + 0.2, t0 + 0.5, t0 + 1.2));
  });

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);

const _M = typeof MARGEN !== 'undefined' ? MARGEN : 0;
global.AeroInspectAnim = { WIDTH: W * (1 + 2 * _M), HEIGHT: H * (1 + 2 * _M), MARGIN: _M, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
