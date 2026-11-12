/*
 * AgroLink · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * El camión arranca, se despega del papel (deja su hueco en el póster), sale por la izquierda y da una
 * vuelta completa ALREDEDOR del póster, por la pared, achicado como un camioncito de juguete, con un pin
 * de GPS que lo sigue y su rastro punteado. Después vuelve por la derecha y se estaciona en su lugar.
 * Mientras tanto: nubes y pájaros, ráfagas en la ruta, polvo y faros (cuando está en su lugar), los 3
 * puntos de la flota emiten señal hacia sus funciones y un destello cruza la barra "Conocé más".
 * El lienzo se extiende un 30 % por lado alrededor del póster (MARGEN) para que el camión pueda salir.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 14, MARGEN = 0.4;
const BLUE = [70, 180, 255], GREEN = [110, 255, 130], WHITE = [255, 255, 255], DUST = [196, 182, 158];
const G = t => env(t, 0.25, 0.9, 12.9, 13.6);

const NODES = [
  { x: 572, y: 565, c: BLUE, line: polyline([[572, 560], [572, 438], [630, 438]]), delay: 0.9 },
  { x: 500, y: 954, c: GREEN, line: polyline([[500, 948], [500, 1056]]), delay: 1.4 },
  { x: 622, y: 938, c: BLUE, line: polyline([[622, 938], [710, 938], [710, 1026]]), delay: 1.9 },
];
const PILLS = [
  { x: 628, y: 412, w: 284, h: 55, r: 27, c: BLUE },
  { x: 262, y: 1054, w: 318, h: 55, r: 27, c: GREEN },
  { x: 637, y: 1024, w: 220, h: 62, r: 31, c: BLUE },
];

// ---- Viaje del camión (centro del recorte: 511, 763). Cuadros clave: avanza hacia vos (crece), se va
// por la izquierda, dobla en la pared y pasa POR DETRÁS del póster (el papel lo tapa), reaparece por la
// derecha, vuelve a doblar y viene hacia adelante hasta estacionar en su lugar.
// sx: 1 = mira a la izquierda (como en el póster), -1 = espejado; al pasar por 0 parece que dobla.
const CASA = [511, 763];
const CLAVES = [
  { t: 2.4, x: 511, y: 763, sc: 1.0, sx: 1 },
  { t: 3.4, x: 400, y: 905, sc: 1.32, sx: 1 },    // sale hacia adelante
  { t: 4.5, x: -120, y: 930, sc: 0.95, sx: 1 },   // se va por la izquierda
  { t: 5.0, x: -255, y: 860, sc: 0.62, sx: 0 },   // dobla en la pared
  { t: 5.5, x: -205, y: 760, sc: 0.4, sx: -1 },   // ya lejos, mirando a la derecha
  { t: 7.6, x: 1195, y: 760, sc: 0.4, sx: -1 },   // pasó por detrás del póster
  { t: 8.1, x: 1255, y: 850, sc: 0.56, sx: 0 },   // dobla del otro lado
  { t: 8.6, x: 1170, y: 930, sc: 0.75, sx: 1 },
  { t: 9.9, x: 560, y: 885, sc: 1.28, sx: 1 },    // pasa por adelante, grande
  { t: 10.7, x: 511, y: 763, sc: 1.0, sx: 1 },    // estaciona
];
const T_DETRAS = [5.5, 7.6];
const T = { despega: 1.8, sale: 2.4, aterriza: 10.7 };

/** Catmull-Rom entre cuadros clave (movimiento continuo, sin frenar en cada clave). */
function interpolar(t, prop) {
  const n = CLAVES.length;
  if (t <= CLAVES[0].t) return CLAVES[0][prop];
  if (t >= CLAVES[n - 1].t) return CLAVES[n - 1][prop];
  let i = 0; while (CLAVES[i + 1].t < t) i++;
  const p0 = CLAVES[Math.max(0, i - 1)][prop], p1 = CLAVES[i][prop], p2 = CLAVES[i + 1][prop], p3 = CLAVES[Math.min(n - 1, i + 2)][prop];
  let u = (t - CLAVES[i].t) / (CLAVES[i + 1].t - CLAVES[i].t);
  if (i === 0) u = easeInOut(u * 0.5) * 2 * 0.5 + u * 0.5; // arranca suave
  if (i === n - 2) u = 1 - (1 - u) * (1 - u);              // frena suave al estacionar
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}

