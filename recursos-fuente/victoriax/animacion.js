/*
 * VictoriaX · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Idea: dos corrientes de luz (aprendizaje azul, simulación rosa) convergen en la X central,
 * que irradia ondas; los hitos del camino y el diagrama se encienden en secuencia.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const BLUE = [70, 140, 255], PINK = [245, 80, 200], VIOLET = [150, 100, 245], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);
const CX = 493, CY = 572;

const CHECKS = [[196, 466], [250, 528], [196, 617], [262, 688], [268, 750]];
const FLOW = [[700, 351], [735, 392], [765, 432], [770, 488], [858, 512], [792, 540], [846, 582]];
const BOTTOM = [[126, 1035], [126, 1128], [503, 1035], [503, 1128]];
const STREAMS = (() => { // partículas de las dos corrientes
  const a = []; let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) a.push({ side: i % 2 ? 1 : -1, off: (rnd() - 0.5) * 2, ph: rnd(), sp: 0.16 + rnd() * 0.14, sz: 2.5 + rnd() * 3 });
  return a;
})();

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // Corrientes de luz hacia la X
  STREAMS.forEach(p => {
    const q = (t * p.sp + p.ph) % 1;
    const startX = CX + p.side * 330, x = startX + (CX + p.side * 30 - startX) * easeInOut(q);
    const y = CY + p.off * (62 * (1 - 0.88 * q)) + Math.sin(t * 2 + p.ph * 9) * 4 * (1 - q);
    const a = Math.sin(Math.PI * q) * 0.9 * g;
    glowDot(ctx, x, y, p.sz * 3.2, p.side < 0 ? BLUE : PINK, a);
  });

  // Ondas desde la X (azul → rosa)
  emitters(t, 0.8, 8.8, 1.7, 2.2, (p) => {
    const r = 50 + 200 * easeOut(p), a = (1 - p) * 0.6 * g;
    const gr = ctx.createLinearGradient(CX - r, 0, CX + r, 0);
    gr.addColorStop(0, rgba(BLUE, a)); gr.addColorStop(0.5, rgba(VIOLET, a)); gr.addColorStop(1, rgba(PINK, a));
    ctx.beginPath(); ctx.arc(CX, CY, r, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = gr; ctx.stroke();
  });
  glowDot(ctx, CX, CY, 110 + 18 * Math.sin(t * 3), VIOLET, 0.28 * g);
  sparkle(ctx, CX, CY - 4, 46, WHITE, 0.9 * g * (0.55 + 0.45 * Math.sin(t * 2.4)));

  // Camino de aprendizaje: hitos que se activan en orden
  CHECKS.forEach(([x, y], i) => {
    const t0 = 1.2 + i * 0.7;
    emitters(t, t0, 8.6, 4.2, 1.3, (p) => sonar(ctx, x, y, p, 16, 44, 2.6, BLUE, 0.9 * g));
    glowDot(ctx, x, y, 26, BLUE, 0.4 * g * env(t, t0, t0 + 0.3, t0 + 0.7, t0 + 1.3));
  });

  // Diagrama de flujo: nodos en secuencia
  FLOW.forEach(([x, y], i) => {
    const t0 = 1.4 + i * 0.6;
    emitters(t, t0, 8.6, 4.4, 1.2, (p) => sonar(ctx, x, y, p, 10, 40, 2.4, PINK, 0.9 * g));
    glowDot(ctx, x, y, 30, PINK, 0.4 * g * env(t, t0, t0 + 0.3, t0 + 0.7, t0 + 1.3));
  });

  // Gráficos: barra/línea con destello
  sparkle(ctx, 880, 650, 20, WHITE, 0.95 * g * env(t, 3.0, 3.4, 3.7, 4.3));
  sparkle(ctx, 910, 628, 16, WHITE, 0.95 * g * env(t, 6.0, 6.4, 6.7, 7.3));
  sparkle(ctx, 880, 780, 20, VIOLET, 0.95 * g * env(t, 4.6, 5.0, 5.3, 5.9));

  // Pilares inferiores
  BOTTOM.forEach(([x, y], i) => {
    const t0 = 5.2 + i * 0.5, col = i % 2 ? PINK : BLUE;
    emitters(t, t0, t0 + 0.1, 9, 1.3, (p) => sonar(ctx, x, y, p, 36, 64, 2.6, col, 0.85 * g));
  });

  // Código QR
  glowRect(ctx, 845, 1012, 145, 153, 22, VIOLET, g * env(t, 7.4, 7.8, 8.4, 9.1) * 0.95, 3.5, 20);
  sheen(ctx, 845, 1012, 145, 153, 22, (t - 7.2) / 1.5, 0.45 * g);

  ctx.restore();
}

const load = () => Promise.resolve();
