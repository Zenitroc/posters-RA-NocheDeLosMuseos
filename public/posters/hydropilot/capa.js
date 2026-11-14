/* hydropilot · capa Canvas transparente generada por recursos-fuente/construir.mjs (no editar a mano). */
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

const SPRITES_SRC = {"hojas":{"x":376,"y":282,"w":244,"h":136,"pw":279,"ph":155,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"},"fondoHojas":{"x":366,"y":272,"w":264,"h":150,"pw":151,"ph":86,"feather":[0,0,0,0],"src":"data:image/webp;base64,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"}};
/*
 * HydroPilot · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * "Precisión en cada gota": gotas de agua caen dentro del logo hasta el cuenco y lo hacen ondular; las hojas
 * del logo (recorte real del póster, sobre una placa limpia) se mecen y rebotan con cada gota. A los costados
 * aparecen las lecturas del cultivo (pH, conductividad, temperatura, nivel) que se actualizan solas, y las
 * cuatro tarjetas (anomalías, optimización, forecasting, simulación) se encienden en secuencia.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const AGUA = [26, 170, 205], AGUA_C = [150, 225, 245], VERDE = [120, 200, 90], VERDE_O = [30, 90, 30], BLANCO = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const BASE = [502, 410];             // base de las hojas (pivote)
const CUENCO = [498, 446];           // donde caen las gotas
const GOTAS = [1.2, 3.6, 6.0];       // momento en que cada gota toca el cuenco
const CAIDA = 0.75;                  // duración de la caída
const TARJETAS = [[35, 884, 212, 226, 141], [273, 884, 211, 226, 379], [510, 884, 211, 226, 617], [747, 884, 212, 226, 853]];

/** Gota con brillo (forma de lágrima). */
function gota(ctx, x, y, s, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const gr = ctx.createLinearGradient(-6, -14, 6, 8);
  gr.addColorStop(0, rgba(AGUA_C, a)); gr.addColorStop(1, rgba(AGUA, a));
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(0, -16);
  ctx.bezierCurveTo(3, -9, 8, -4, 8, 2); ctx.arc(0, 2, 8, 0, Math.PI); ctx.bezierCurveTo(-8, -4, -3, -9, 0, -16);
  ctx.fill();
  ctx.fillStyle = rgba(BLANCO, 0.85 * a); ctx.beginPath(); ctx.ellipse(-3, 0, 1.8, 3.6, 0.3, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Lectura del cultivo: píldora translúcida con etiqueta y valor. */
function lectura(ctx, x, y, etiqueta, valor, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a;
  rrect(ctx, x, y, 176, 54, 27); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = rgba(AGUA_C, 1); ctx.beginPath(); ctx.arc(x + 25, y + 27, 7, 0, TAU); ctx.fill();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = FUENTE(500, 13); ctx.fillStyle = 'rgba(220,240,220,0.95)'; ctx.fillText(etiqueta, x + 42, y + 18);
  ctx.font = FUENTE(700, 21); ctx.fillStyle = '#fff'; ctx.fillText(valor, x + 42, y + 37);
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }

  // ---- Rebote de las hojas con cada gota + vaivén
  let rebote = 0;
  GOTAS.forEach(tg => { const d = t - tg; if (d > 0) rebote += Math.exp(-d * 3.2) * Math.sin(d * 14); });
  const rot = g * (0.03 * Math.sin(t * TAU / 5) + 0.035 * rebote);
  sprite(ctx, 'fondoHojas');
  spriteT(ctx, 'hojas', { px: BASE[0], py: BASE[1], rot, sy: 1 + g * 0.025 * rebote });

  // ---- Gotas: caen por el centro, salpican y ondulan el cuenco
  GOTAS.forEach((tg, i) => {
    const d = t - tg;
    if (d > -CAIDA && d < 0) {
      const p = (d + CAIDA) / CAIDA, y = 252 + (CUENCO[1] - 10 - 238) * p * p;
      gota(ctx, 500 + 3 * Math.sin(i * 2.1), y, 1.35 + 0.15 * p, g * smooth(0, 0.12, p));
    }
    if (d >= 0 && d < 1.8) {
      for (let r = 0; r < 3; r++) { // ondas elípticas sobre el agua del cuenco
        const q = clamp((d - r * 0.2) / 1.3);
        if (q <= 0 || q >= 1) continue;
        ctx.save(); ctx.translate(CUENCO[0], CUENCO[1]); ctx.scale(1, 0.2);
        ctx.beginPath(); ctx.arc(0, 0, 14 + 70 * easeOut(q), 0, TAU);
        ctx.lineWidth = 3 * (1 - q) + 1; ctx.strokeStyle = rgba(AGUA, 0.8 * g * (1 - q)); ctx.stroke();
        ctx.restore();
      }
      for (let k = 0; k < 6; k++) { // salpicadura
        const q = d / 0.55;
        if (q >= 1) continue;
        const ang = -Math.PI / 2 + (k - 2.5) * 0.42, v = 34 + 10 * rnd(k, i);
        gota(ctx, CUENCO[0] + Math.cos(ang) * v * q, CUENCO[1] + Math.sin(ang) * v * q + 60 * q * q, 0.32, g * (1 - q));
      }
      glowDot(ctx, CUENCO[0], CUENCO[1], 50, AGUA_C, 0.4 * g * Math.exp(-d * 4));
    }
  });

  // ---- Lecturas del cultivo a los costados del logo (se actualizan solas)
  const nivel = 86 + GOTAS.filter(tg => t > tg).length;
  const ent = n => g * smooth(1.6 + n * 0.35, 2.1 + n * 0.35, t);
  lectura(ctx, 40, 446, 'pH', (6.1 + 0.1 * Math.sin(t * 0.9)).toFixed(1), ent(0));
  lectura(ctx, 40, 512, 'Conductividad', `${(1.8 + 0.06 * Math.sin(t * 0.7 + 1)).toFixed(2)} mS`, ent(1));
  lectura(ctx, 774, 446, 'Temperatura', `${(22.4 + 0.3 * Math.sin(t * 0.5)).toFixed(1)} °C`, ent(2));
  lectura(ctx, 774, 512, 'Nivel de solución', `${nivel} %`, ent(3));

  // ---- Tarjetas en secuencia
  TARJETAS.forEach(([x, y, w, h, cx], i) => {
    const t0 = 2.6 + i * 1.1;
    const k = g * env(t, t0, t0 + 0.25, t0 + 0.8, t0 + 1.6);
    glowRect(ctx, x, y, w, h, 28, BLANCO, 0.9 * k, 3, 22);
    emitters(t, t0, t0 + 0.1, 5, 1.2, p => sonar(ctx, cx, 955, p, 30, 66, 2.6, VERDE, 0.85 * g));
    sheen(ctx, x, y, w, h, 28, (t - t0) / 1.1, 0.35 * g, [210, 255, 210]);
  });

  // ---- "Precisión en cada gota": brillo cuando cae la segunda gota
  sheen(ctx, 150, 682, 690, 52, 10, (t - GOTAS[1] - 0.1) / 1.2, 0.35 * g);

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);

const _M = typeof MARGEN !== 'undefined' ? MARGEN : 0;
global.HydroPilotAnim = { WIDTH: W * (1 + 2 * _M), HEIGHT: H * (1 + 2 * _M), MARGIN: _M, DURATION: DUR, load, render };
})(typeof window !== 'undefined' ? window : globalThis);