/** Estado del camión en el instante t. */
function camion(t) {
  const alto = env(t, T.despega, T.sale, T.aterriza - 0.3, T.aterriza + 0.2);
  const x = interpolar(t, 'x'), y = interpolar(t, 'y'), sc = interpolar(t, 'sc');
  // El espejado se interpola linealmente (al cruzar 0 el camión "dobla")
  let sx = 1;
  for (let i = 0; i < CLAVES.length - 1; i++) {
    const a = CLAVES[i], b = CLAVES[i + 1];
    if (t >= a.t && t < b.t) { sx = a.sx + (b.sx - a.sx) * smooth(0, 1, (t - a.t) / (b.t - a.t)); break; }
  }
  if (Math.abs(sx) < 0.08) sx = sx < 0 ? -0.08 : 0.08;
  const aterrizaje = t > T.aterriza ? -16 * Math.sin(Math.PI * clamp((t - T.aterriza) / 0.35)) * Math.exp(-(t - T.aterriza) * 3) : 0;
  const lejos = smooth(T.sale + 0.1, T.sale + 0.6, t) * (1 - smooth(T.aterriza - 0.4, T.aterriza, t));
  const detras = t >= T_DETRAS[0] && t < T_DETRAS[1];
  return { x, y: y - 12 * alto + aterrizaje, sc: sc * (1 + 0.05 * alto), sx, alto, lejos, detras };
}

/** Recorta para dibujar sólo FUERA del póster (lo que está detrás del papel no se ve). */
function soloFuera(ctx) {
  ctx.beginPath(); ctx.rect(-600, -800, DW + 1200, DH + 1600); ctx.rect(0, 0, DW, DH); ctx.clip('evenodd');
}

/** Recorta (evenodd) las zonas que no deben tocar los efectos de fondo: píldoras y líneas de datos. */
function excluirUI(ctx, rects) {
  ctx.beginPath();
  ctx.rect(-50, -50, DW + 100, DH + 100);
  for (const [x, y, w, h] of rects) ctx.rect(x, y, w, h);
  ctx.clip('evenodd');
}

/** Pin de GPS con etiqueta. */
function pinGps(ctx, x, y, texto, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = clamp(a);
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - 6, y - 12, x - 16, y - 18, x - 16, y - 30); ctx.arc(x, y - 30, 16, Math.PI, 0); ctx.bezierCurveTo(x + 16, y - 18, x + 6, y - 12, x, y);
  ctx.fillStyle = '#ff4d5e'; ctx.shadowColor = 'rgba(255,77,94,0.8)'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(x, y - 30, 6, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.font = '700 15px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const w = ctx.measureText(texto).width + 20;
  rrect(ctx, x + 20, y - 46, w, 28, 14); ctx.fillStyle = 'rgba(6,18,46,0.85)'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(texto, x + 30, y - 32);
  ctx.restore();
}

