/*
 * AgroLink · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * El camión "anda": rebota con la suspensión, el cielo se llena de nubes y pájaros que avanzan, la ruta
 * pasa en ráfagas, levanta polvo y los faros brillan. Encima, los 3 puntos de la flota emiten señal
 * hacia sus funciones (como en el póster) y un destello cruza la barra "Conocé más".
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const BLUE = [70, 180, 255], GREEN = [110, 255, 130], WHITE = [255, 255, 255], DUST = [196, 182, 158];
const G = t => env(t, 0.25, 0.9, 9.0, 9.75);

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

/** Recorta (evenodd) las zonas que no deben tocar los efectos de fondo: píldoras y líneas de datos. */
function excluirUI(ctx, rects) {
  ctx.beginPath();
  ctx.rect(-50, -50, DW + 100, DH + 100);
  for (const [x, y, w, h] of rects) ctx.rect(x, y, w, h);
  ctx.clip('evenodd');
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // ---- Cielo: nubes que avanzan hacia la izquierda (el camión va hacia allá) y pájaros
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

  // ---- Camión: suspensión y vibración (recorte real del póster)
  const bote = 2.4 * Math.sin(t * 11) + 1.2 * Math.sin(t * 17.3 + 1);
  const cabeceo = 0.0035 * Math.sin(t * 2.3) + 0.0018 * Math.sin(t * 11);
  sprite(ctx, 'camion', 0, bote * g, 1, cabeceo * g, 1, 480, 985);

  // ---- Ruta: ráfagas de velocidad (de izquierda a derecha) fuera de píldoras y líneas
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 1008, DW, 172); ctx.clip();
  excluirUI(ctx, [[250, 1042, 345, 80], [625, 1012, 245, 86], [488, 940, 24, 130], [698, 1010, 24, 40]]);
  for (let i = 0; i < 26; i++) {
    const v = 640 + rnd(i, 1) * 520, len = 90 + rnd(i, 2) * 170, y = 1020 + rnd(i, 3) * 150;
    const x = ((t * v + rnd(i, 4) * (DW + 300)) % (DW + 300)) - 150;
    const gr = ctx.createLinearGradient(x, 0, x + len, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, rgba(WHITE, 0.45 * g));
    ctx.fillStyle = gr; ctx.fillRect(x, y, len, 1.6 + rnd(i, 5) * 1.6);
  }
  ctx.restore();

  // ---- Polvo desde las ruedas traseras del acoplado
  for (let k = 0; k < 2; k++) {
    emitters(t, 0.6, 9.2, 0.45, 2.0, (p, i) => {
      const bx = (k ? 818 : 858) + rnd(i, 20 + k) * 14, by = 972 + rnd(i, 22 + k) * 12;
      const x = bx + 90 * easeOut(p) + rnd(i, 24) * 20, y = by - 26 * p - rnd(i, 26) * 18;
      blob(ctx, x, y, 16 + 46 * p, DUST, 0.5 * (1 - p) * g);
    });
  }
  // Escape del tren delantero
  emitters(t, 0.6, 9.2, 0.6, 1.6, (p, i) => blob(ctx, 330 + 110 * easeOut(p) + rnd(i, 30) * 14, 1000 - 18 * p, 10 + 28 * p, [150, 150, 150], 0.22 * (1 - p) * g));

  // ---- Faros
  const pulsoFaro = 0.55 + 0.45 * Math.sin(t * 5);
  [[108, 912], [304, 917]].forEach(([x, y]) => {
    blob(ctx, x, y, 46 + 6 * pulsoFaro, [255, 245, 200], 0.55 * g * pulsoFaro);
    sparkle(ctx, x, y, 14, WHITE, 0.8 * g * pulsoFaro);
  });

  // ---- Tablero de la flota: datos en vivo sobre el camión
  const vel = Math.round(80 + 6 * Math.sin(t * 1.7) + 3 * Math.sin(t * 4.1));
  const comb = (68 - t * 0.35).toFixed(1);
  const ventana = (a, b) => [env(t, a, a + 0.5, b - 0.6, b), clamp((t - a) / 0.6)];
  let [va, vk] = ventana(1.6, 5.2); chip(ctx, 64, 404, 214, 48, 'Velocidad', vel + ' km/h', BLUE, va * g, vk);
  [va, vk] = ventana(3.0, 6.8); chip(ctx, 300, 446, 236, 48, 'Combustible', comb + ' %', GREEN, va * g, vk);
  [va, vk] = ventana(4.6, 8.4); chip(ctx, 96, 482, 236, 48, 'Ubicación', 'Ruta 9 · Km ' + (312 + Math.floor(t * 2)), BLUE, va * g, vk);

  // ---- Flota: señales hacia cada función
  NODES.forEach((n, i) => {
    emitters(t, n.delay, 8.6, 2.6, 1.3, (p) => signal(ctx, n.line, p, n.c, 0.95 * g, 60, 9));
    emitters(t, n.delay - 0.5, 9.2, 1.7, 1.5, (p) => sonar(ctx, n.x, n.y, p, 6, 38, 2.4, n.c, 0.8 * g));
    glowDot(ctx, n.x, n.y, 15 + 3 * Math.sin(t * 4 + i), n.c, 0.55 * g);
  });
  PILLS.forEach((p, i) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 2.1);
    glowRect(ctx, p.x, p.y, p.w, p.h, p.r, p.c, (0.25 + 0.4 * pulse) * g, 2.5, 16);
    emitters(t, NODES[i].delay + 1.0, 8.8, 2.6, 1.0, (q) => sheen(ctx, p.x, p.y, p.w, p.h, p.r, q, 0.5 * g));
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
