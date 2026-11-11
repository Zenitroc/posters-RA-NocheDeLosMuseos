/*
 * AgroLink · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Idea: los tres puntos de la flota emiten señal (sonar) y la información viaja por las líneas
 * hacia cada función; las píldoras se iluminan y un destello cruza la barra "Conocé más".
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const BLUE = [70, 180, 255], GREEN = [110, 255, 130], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

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

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // Señales viajando de cada punto de la flota a su función
  NODES.forEach((n, i) => {
    emitters(t, n.delay, 8.6, 2.6, 1.3, (p) => signal(ctx, n.line, p, n.c, 0.95 * g, 60, 9));
    emitters(t, n.delay - 0.5, 9.2, 1.7, 1.5, (p) => sonar(ctx, n.x, n.y, p, 6, 38, 2.4, n.c, 0.8 * g));
    glowDot(ctx, n.x, n.y, 15 + 3 * Math.sin(t * 4 + i), n.c, 0.55 * g);
  });

  // Píldoras: latido del borde + destello al llegar la señal
  PILLS.forEach((p, i) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 2.1);
    glowRect(ctx, p.x, p.y, p.w, p.h, p.r, p.c, (0.25 + 0.4 * pulse) * g, 2.5, 16);
    emitters(t, NODES[i].delay + 1.0, 8.8, 2.6, 1.0, (q) => sheen(ctx, p.x, p.y, p.w, p.h, p.r, q, 0.5 * g));
  });

  // Destello en la barra verde
  const barP = (t - 5.2) / 2.2;
  sheen(ctx, 0, 1183, DW, 50, 0, barP, 0.42 * g);
  // Un segundo, más corto, en el primer tramo del ciclo
  sheen(ctx, 0, 1183, DW, 50, 0, (t - 1.4) / 1.8, 0.3 * g);

  // Centelleos en el logotipo
  sparkle(ctx, 243, 99, 22, WHITE, 0.95 * g * env(t, 2.0, 2.4, 2.6, 3.2));
  sparkle(ctx, 779, 102, 20, WHITE, 0.9 * g * env(t, 4.8, 5.2, 5.4, 6.0));
  sparkle(ctx, 598, 135, 16, WHITE, 0.8 * g * env(t, 6.8, 7.1, 7.3, 7.9));

  ctx.restore();
}

const load = () => Promise.resolve();
