/*
 * ZonAR · animación del póster para WebAR
 * ------------------------------------------------------------
 * Fuente única de la animación. Dibuja SOLO los elementos animados
 * sobre un canvas transparente en coordenadas del póster (1131×1600).
 *   - Capa AR:  ZonarAnim.render(ctx, t)              → overlay transparente
 *   - MP4:      ctx.drawImage(poster); ZonarAnim.render(ctx, t)
 * Requiere window.ZONAR_ASSETS (assets.js, recortes del póster original).
 * t en segundos; el ciclo dura ZonarAnim.DURATION y t=0 ≡ t=DURATION ≡ póster intacto.
 */
(function (global) {
  'use strict';
  const W = 1131, H = 1600, DUR = 10;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (e0, e1, x) => { const k = clamp((x - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
  const env = (t, a, b, c, d) => smooth(a, b, t) * (1 - smooth(c, d, t));
  const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
  const easeInOut = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;

  // Paleta muestreada del póster original
  const C = {
    bg: [246, 246, 246], teal: [89, 130, 135], medDisc: [193, 213, 211],
    compass: [88, 119, 124], red: [250, 60, 2], orange: [252, 144, 69],
    mapRed: [238, 86, 58], mapOrange: [244, 160, 64], mapGreen: [128, 188, 92], white: [255, 255, 255]
  };
  // Envolvente global: todo arranca suave y vuelve al estado original antes del loop
  const G = t => env(t, 0.4, 1.2, 8.8, 9.7);

  // ---------- Geometría medida sobre el póster ----------
  const TITLE_BARS = [ // [cx, top, bottom] ancho 11 px
    [103, 183, 243], [133.5, 171, 264], [163.5, 131, 291], [194.5, 150, 276], [225, 183, 243], [255.5, 171, 261], [286, 183, 243],
    [844.5, 183, 243], [875, 171, 261], [905.5, 183, 243], [935.5, 150, 276], [966.5, 131, 291], [997, 171, 264], [1027, 183, 243]
  ];
  const MED = { cx: 309.5, cy: 474, bars: [[274.5, 22], [286, 33], [298, 51], [309.5, 80], [321, 51], [332.5, 33], [343.5, 22]] };
  const COMPASS = { cx: 527, cy: 676.5 };
  const PIN = { cx: 178, cy: 894 };
  const REPORT = { cx: 403.5, cy: 1163 };
  const MAP = { x: 764, y: 596, w: 276, h: 454 };
  const HEAT = [ // cx, cy, r, color, fase
    [972, 627, 34, 'mapOrange', 0.0], [905, 732, 36, 'mapRed', 1.3], [1010, 770, 32, 'mapGreen', 2.1],
    [812, 812, 32, 'mapGreen', 0.7], [960, 970, 36, 'mapRed', 2.7], [830, 616, 28, 'mapGreen', 3.4]
  ];
  const ROUTE = [[852, 730], [881, 752], [916, 775], [960, 795], [1022, 815], [1040, 821]];
  const MAP_PIN_TIP = [855, 835];
  const MIC = [899, 1067];

  // Recorridos punteados (segmentos rectos + arcos), en orden narrativo
  const P = Math.PI;
  const PATHS = [
    { start: 1.0, end: 2.4, color: C.compass, cmds: [['M', 389, 474], ['L', 626, 474], ['A', 626, 498.5, 24.5, -P / 2, P / 2], ['L', 450.5, 523], ['A', 450.5, 544.5, 21.5, -P / 2, -3 * P / 2], ['L', 515, 566], ['A', 515, 578, 12, -P / 2, 0], ['L', 527, 592]] },
    { start: 2.9, end: 4.3, color: C.red, cmds: [['M', 431, 670], ['L', 101, 670], ['A', 101, 696, 26, -P / 2, -3 * P / 2], ['L', 366.5, 722], ['A', 366.5, 744.5, 22.5, -P / 2, P / 2], ['L', 190, 767], ['A', 190, 779, 12, -P / 2, -P], ['L', 178, 800]] },
    { start: 4.7, end: 6.1, color: C.orange, cmds: [['M', 278, 885], ['L', 589, 885], ['A', 589, 915, 30, -P / 2, P / 2], ['L', 372.5, 945], ['A', 372.5, 972.5, 27.5, -P / 2, -3 * P / 2], ['L', 509.5, 1000], ['A', 509.5, 1031.5, 31.5, -P / 2, P / 2], ['L', 417, 1063], ['A', 417, 1075, 12, -P / 2, -P], ['L', 405, 1082]] }
  ];
  const ARRIVE = { compass: PATHS[0].end, pin: PATHS[1].end, report: PATHS[2].end };

  function buildPath(cmds) {
    const pts = []; let cx = 0, cy = 0;
    const push = (x, y) => pts.push([x, y]);
    for (const c of cmds) {
      if (c[0] === 'M') { cx = c[1]; cy = c[2]; push(cx, cy); }
      else if (c[0] === 'L') {
        const n = Math.max(1, Math.ceil(Math.hypot(c[1] - cx, c[2] - cy) / 2));
        for (let i = 1; i <= n; i++) push(cx + (c[1] - cx) * i / n, cy + (c[2] - cy) * i / n);
        cx = c[1]; cy = c[2];
      } else {
        const [, ox, oy, r, a0, a1] = c, n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * r / 2));
        for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; push(ox + r * Math.cos(a), oy + r * Math.sin(a)); }
        cx = ox + r * Math.cos(a1); cy = oy + r * Math.sin(a1);
      }
    }
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, len, total: len[len.length - 1] };
  }
  function pointAt(path, s) {
    s = clamp(s, 0, path.total);
    let lo = 0, hi = path.len.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path.len[m] < s) lo = m; else hi = m; }
    const seg = path.len[hi] - path.len[lo] || 1, k = (s - path.len[lo]) / seg;
    return [path.pts[lo][0] + (path.pts[hi][0] - path.pts[lo][0]) * k, path.pts[lo][1] + (path.pts[hi][1] - path.pts[lo][1]) * k];
  }
  PATHS.forEach(p => { p.geo = buildPath(p.cmds); });
  const ROUTE_GEO = buildPath([['M', ...ROUTE[0]], ...ROUTE.slice(1).map(p => ['L', ...p])]);

  // ---------- Carga de recursos ----------
  const IMG = {};
  let glow = null; // canvas auxiliar para enmascarar el brillo de los guiones
  function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
  async function load(assets) {
    assets = assets || global.ZONAR_ASSETS;
    for (const k of ['compass', 'pin', 'report', 'dash']) IMG[k] = Object.assign({ img: await loadImage(assets[k].src) }, assets[k]);
    glow = document.createElement('canvas'); glow.width = IMG.dash.w; glow.height = IMG.dash.h;
  }

  // ---------- Zonas ----------
  function ring(ctx, x, y, r, width, color, a) {
    if (a <= 0.002 || r <= 0) return;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.lineWidth = width; ctx.strokeStyle = rgba(color, a); ctx.stroke();
  }
  function roundBar(ctx, cx, cy, w, h, color) {
    const r = w / 2, x = cx - r, y = cy - h / 2;
    ctx.beginPath(); ctx.arc(cx, y + r, r, P, 0); ctx.lineTo(x + w, y + h - r); ctx.arc(cx, y + h - r, r, 0, P); ctx.closePath();
    ctx.fillStyle = rgba(color, 1); ctx.fill();
  }
  // Ondas que se emiten periódicamente (cada `period` s entre t0 y t1)
  function emitters(t, t0, t1, period, life, fn) {
    for (let k = 0; ; k++) {
      const s = t0 + k * period; if (s > t1) break;
      const p = (t - s) / life; if (p >= 0 && p <= 1) fn(p, k);
    }
  }
  const excludeRect = (ctx, x, y, w, h) => { ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(x, y, w, h); ctx.clip('evenodd'); };

  // 1 · Ecualizador del título (las barras laterales reaccionan como un vúmetro)
  function zoneTitle(ctx, t) {
    const e = G(t); if (e <= 0.001) return;
    for (let i = 0; i < TITLE_BARS.length; i++) {
      const [cx, top, bot] = TITLE_BARS[i];
      const d = i < 7 ? 6 - i : i - 7; // distancia al logotipo: la onda sale hacia afuera
      const n = 0.55 * Math.sin(TAU * 1.6 * t - d * 0.9) + 0.45 * Math.sin(TAU * 2.7 * t + i * 2.1);
      const h0 = bot - top, h = Math.max(12, h0 * (1 + e * 0.32 * n)), cy = (top + bot) / 2;
      ctx.fillStyle = rgba(C.bg, 1); ctx.fillRect(cx - 8, 98, 16, 230);
      roundBar(ctx, cx, cy, 11, h, C.teal);
    }
  }

  // 2 · Mediciones en tiempo real: forma de onda viva + pulsos de sonido
  function zoneMed(ctx, t) {
    const e = G(t);
    ctx.save(); excludeRect(ctx, 30, 430, 212, 88);
    emitters(t, 0.9, 8.0, 1.5, 1.6, p => ring(ctx, MED.cx, MED.cy, 62 + 46 * easeOut(p), 3, [120, 165, 168], 0.55 * (1 - p) * e));
    ctx.restore();
    if (e <= 0.001) return;
    ctx.beginPath(); ctx.arc(MED.cx, MED.cy, 50, 0, TAU); ctx.fillStyle = rgba(C.medDisc, 1); ctx.fill();
    MED.bars.forEach(([x, h], i) => {
      const n = 0.5 + 0.5 * (0.6 * Math.sin(TAU * 2.3 * t + i * 1.7) + 0.4 * Math.sin(TAU * 3.9 * t + i * 0.6));
      const dx = Math.abs(x - MED.cx), hmax = 2 * Math.sqrt(48 * 48 - dx * dx) - 6;
      const k = 1 + e * (n * 0.9 - 0.45);
      roundBar(ctx, x, MED.cy, 5.6, clamp(h * k, 8, hmax), C.white);
    });
  }

  // 3 · Recorrido luminoso por la línea punteada (cada tramo toma el color del ícono al que llega)
  function zonePaths(ctx, t) {
    const D = IMG.dash, g = glow.getContext('2d'), TRAIL = 150;
    for (const p of PATHS) {
      const speed = p.geo.total / (p.end - p.start);
      const sHead = (t - p.start) * speed;
      if (sHead < 0 || sHead - TRAIL > p.geo.total) continue;
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, D.w, D.h);
      for (let s = Math.max(0, sHead - TRAIL); s <= Math.min(sHead, p.geo.total); s += 3) {
        const k = 1 - (sHead - s) / TRAIL, [x, y] = pointAt(p.geo, s);
        g.beginPath(); g.arc(x - D.x, y - D.y, 9, 0, TAU); g.fillStyle = rgba(p.color, 0.95 * k * k); g.fill();
      }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(D.img, 0, 0);
      ctx.drawImage(glow, D.x, D.y);
      if (sHead <= p.geo.total) { // halo de la "señal"
        const [x, y] = pointAt(p.geo, sHead), gr = ctx.createRadialGradient(x, y, 0, x, y, 16);
        gr.addColorStop(0, rgba(p.color, 0.45)); gr.addColorStop(1, rgba(p.color, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill();
      }
    }
  }

  // 4 · Brújula: la aguja gira al recibir la señal y luego "busca" el norte
  function compassAngle(t) {
    const a = ARRIVE.compass;
    let th = 0;
    if (t >= a && t < a + 1.1) th = TAU * easeInOut((t - a) / 1.1);
    else if (t >= a + 1.1) { const u = t - a - 1.1; th = TAU + 0.35 * Math.sin(TAU * u / 1.2) * Math.exp(-u * 1.4); }
    th += 0.14 * Math.sin(TAU * (t - a) / 2.6) * env(t, a + 1.6, a + 2.6, 8.4, 9.5);
    return th % TAU;
  }
  function zoneCompass(ctx, t) {
    const th = compassAngle(t), e = env(t, ARRIVE.compass - 0.1, ARRIVE.compass + 0.1, ARRIVE.compass + 0.6, ARRIVE.compass + 1.8);
    ring(ctx, COMPASS.cx, COMPASS.cy, 62 + 30 * easeOut((t - ARRIVE.compass) / 1.4), 3, C.compass, 0.5 * e);
    if (Math.abs(Math.sin(th / 2)) < 1e-4) return;
    const s = IMG.compass;
    ctx.save(); ctx.beginPath(); ctx.arc(COMPASS.cx, COMPASS.cy, 57, 0, TAU); ctx.clip();
    ctx.translate(COMPASS.cx, COMPASS.cy); ctx.rotate(th); ctx.drawImage(s.img, s.x - COMPASS.cx, s.y - COMPASS.cy);
    ctx.restore();
  }

  // 5 · Rutas silenciosas: el pin rebota y emite pulsos de ubicación
  function pinOffset(t) {
    let dy = 0;
    const b = (t0, amp) => { const p = (t - t0) / 1.0; if (p > 0 && p < 1) dy -= amp * Math.abs(Math.sin(P * p * 3)) * Math.pow(1 - p, 1.6); };
    b(ARRIVE.pin, 12); b(7.6, 6);
    return dy;
  }
  function zonePin(ctx, t) {
    ctx.save(); excludeRect(ctx, 40, 968, 280, 82);
    emitters(t, ARRIVE.pin, ARRIVE.pin + 1.0, 0.5, 1.5, p => ring(ctx, PIN.cx, PIN.cy, 61 + 40 * easeOut(p), 3, C.red, 0.5 * (1 - p)));
    emitters(t, 7.6, 7.6, 1, 1.5, p => ring(ctx, PIN.cx, PIN.cy, 61 + 30 * easeOut(p), 2.5, C.red, 0.35 * (1 - p)));
    ctx.restore();
    const dy = pinOffset(t); if (Math.abs(dy) < 0.05) return;
    const s = IMG.pin;
    ctx.beginPath(); ctx.arc(PIN.cx, PIN.cy, 51, 0, TAU); ctx.fillStyle = rgba(C.red, 1); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(PIN.cx, PIN.cy + dy, 47, 0, TAU); ctx.clip();
    ctx.drawImage(s.img, s.x, s.y + dy); ctx.restore();
  }

  // 6 · Generación de reportes: el ícono "late" y un barrido recorre el documento
  function zoneReport(ctx, t) {
    const a = ARRIVE.report;
    ctx.save(); excludeRect(ctx, 482, 1128, 170, 90);
    emitters(t, a, a + 0.5, 0.5, 1.4, p => ring(ctx, REPORT.cx, REPORT.cy, 62 + 34 * easeOut(p), 3, C.orange, 0.5 * (1 - p)));
    ctx.restore();
    const pop = (t0, amp, d) => { const p = (t - t0) / d; return p > 0 && p < 1 ? amp * Math.sin(P * p) * (1 - 0.3 * p) : 0; };
    const sc = 1 + pop(a, 0.09, 0.55) + pop(8.1, 0.05, 0.5);
    const scan = (t - (a + 0.35)) / 1.2;
    if (sc === 1 && !(scan > 0 && scan < 1)) return;
    const s = IMG.report;
    ctx.save(); ctx.translate(REPORT.cx, REPORT.cy); ctx.scale(sc, sc);
    ctx.beginPath(); ctx.arc(0, 0, 63, 0, TAU); ctx.clip();
    ctx.drawImage(s.img, s.x - REPORT.cx, s.y - REPORT.cy);
    if (scan > 0 && scan < 1) {
      const y = -42 + 84 * easeInOut(scan), gr = ctx.createLinearGradient(0, y - 12, 0, y + 12), al = 0.45 * Math.sin(P * scan);
      gr.addColorStop(0, rgba(C.white, 0)); gr.addColorStop(0.5, rgba(C.white, al)); gr.addColorStop(1, rgba(C.white, 0));
      ctx.beginPath(); ctx.arc(0, 0, 52, 0, TAU); ctx.clip(); ctx.fillStyle = gr; ctx.fillRect(-60, y - 12, 120, 24);
    }
    ctx.restore();
  }

  // 7 · App: mapa de calor que respira, ondas de ruido, ruta silenciosa iluminada y sonar del micrófono
  function zonePhone(ctx, t) {
    const e = G(t); if (e <= 0.001) return;
    ctx.save(); ctx.beginPath(); ctx.rect(MAP.x, MAP.y, MAP.w, MAP.h); ctx.clip();
    for (const [x, y, r, col, ph] of HEAT) {
      const b = 0.5 + 0.5 * Math.sin(TAU * t / 1.8 + ph), rr = r * (1 + 0.18 * b);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, rgba(C[col], 0.38 * b * e)); gr.addColorStop(1, rgba(C[col], 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
      if (col !== 'mapGreen') emitters(t, 1.0 + ph * 0.3, 8.6, 1.3, 1.3, p => ring(ctx, x, y, 8 + 34 * easeOut(p), 1.6, C[col], 0.45 * (1 - p) * e));
    }
    // ruta: señal que recorre el trayecto sugerido
    for (const [t0, t1] of [[1.6, 4.4], [5.4, 8.2]]) {
      const p = (t - t0) / (t1 - t0); if (p < 0 || p > 1.25) continue;
      const head = ROUTE_GEO.total * easeInOut(Math.min(p, 1)), tail = Math.max(0, head - 70 * (1 - clamp((p - 1) / 0.25)));
      ctx.lineCap = 'round';
      for (let s = tail; s < head; s += 3) {
        const [x0, y0] = pointAt(ROUTE_GEO, s), [x1, y1] = pointAt(ROUTE_GEO, Math.min(head, s + 3.5)), k = (s - tail) / Math.max(1, head - tail);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineWidth = 3.2; ctx.strokeStyle = rgba(C.mapRed, 0.8 * k * e); ctx.stroke();
      }
      if (p <= 1) {
        const [x, y] = pointAt(ROUTE_GEO, head), gr = ctx.createRadialGradient(x, y, 0, x, y, 11);
        gr.addColorStop(0, rgba(C.white, 0.95 * e)); gr.addColorStop(0.35, rgba(C.mapRed, 0.7 * e)); gr.addColorStop(1, rgba(C.mapRed, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
      }
    }
    // pin del mapa: pulso elíptico en la base
    emitters(t, 1.2, 8.4, 1.4, 1.3, p => {
      ctx.beginPath(); ctx.ellipse(MAP_PIN_TIP[0], MAP_PIN_TIP[1], 3 + 15 * easeOut(p), (3 + 15 * easeOut(p)) * 0.42, 0, 0, TAU);
      ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.red, 0.7 * (1 - p) * e); ctx.stroke();
    });
    // sonar del botón de medición
    emitters(t, 0.8, 8.4, 1.2, 2.0, p => ring(ctx, MIC[0], MIC[1], 26 + 95 * easeOut(p), 2.2, C.teal, 0.55 * (1 - p) * e));
    ctx.restore();
  }

  const ZONES = [zoneTitle, zoneMed, zonePaths, zoneCompass, zonePin, zoneReport, zonePhone];
  function render(ctx, t) {
    t = ((t % DUR) + DUR) % DUR;
    for (const z of ZONES) { ctx.save(); z(ctx, t); ctx.restore(); }
  }

  global.ZonarAnim = { WIDTH: W, HEIGHT: H, DURATION: DUR, load, render, _paths: PATHS };
})(typeof window !== 'undefined' ? window : globalThis);
