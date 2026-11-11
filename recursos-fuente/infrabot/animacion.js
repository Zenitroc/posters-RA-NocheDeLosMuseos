/*
 * INFRABOT · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Idea: el flujo del reclamo se recorre paso a paso (detecta → analiza → presupuesta → coordina),
 * el robot y los íconos emiten señal, la ciudad se conecta por wifi y los beneficios se encienden.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const TEAL = [30, 190, 190], NAVY = [60, 120, 230], GREEN = [60, 200, 110], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

const STEPS = [ // x, y, w, h, centro del ícono
  { x: 458, y: 354, w: 532, h: 71, ic: [482, 389] },
  { x: 458, y: 468, w: 532, h: 72, ic: [482, 504] },
  { x: 458, y: 580, w: 532, h: 72, ic: [482, 621] },
  { x: 458, y: 692, w: 532, h: 72, ic: [482, 727] },
];
const BENEF = [[70, 905], [255, 905], [442, 905], [612, 905]];

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // Flujo del reclamo: cada paso se ilumina en orden
  STEPS.forEach((s, i) => {
    const t0 = 0.9 + i * 1.35, k = t - t0;
    const act = env(k, 0, 0.3, 1.0, 1.7);
    glowRect(ctx, s.x, s.y, s.w, s.h, 35, NAVY, 0.9 * act * g, 3, 18);
    sheen(ctx, s.x, s.y, s.w, s.h, 35, k / 1.2, 0.5 * g);
    emitters(t, t0, t0 + 0.1, 9, 1.2, (p) => sonar(ctx, s.ic[0], s.ic[1], p, 22, 46, 2.4, NAVY, 0.8 * g));
    glowDot(ctx, s.ic[0], s.ic[1], 34, NAVY, 0.28 * act * g);
    // señal que baja al siguiente paso
    if (i < 3) {
      const path = polyline([[s.ic[0], s.ic[1] + 26], [s.ic[0] - 6, STEPS[i + 1].ic[1] - 26]]);
      signal(ctx, path, (t - (t0 + 0.9)) / 0.8, TEAL, 0.9 * g, 40, 8);
    }
  });
  // Resolución: tilde verde
  emitters(t, 4.9, 8.6, 2.2, 1.4, (p) => sonar(ctx, 684, 741, p, 10, 34, 2.4, GREEN, 0.9 * g));
  glowDot(ctx, 684, 741, 22, GREEN, 0.5 * g * env(t, 4.9, 5.3, 8.2, 8.8));

  // Robot: chispas alrededor y wifi sobre su cabeza
  sparkle(ctx, 150, 430, 18, WHITE, 0.95 * g * env(t, 1.2, 1.6, 1.9, 2.5));
  sparkle(ctx, 330, 560, 16, WHITE, 0.95 * g * env(t, 3.3, 3.7, 4.0, 4.6));
  sparkle(ctx, 120, 650, 17, WHITE, 0.95 * g * env(t, 5.6, 6.0, 6.3, 6.9));
  sparkle(ctx, 305, 440, 15, WHITE, 0.95 * g * env(t, 7.2, 7.6, 7.9, 8.5));
  wifi(ctx, 133, 402, t, 0.8, 9.0, TEAL, 0.9 * g, 1.2, 1.8);

  // Íconos flotantes: WhatsApp, ubicación, reproducir, mensaje
  [[375, 458, 28, 1.0], [401, 648, 26, 2.0], [45, 575, 24, 3.0], [80, 667, 28, 4.0]].forEach(([x, y, r, off]) => {
    emitters(t, off, 8.8, 4.0, 1.4, (p) => sonar(ctx, x, y, p, r, r + 26, 2.4, TEAL, 0.75 * g));
  });

  // Ciudad: señal wifi sobre los edificios
  wifi(ctx, 559, 1042, t, 1.0, 9.0, NAVY, 0.9 * g, 1.1, 2.0);
  wifi(ctx, 921, 1000, t, 2.0, 9.0, NAVY, 0.9 * g, 1.1, 2.0);
  wifi(ctx, 578, 1163, t, 3.0, 9.0, NAVY, 0.9 * g, 1.1, 2.0);

  // Beneficios: se encienden de izquierda a derecha
  BENEF.forEach(([x, y], i) => {
    const t0 = 5.6 + i * 0.6;
    emitters(t, t0, t0 + 0.1, 9, 1.3, (p) => sonar(ctx, x, y, p, 18, 44, 2.6, GREEN, 0.85 * g));
    glowDot(ctx, x, y, 28, GREEN, 0.3 * g * env(t, t0, t0 + 0.3, t0 + 0.8, t0 + 1.4));
  });

  // Recuadro de WhatsApp
  glowRect(ctx, 68, 1036, 327, 107, 6, WHITE, g * env(t, 7.8, 8.2, 8.6, 9.2) * 0.9, 3, 18);
  sheen(ctx, 68, 1036, 327, 107, 6, (t - 7.6) / 1.4, 0.35 * g);

  ctx.restore();
}

const load = () => Promise.resolve();
