/*
 * CECI · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * La pareja de la ilustración se mece abrazada y le salen corazoncitos; el sol late. El celular "habla"
 * (ondas de voz) y sus tarjetas grises se convierten en mensajes reales de CECI que se escriben solos.
 * El corazón del reloj late con su pulso. Las seis funciones se encienden de a una (alternando lados) y
 * mandan una señal al celular o al reloj; cada ícono tiene su gesto (voz, alerta de caída, recordatorio,
 * chispas de la gimnasia mental, latido, escudo que brilla). Flotan lucecitas cálidas por el fondo.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const NAVY = [44, 72, 98], BLUE = [54, 106, 145], GREEN = [60, 120, 90], CORAL = [226, 110, 95], WARM = [255, 200, 120], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

// Funciones: píldora [x, y, w, h], ícono [x, y], color, destino de la señal, momento en que se enciende
const FUNCIONES = [
  { p: [52, 318, 243, 67], i: [88, 343], c: BLUE, a: [345, 351], t0: 1.0, gesto: 'voz' },
  { p: [705, 427, 240, 68], i: [745, 451], c: GREEN, a: [645, 461], t0: 2.1, gesto: 'mente' },
  { p: [52, 535, 240, 67], i: [88, 560], c: CORAL, a: [345, 568], t0: 3.2, gesto: 'caida' },
  { p: [705, 645, 240, 68], i: [745, 668], c: CORAL, a: [645, 678], t0: 4.3, gesto: 'corazon' },
  { p: [52, 752, 240, 68], i: [88, 777], c: BLUE, a: [345, 786], t0: 5.4, gesto: 'remedio' },
  { p: [705, 862, 240, 68], i: [745, 887], c: GREEN, a: [686, 880], t0: 6.5, gesto: 'escudo' },
];

// Tarjetas del celular: renglones grises que se reemplazan por mensajes
const TARJETAS = [
  { caja: [410, 628, 196, 42], punto: [393.7, 645.5, GREEN], t0: 1.6, renglones: ['¡Buen día, Rosa! ¿Jugamos', 'a recordar canciones? 🎵'] },
  { caja: [410, 719, 196, 42], punto: [393.7, 736.3, BLUE], t0: 5.6, renglones: ['Ya es hora de la pastilla', 'de las 20 h. ¿La tomaste? 💊'] },
];
const ICONOS_CEL = [[420.7, 855.5, BLUE], [494.5, 855.5, CORAL], [569, 855.5, GREEN]];

/** Pulso tipo latido (dos golpes) con período `per`. */
function latido(t, per = 0.85) {
  const q = (t % per) / per;
  return Math.exp(-Math.pow((q - 0.08) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((q - 0.3) / 0.05, 2));
}

function corazoncito(ctx, x, y, s, color, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-7, -3, -4, -9, 0, -5); ctx.bezierCurveTo(4, -9, 7, -3, 0, 3);
  ctx.fillStyle = rgba(color, a); ctx.shadowColor = rgba(color, a); ctx.shadowBlur = 6; ctx.fill();
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // ---- Placa limpia de la ilustración (la pareja se mece encima)
  sprite(ctx, 'fondoPareja');

  // ---- Lucecitas cálidas que suben por el fondo
  for (let i = 0; i < 12; i++) {
    const q = (t * (0.045 + rnd(i, 1) * 0.04) + rnd(i, 2)) % 1;
    const x = 30 + rnd(i, 3) * 930 + 14 * Math.sin(t * 0.7 + i * 1.3), y = 1180 - q * 900;
    blob(ctx, x, y, 10 + rnd(i, 4) * 12, i % 2 ? WARM : WHITE, 0.4 * g * Math.sin(Math.PI * q));
  }

  // ---- Título y lema
  sheen(ctx, 370, 80, 250, 92, 8, (t - 0.9) / 1.5, 0.45 * g);
  sheen(ctx, 286, 1022, 420, 44, 8, (t - 3.0) / 1.6, 0.45 * g);
  sheen(ctx, 286, 1066, 420, 44, 8, (t - 3.4) / 1.6, 0.45 * g);

  // ---- Ilustración: sol que late, pareja que se mece abrazada, corazoncitos
  const sol = 0.5 + 0.5 * Math.sin(t * 2.2);
  blob(ctx, 421.7, 403, 34 + 6 * sol, WARM, 0.45 * g);
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * TAU + t * 0.4, r0 = 21, r1 = 27 + 4 * sol;
    ctx.beginPath(); ctx.moveTo(421.7 + Math.cos(ang) * r0, 403 + Math.sin(ang) * r0); ctx.lineTo(421.7 + Math.cos(ang) * r1, 403 + Math.sin(ang) * r1);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = rgba([245, 180, 90], 0.75 * g); ctx.stroke();
  }
  const mece = (0.022 * Math.sin(t * 1.6) + 0.006 * Math.sin(t * 3.7)) * g;
  const respira = 1 + 0.008 * (0.5 - 0.5 * Math.cos(t * 2.2)) * g;
  spriteT(ctx, 'pareja', { rot: mece, sx: respira, sy: respira, px: 495, py: 598 });
  emitters(t, 0.9, 8.4, 0.9, 2.4, (p, i) => {
    const x = 478 + (rnd(i, 1) - 0.5) * 30 + 10 * Math.sin(p * 7 + i), y = 455 - 80 * p;
    corazoncito(ctx, x, y, 0.9 + 0.6 * p, CORAL, 0.9 * g * Math.sin(Math.PI * clamp(p * 1.2)));
  });

  // ---- Tarjetas: los renglones grises se vuelven mensajes de CECI que se escriben
  TARJETAS.forEach(({ caja: [x, y, w, h], punto: [px, py, pc], t0, renglones }) => {
    const on = g * smooth(t0 - 0.3, t0, t);
    if (on <= 0.01) return;
    ctx.fillStyle = rgba(WHITE, on); rrect(ctx, x - 2, y - 2, w + 4, h + 4, 6); ctx.fill();
    const total = renglones.join('').length;
    let quedan = Math.floor(total * clamp((t - t0) / 2.0));
    ctx.font = '600 12.5px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    renglones.forEach((r, k) => {
      const parte = r.slice(0, Math.max(0, quedan)); quedan -= r.length;
      ctx.fillStyle = rgba(k ? [110, 110, 105] : NAVY, on);
      ctx.fillText(parte, x + 4, y + 11 + k * 19);
      if (quedan < 0 && parte.length < r.length && parte.length > 0 && Math.sin(t * 14) > 0) {
        ctx.fillRect(x + 6 + ctx.measureText(parte).width, y + 4 + k * 19, 1.5, 14);
      }
    });
    emitters(t, t0, t0 + 0.1, 1, 1.2, (p) => sonar(ctx, px, py, p, 9, 26, 2, pc, 0.8 * g));
    glowDot(ctx, px, py, 14, pc, 0.45 * on * (0.6 + 0.4 * Math.sin(t * 4)));
  });

  // ---- Celular que "habla": ondas de voz desde el ícono de voz; los íconos laten en ronda
  wifi(ctx, 440, 846, t, 1.0, 8.6, BLUE, 0.9 * g, 0.9, 1.4);
  ICONOS_CEL.forEach(([x, y, c], i) => {
    const p = 0.5 + 0.5 * Math.sin(t * 2.4 - i * 1.4);
    blob(ctx, x, y, 34, c, 0.28 * p * g);
  });

  // ---- Reloj: el corazón late y el pulso se lee en pantalla
  const lat = latido(t) * g;
  blob(ctx, 642.3, 831, 40 + 8 * lat, CORAL, 0.35 * lat);
  sprite(ctx, 'corazonReloj', 0, 0, 1 + 0.16 * lat, 0, 1, 642.3, 831);
  emitters(t, 1.0, 8.6, 0.85, 1.0, (p) => sonar(ctx, 642.3, 831, p, 22, 48, 2, CORAL, 0.55 * g));
  const bpm = Math.round(71 + 2 * Math.sin(t * 0.9));
  ctx.globalAlpha = g; ctx.fillStyle = '#ffd3cc'; ctx.font = '700 11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bpm + ' lpm', 642.3, 863);
  ctx.globalAlpha = 1;

  // ---- Funciones: se encienden de a una y mandan señal; gesto propio de cada ícono
  FUNCIONES.forEach(({ p: [x, y, w, h], i: [ix, iy], c, a: [ax, ay], t0, gesto }) => {
    const on = g * env(t, t0, t0 + 0.3, t0 + 1.3, t0 + 1.9);
    glowRect(ctx, x, y, w, h, h / 2, c, on, 2.5, 16);
    sheen(ctx, x, y, w, h, h / 2, (t - t0 - 0.1) / 1.0, 0.45 * g);
    blob(ctx, ix, iy, 46, c, 0.3 * on);
    const borde = x < 400 ? x + w : x;
    emitters(t, t0 + 0.2, t0 + 0.3, 1, 1.0, (q) => signal(ctx, polyline([[borde, iy], [ax, ay]]), q, c, 0.95 * g, 40, 7));
    const k = clamp((t - t0) / 1.6);
    if (k <= 0 || k >= 1) return;
    const a = g * Math.sin(Math.PI * k);
    if (gesto === 'voz') wifi(ctx, ix + 14, iy + 4, t, t0, t0 + 1.6, WHITE, a, 0.75, 0.8);
    else if (gesto === 'caida') { sonar(ctx, ix, iy, k, 26, 70, 3, CORAL, a); sonar(ctx, ix, iy, clamp(k * 1.6 - 0.3), 26, 70, 2, CORAL, a * 0.7); }
    else if (gesto === 'corazon') { const l = latido(t, 0.7); blob(ctx, ix, iy, 30 + 10 * l, CORAL, 0.6 * a * l); }
    else if (gesto === 'mente') for (let s = 0; s < 3; s++) sparkle(ctx, ix + Math.cos(s * 2.1 + k * 4) * 34, iy + Math.sin(s * 2.1 + k * 4) * 34, 9, WHITE, a * (0.5 + 0.5 * Math.sin(t * 9 + s)));
    else if (gesto === 'remedio') { const r = 0.12 * Math.sin(k * Math.PI * 6) * a; ctx.save(); ctx.translate(ix, iy); ctx.rotate(r); glowDot(ctx, 0, -20, 8, WARM, a); ctx.restore(); }
    else if (gesto === 'escudo') { sparkle(ctx, ix + 8, iy - 10, 16, WHITE, a); sonar(ctx, ix, iy, k, 24, 56, 2.4, GREEN, a); }
  });

  // ---- Avisos de CECI (chips)
  const vent = (a, b) => [g * env(t, a, a + 0.4, b - 0.5, b), clamp((t - a) / 0.6)];
  let [ca, ck] = vent(3.4, 5.4); chip(ctx, 60, 612, 236, 46, 'Caída detectada', 'Aviso a la familia ✓', CORAL, ca, ck);
  [ca, ck] = vent(4.5, 6.6); chip(ctx, 705, 722, 236, 46, 'Pulso', bpm + ' lpm · normal', CORAL, ca, ck);
  [ca, ck] = vent(6.7, 8.7); chip(ctx, 705, 938, 236, 46, 'Llamada sospechosa', 'Bloqueada 🛡', GREEN, ca, ck);

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
