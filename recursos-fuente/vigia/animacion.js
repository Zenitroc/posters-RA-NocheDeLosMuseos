/*
 * VigIA · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * La vaca mueve las orejas (recortes reales del póster sobre placas limpias) mientras su posición se
 * transmite en tiempo real: pulsos de ubicación sobre el animal, datos que viajan hasta la caravana
 * electrónica (que emite ondas de radio y deja pasar un reflejo de sol) y, arriba a la derecha, llegan
 * las alertas al productor: celo detectado, actividad baja (posible enfermedad) y salida del campo.
 * Cada alerta enciende su ícono de abajo (reproducción, rodeo, salud).
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 12;
const VERDE = [120, 200, 40], AZUL = [30, 110, 200], AMBAR = [245, 160, 30], ROJO = [230, 60, 50];
const BLANCO = [255, 255, 255], TINTA = [24, 34, 48];
const G = t => env(t, 0.3, 1.0, 10.8, 11.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const VACA = [215, 640];                 // lomo de la vaca (pulso de ubicación)
const OREJA = [283, 535];                // donde iría la caravana
const ANILLO = [820, 362];               // ojal de la caravana grande
const PANEL = [[637, 425], [895, 467], [887, 754], [599, 679]];
const ICONOS = [[198, 962], [481, 962], [761, 962]];

const ALERTAS = [
  { t0: 2.0, color: VERDE, titulo: 'Vaca 127 · Celo detectado', sub: 'Momento ideal para inseminar', icono: 0 },
  { t0: 5.0, color: AMBAR, titulo: 'Vaca 054 · Actividad baja', sub: 'Posible enfermedad: revisar', icono: 2 },
  { t0: 8.0, color: ROJO, titulo: 'Vaca 211 salió del campo', sub: 'Alerta de perímetro', icono: 1 },
];

/** Sacudón de oreja: sube rápido y vuelve con un rebote. */
function sacudon(t, momentos) {
  let r = 0;
  for (const t0 of momentos) {
    const d = t - t0;
    if (d > 0 && d < 1.2) r += Math.exp(-d * 5) * Math.sin(d * 18);
  }
  return r;
}

function texto(ctx, s, x, y, peso, px, color, a) {
  if (a <= 0.01) return;
  ctx.font = FUENTE(peso, px); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(color, a); ctx.fillText(s, x, y);
}

/** Notificación al productor. */
function alerta(ctx, x, y, al, a, k) {
  if (a <= 0.01) return;
  const w = 248, h = 54;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.shadowColor = 'rgba(0,30,60,0.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  rrect(ctx, x, y, w, h, 12); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); rrect(ctx, x, y, w, h, 12); ctx.clip(); ctx.fillStyle = rgba(al.color, 1); ctx.fillRect(x, y, 6, h); ctx.restore();
  ctx.fillStyle = rgba(al.color, 1); ctx.beginPath(); ctx.arc(x + 24, y + h / 2, 9, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = FUENTE(800, 12); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x + 24, y + h / 2 + 0.5);
  texto(ctx, al.titulo, x + 42, y + 20, 700, 13.5, TINTA, 1);
  texto(ctx, al.sub, x + 42, y + 37, 500, 11.5, [90, 100, 115], 1);
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }

  // ---- Orejas que se sacuden (cada una a su tiempo)
  const ri = 0.09 * g * sacudon(t, [1.4, 6.3, 9.1]), rd = -0.09 * g * sacudon(t, [3.6, 6.5]);
  sprite(ctx, 'fondoOrejaIzq'); sprite(ctx, 'fondoOrejaDer');
  sprite(ctx, 'orejaIzq', 0, 0, 1, ri + 0.012 * g * Math.sin(t * 1.3), 1, 320, 540);
  sprite(ctx, 'orejaDer', 0, 0, 1, rd - 0.012 * g * Math.sin(t * 1.1 + 1), 1, 434, 545);

  // ---- Posición en tiempo real: pulsos sobre la vaca y en la oreja (caravana)
  emitters(t, 0.8, 10.4, 1.6, 1.4, p => {
    ctx.save(); ctx.translate(VACA[0], VACA[1] + 120); ctx.scale(1, 0.32);
    ring(ctx, 0, 0, 40 + 150 * easeOut(p), 5, VERDE, 0.7 * g * (1 - p)); ctx.restore();
  });
  glowDot(ctx, OREJA[0], OREJA[1], 16, VERDE, g * (0.45 + 0.45 * Math.max(0, Math.sin(t * TAU / 1.6)) ** 6));

  // ---- Datos que viajan de la vaca a la caravana grande
  const arco = polyline(Array.from({ length: 24 }, (_, i) => {
    const u = i / 23; return [OREJA[0] + (ANILLO[0] - OREJA[0]) * u, OREJA[1] + (ANILLO[1] - OREJA[1]) * u - 120 * Math.sin(Math.PI * u)];
  }));
  emitters(t, 1.0, 10.2, 1.6, 0.9, p => signal(ctx, arco, p, VERDE, 0.9 * g, 60, 9));
  // Ondas de radio desde el ojal
  wifi(ctx, ANILLO[0], ANILLO[1] - 22, t, 1.0, 10.4, AZUL, 0.85 * g, 1.2, 1.6);

  // ---- Reflejo de sol que cruza el panel de la caravana
  [3.2, 8.6].forEach(t0 => {
    const p = (t - t0) / 1.4;
    if (p <= 0 || p >= 1) return;
    ctx.save(); ctx.beginPath(); PANEL.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
    const cx = 560 + 420 * easeInOut(p), gr = ctx.createLinearGradient(cx - 70, 420, cx + 70, 760);
    gr.addColorStop(0, rgba(BLANCO, 0)); gr.addColorStop(0.5, rgba(BLANCO, 0.32 * g)); gr.addColorStop(1, rgba(BLANCO, 0));
    ctx.fillStyle = gr; ctx.fillRect(590, 420, 320, 340); ctx.restore();
  });

  // ---- Alertas al productor (la más nueva arriba) y su ícono
  ALERTAS.forEach((al, i) => {
    const d = t - al.t0;
    if (d < 0) return;
    const k = resorte(d), nuevas = ALERTAS.filter(b => t >= b.t0 && b.t0 > al.t0).length;
    const y = 112 + 62 * nuevas;
    alerta(ctx, 734, y, al, g * smooth(0, 0.15, d), k);
    // ícono correspondiente
    const [x, yi] = ICONOS[al.icono];
    emitters(t, al.t0, al.t0 + 0.1, 5, 1.4, p => sonar(ctx, x, yi, p, 74, 118, 3.5, al.color, 0.85 * g));
    glowDot(ctx, x, yi, 110, al.color, 0.22 * g * env(d, 0, 0.2, 0.8, 1.6));
    // pulso de color sobre la vaca
    emitters(t, al.t0, al.t0 + 0.1, 5, 1.2, p => sonar(ctx, VACA[0] + 60, VACA[1] - 30, p, 20, 110, 4, al.color, 0.8 * g));
  });

  // ---- "se pierde"
  sheen(ctx, 70, 385, 350, 72, 10, (t - 9.6) / 1.1, 0.45 * g);

  ctx.restore();
}

/** Muelle amortiguado: 0 → 1 con un pequeño rebote. */
function resorte(p) {
  if (p <= 0) return 0;
  return 1 - Math.exp(-7 * p) * Math.cos(10 * p);
}

const load = () => loadSprites(SPRITES_SRC);
