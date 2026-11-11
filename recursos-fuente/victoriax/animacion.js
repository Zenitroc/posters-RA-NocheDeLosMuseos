/*
 * VictoriaX · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Las dos mitades de la ilustración (aprendizaje a la izquierda, simulación a la derecha — recortes reales del
 * póster) flotan en contrafase y la X central late; dos corrientes de luz convergen en ella, irradia ondas y
 * rayos, y el fondo pastel se mueve. Los hitos del camino y el diagrama se encienden en secuencia.
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
  begin(ctx, W, H, DW, DH);
  const ph = t / DUR * TAU;

  // ---- Ilustración: mitades que flotan en contrafase y X que late (recortes del póster)
  const fl = Math.sin(ph * 3) * g;
  sprite(ctx, 'izq', 3 * Math.sin(ph * 2) * g, -7 * fl);
  sprite(ctx, 'der', -3 * Math.sin(ph * 2) * g, 7 * fl);
  sprite(ctx, 'equis', 0, 0, 1 + 0.05 * Math.sin(ph * 5) * g, 0.02 * Math.sin(ph * 3) * g);

  // ---- Fondo vivo: manchas azul / rosa que derivan + rayos que giran desde la X
  if (g > 0.002) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 300, DW, 560); ctx.clip();
    for (let i = 0; i < 5; i++) {
      const left = i % 2 === 0, x = (left ? 200 : 790) + 170 * Math.sin(ph * (1 + (i % 3)) + i), y = 420 + i * 70 + 80 * Math.cos(ph * 2 + i * 1.3);
      blob(ctx, x, y, 230 + 40 * Math.sin(ph * 2 + i), left ? BLUE : PINK, 0.15 * g);
    }
    for (let i = 0; i < 14; i++) {
      const ang = ph * 0.5 + (i / 14) * TAU, len = 330;
      const gr = ctx.createLinearGradient(CX, CY, CX + Math.cos(ang) * len, CY + Math.sin(ang) * len);
      const col = mix(BLUE, PINK, (Math.cos(ang) + 1) / 2);
      gr.addColorStop(0, rgba(col, 0.17 * g)); gr.addColorStop(1, rgba(col, 0));
      ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, len, ang - 0.05, ang + 0.05); ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
    }
    ctx.restore();
  }

  // ---- Corrientes de luz hacia la X
  STREAMS.forEach(p => {
    const q = (t * p.sp + p.ph) % 1;
    const startX = CX + p.side * 330, x = startX + (CX + p.side * 30 - startX) * easeInOut(q);
    const y = CY + p.off * (62 * (1 - 0.88 * q)) + Math.sin(t * 2 + p.ph * 9) * 4 * (1 - q);
    glowDot(ctx, x, y, p.sz * 3.2, p.side < 0 ? BLUE : PINK, Math.sin(Math.PI * q) * 0.9 * g);
  });

  // ---- Ondas desde la X
  emitters(t, 0.8, 8.8, 1.7, 2.2, (p) => {
    const r = 50 + 200 * easeOut(p), a = (1 - p) * 0.6 * g;
    const gr = ctx.createLinearGradient(CX - r, 0, CX + r, 0);
    gr.addColorStop(0, rgba(BLUE, a)); gr.addColorStop(0.5, rgba(VIOLET, a)); gr.addColorStop(1, rgba(PINK, a));
    ctx.beginPath(); ctx.arc(CX, CY, r, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = gr; ctx.stroke();
  });
  glowDot(ctx, CX, CY, 110 + 18 * Math.sin(t * 3), VIOLET, 0.28 * g);
  sparkle(ctx, CX, CY - 4, 46, WHITE, 0.9 * g * (0.55 + 0.45 * Math.sin(t * 2.4)));

  // ---- Camino de aprendizaje y diagrama (acompañan la flotación de cada mitad)
  CHECKS.forEach(([x, y], i) => {
    const t0 = 1.2 + i * 0.7, yy = y - 7 * fl;
    emitters(t, t0, 8.6, 4.2, 1.3, (p) => sonar(ctx, x, yy, p, 16, 44, 2.6, BLUE, 0.9 * g));
    glowDot(ctx, x, yy, 26, BLUE, 0.4 * g * env(t, t0, t0 + 0.3, t0 + 0.7, t0 + 1.3));
  });
  FLOW.forEach(([x, y], i) => {
    const t0 = 1.4 + i * 0.6, yy = y + 7 * fl;
    emitters(t, t0, 8.6, 4.4, 1.2, (p) => sonar(ctx, x, yy, p, 10, 40, 2.4, PINK, 0.9 * g));
    glowDot(ctx, x, yy, 30, PINK, 0.4 * g * env(t, t0, t0 + 0.3, t0 + 0.7, t0 + 1.3));
  });
  sparkle(ctx, 880, 650 + 7 * fl, 20, WHITE, 0.95 * g * env(t, 3.0, 3.4, 3.7, 4.3));
  sparkle(ctx, 910, 628 + 7 * fl, 16, WHITE, 0.95 * g * env(t, 6.0, 6.4, 6.7, 7.3));
  sparkle(ctx, 880, 780 + 7 * fl, 20, VIOLET, 0.95 * g * env(t, 4.6, 5.0, 5.3, 5.9));

  // ---- Pilares inferiores y QR
  BOTTOM.forEach(([x, y], i) => {
    const t0 = 5.2 + i * 0.5, col = i % 2 ? PINK : BLUE;
    emitters(t, t0, t0 + 0.1, 9, 1.3, (p) => sonar(ctx, x, y, p, 36, 64, 2.6, col, 0.85 * g));
  });
  glowRect(ctx, 845, 1012, 145, 153, 22, VIOLET, g * env(t, 7.4, 7.8, 8.4, 9.1) * 0.95, 3.5, 20);
  sheen(ctx, 845, 1012, 145, 153, 22, (t - 7.2) / 1.5, 0.45 * g);

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