/** Globito "¡Bip bip!". */
function bocina(ctx, x, y, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.translate(x, y); ctx.scale(0.6 + 0.4 * a, 0.6 + 0.4 * a);
  rrect(ctx, -58, -26, 116, 46, 22); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(20, 18); ctx.lineTo(34, 36); ctx.lineTo(4, 18); ctx.fill();
  ctx.fillStyle = '#123'; ctx.font = '800 20px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('¡Bip bip!', 0, -2);
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // ---- Cielo: nubes que avanzan hacia la izquierda (el camión va hacia allá) y pájaros
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, DW, DH); ctx.clip(); // el cielo es del papel: no sale
  for (let i = 0; i < 5; i++) {
    const per = 8 + i * 1.6, ph = rnd(i, 3), q = ((t / per + ph) % 1);
    const x = DW + 160 - q * (DW + 420), y = 352 + rnd(i, 5) * 44, sc = 0.5 + rnd(i, 7) * 0.45;
    cloud(ctx, x, y, sc, 0.55 * g * Math.sin(Math.PI * clamp(q * 1.1)) * (0.7 + 0.3 * rnd(i, 9)));
  }
  for (let i = 0; i < 3; i++) {
    const q = ((t * (0.11 + i * 0.02) + rnd(i, 11)) % 1), x = DW + 40 - q * (DW + 120), y = 330 + i * 38 + Math.sin(q * 9 + i) * 14;
    const flap = Math.sin(t * 9 + i * 2) * 7;
    ctx.beginPath(); ctx.moveTo(x - 11, y - flap * 0.6); ctx.quadraticCurveTo(x - 4, y - 5 - flap, x, y);
    ctx.quadraticCurveTo(x + 4, y - 5 - flap, x + 11, y - flap * 0.6);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = rgba([25, 40, 70], 0.75 * g * Math.sin(Math.PI * q)); ctx.stroke();
  }

  ctx.restore();

  // ---- Camión. Es un recorte con la silueta del camión que se mueve sobre una "placa limpia" (el póster
  // con el camión borrado). En su lugar, los nodos de la UI quedan fijos (fuera de la máscara); cuando se
  // va, se borra entero (fondoVacio), queda su hueco en el papel y los nodos se redibujan.
  const c = camion(t), enCasa = 1 - c.lejos;
  const bote = (1.3 * Math.sin(t * 11) + 0.6 * Math.sin(t * 17.3 + 1)) * (c.lejos > 0 ? 2.2 : 1);
  const cabeceo = 0.0022 * Math.sin(t * 2.3) + 0.0009 * Math.sin(t * 11);
  sprite(ctx, 'fondoCamion', 0, 0, 1, 0, g);
  if (c.lejos > 0.01) {
    sprite(ctx, 'fondoVacio', 0, 0, 1, 0, c.lejos * g);
    NODES.forEach((n) => {
      ctx.beginPath(); for (let s2 = 0; s2 <= n.line.total; s2 += 6) { const [lx, ly] = n.line.at(s2); s2 ? ctx.lineTo(lx, ly) : ctx.moveTo(lx, ly); }
      ctx.lineWidth = 2.4; ctx.strokeStyle = rgba(n.c, 0.9 * c.lejos * g); ctx.stroke();
      ring(ctx, n.x, n.y, 7, 3, n.c, c.lejos * g);
    });
  }

  // ---- Ruta: ráfagas de velocidad (de izquierda a derecha) fuera de píldoras y líneas
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 1008, DW, 172); ctx.clip();
  excluirUI(ctx, [[250, 1042, 345, 80], [625, 1012, 245, 86], [488, 940, 24, 130], [698, 1010, 24, 40]]);
  for (let i = 0; i < 26 * (enCasa > 0.05 ? 1 : 0); i++) {
    const v = 640 + rnd(i, 1) * 520, len = 90 + rnd(i, 2) * 170, y = 1020 + rnd(i, 3) * 150;
    const x = ((t * v + rnd(i, 4) * (DW + 300)) % (DW + 300)) - 150;
    const gr = ctx.createLinearGradient(x, 0, x + len, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, rgba(WHITE, 0.45 * g * enCasa));
    ctx.fillStyle = gr; ctx.fillRect(x, y, len, 1.6 + rnd(i, 5) * 1.6);
  }
  ctx.restore();

  // ---- Polvo desde las ruedas traseras del acoplado (sólo con el camión en su lugar)
  const gc = g * enCasa * (1 - c.alto);
  for (let k = 0; k < 2; k++) {
    emitters(t, 0.6, 13.2, 0.45, 2.0, (p, i) => {
      const bx = (k ? 818 : 858) + rnd(i, 20 + k) * 14, by = 972 + rnd(i, 22 + k) * 12;
      const x = bx + 90 * easeOut(p) + rnd(i, 24) * 20, y = by - 26 * p - rnd(i, 26) * 18;
      blob(ctx, x, y, 16 + 46 * p, DUST, 0.5 * (1 - p) * gc);
    });
  }
  // Escape del tren delantero
  emitters(t, 0.6, 13.2, 0.6, 1.6, (p, i) => blob(ctx, 330 + 110 * easeOut(p) + rnd(i, 30) * 14, 1000 - 18 * p, 10 + 28 * p, [150, 150, 150], 0.22 * (1 - p) * gc));

  // ---- El camión (despegado o en su lugar), el humo, el pin de GPS y la bocina
  if (c.lejos > 0.05 && !c.detras) {
    emitters(t, T.sale, T.aterriza, 0.1, 0.8, (p, i) => {
      const q = camion(t - p * 0.8);
      if (q.detras) return;
      const atras = q.sx > 0 ? 1 : -1;
      blob(ctx, q.x + atras * 330 * q.sc + rnd(i, 1) * 20, q.y + 150 * q.sc - 30 * p, (14 + 40 * p) * q.sc * 1.6, DUST, 0.45 * (1 - p) * g * q.lejos);
    });
  }
  sprite(ctx, 'siluetaHueco', 0, 0, 1, 0, c.alto * g); // el hueco en el papel (antes del recorte)
  ctx.save();
  if (c.detras) soloFuera(ctx);
  despegar(ctx, 'camion', {
    base: 'silueta', alto: c.detras ? 0 : c.alto * g, hueco: 0,
    dx: c.x - CASA[0], dy: c.y - CASA[1] + bote * g * (c.lejos > 0 ? 1.6 : 1),
    sx: c.sc * c.sx, sy: c.sc, rot: cabeceo * g, px: CASA[0], py: CASA[1],
  });
  ctx.restore();
  // El GPS lo sigue aunque esté detrás del póster
  if (c.lejos > 0.05) pinGps(ctx, c.x, c.y - 230 * c.sc - 10, 'Ruta 9 · Km ' + (312 + Math.floor(t * 9)), c.lejos * g);
  bocina(ctx, 300, 560, g * env(t, 1.9, 2.1, 2.6, 2.9));
  bocina(ctx, 760, 560, g * env(t, 11.2, 11.4, 11.9, 12.2));

  // ---- Faros
  const pulsoFaro = 0.55 + 0.45 * Math.sin(t * 5);
  [[108, 912], [304, 917]].forEach(([x, y]) => {
    blob(ctx, x, y, 46 + 6 * pulsoFaro, [255, 245, 200], 0.55 * gc * pulsoFaro);
    sparkle(ctx, x, y, 14, WHITE, 0.8 * gc * pulsoFaro);
  });


  // ---- Tablero de la flota: datos en vivo sobre el camión
  const vel = Math.round(80 + 6 * Math.sin(t * 1.7) + 3 * Math.sin(t * 4.1));
  const comb = (68 - t * 0.35).toFixed(1);
  const ventana = (a, b) => [env(t, a, a + 0.5, b - 0.6, b), clamp((t - a) / 0.6)];
  let [va, vk] = ventana(4.4, 8.4); chip(ctx, 64, 404, 214, 48, 'Velocidad', vel + ' km/h', BLUE, va * g, vk);
  [va, vk] = ventana(5.6, 9.6); chip(ctx, 300, 446, 236, 48, 'Combustible', comb + ' %', GREEN, va * g, vk);

  // ---- Flota: señales hacia cada función
  NODES.forEach((n, i) => {
    emitters(t, n.delay, 12.6, 2.6, 1.3, (p) => signal(ctx, n.line, p, n.c, 0.95 * g, 60, 9));
    emitters(t, n.delay - 0.5, 13.2, 1.7, 1.5, (p) => sonar(ctx, n.x, n.y, p, 6, 38, 2.4, n.c, 0.8 * g));
    glowDot(ctx, n.x, n.y, 15 + 3 * Math.sin(t * 4 + i), n.c, 0.55 * g);
  });
  PILLS.forEach((p, i) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 2.1);
    glowRect(ctx, p.x, p.y, p.w, p.h, p.r, p.c, (0.25 + 0.4 * pulse) * g, 2.5, 16);
    emitters(t, NODES[i].delay + 1.0, 12.8, 2.6, 1.0, (q) => sheen(ctx, p.x, p.y, p.w, p.h, p.r, q, 0.5 * g));
  });

  // ---- Barra verde y logotipo
  sheen(ctx, 0, 1183, DW, 50, 0, (t - 5.2) / 2.2, 0.42 * g);
  sheen(ctx, 0, 1183, DW, 50, 0, (t - 1.4) / 1.8, 0.3 * g);
  sparkle(ctx, 243, 99, 22, WHITE, 0.95 * g * env(t, 2.0, 2.4, 2.6, 3.2));
  sparkle(ctx, 779, 102, 20, WHITE, 0.9 * g * env(t, 4.8, 5.2, 5.4, 6.0));
  sparkle(ctx, 598, 135, 16, WHITE, 0.8 * g * env(t, 6.8, 7.1, 7.3, 7.9));

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
