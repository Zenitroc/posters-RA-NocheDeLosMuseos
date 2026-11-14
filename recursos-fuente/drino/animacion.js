/*
 * Drino · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Los dos Drinos acompañan al chico: aparecen globos de chat de contención ("¿Cómo te sentís hoy?",
 * "Estoy acá con vos", "Respirá conmigo", "Esto también pasa"), un halo suave marca la respiración
 * (inhalá–exhalá) alrededor del grupo, el Drino naranja parpadea y suben corazones. La aguja de la brújula
 * (recorte real del póster sobre una placa limpia) busca el norte y se estabiliza: encontrar el rumbo.
 * Las cuatro funciones de abajo se iluminan en secuencia.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 14;
const VERDE = [128, 180, 100], VERDE_O = [70, 120, 60], NARANJA = [240, 163, 84], NARANJA_O = [200, 110, 40];
const PIEL = [240, 163, 84], TINTA = [44, 50, 72], BLANCO = [255, 255, 255], MENTA = [170, 220, 200];
const G = t => env(t, 0.3, 1.0, 12.8, 13.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const BRUJULA = [759.3, 349.3];
const OJOS = [[661, 494], [706, 494.4]];
const PARPADEOS = [2.2, 2.45, 6.1, 9.6, 9.85, 12.0];
const GRUPO = [505, 700];

/** Corazón (centrado en x, y). */
function corazon(ctx, x, y, s, color, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-8, -2, -5, -10, 0, -5); ctx.bezierCurveTo(5, -10, 8, -2, 0, 4);
  ctx.fillStyle = rgba(color, a); ctx.fill(); ctx.restore();
}

/**
 * Globo de chat. (x, y, w, h) caja; (cx, cy) punta de la cola; lineas = texto; color del borde/acento.
 * k: aparición (escala con rebote), escribiendo: muestra "…" animado en vez del texto.
 */
function globo(ctx, x, y, w, h, cx, cy, lineas, color, a, k, escribiendo, t) {
  if (a <= 0.01 || k <= 0.01) return;
  const ox = cx, oy = cy, s = 0.6 + 0.4 * k;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(ox, oy); ctx.scale(s, s); ctx.translate(-ox, -oy);
  ctx.shadowColor = 'rgba(60,60,40,0.18)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  rrect(ctx, x, y, w, h, 18); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.shadowColor = 'transparent';
  // cola
  const bx = clamp(cx, x + 24, x + w - 24), by = cy < y ? y : y + h;
  ctx.beginPath(); ctx.moveTo(bx - 10, by); ctx.lineTo(cx, cy); ctx.lineTo(bx + 10, by); ctx.closePath(); ctx.fill();
  rrect(ctx, x, y, w, h, 18); ctx.lineWidth = 2.2; ctx.strokeStyle = rgba(color, 1); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (escribiendo) {
    for (let i = 0; i < 3; i++) {
      const b = Math.max(0, Math.sin(t * 8 - i * 0.9));
      ctx.fillStyle = rgba(color, 0.5 + 0.5 * b);
      ctx.beginPath(); ctx.arc(x + w / 2 + (i - 1) * 16, y + h / 2 - 4 * b, 4.5, 0, TAU); ctx.fill();
    }
  } else {
    ctx.fillStyle = rgba(TINTA, 1); ctx.font = FUENTE(600, 18);
    lineas.forEach((l, i) => ctx.fillText(l, x + w / 2, y + h / 2 + (i - (lineas.length - 1) / 2) * 22));
  }
  ctx.restore();
}

// Conversación: [inicio, fin, lado, líneas]
const CHAT = [
  [1.0, 4.6, 'izq', ['¿Cómo te sentís hoy?']],
  [3.8, 7.2, 'der', ['Estoy acá', 'con vos.']],
  [6.6, 10.6, 'izq', ['Respirá conmigo…']],
  [9.6, 12.8, 'der', ['Esto también', 'pasa.']],
];
const LADOS = {
  izq: { x: 170, y: 314, w: 250, h: 62, cx: 300, cy: 410, color: VERDE },
  der: { x: 824, y: 462, w: 156, h: 76, cx: 818, cy: 540, color: NARANJA },
};

/** Aguja: busca el norte (oscila amortiguada) cada tanto y se estabiliza. */
function aguja(t) {
  let r = 0;
  for (const t0 of [0.9, 7.4]) {
    const d = t - t0;
    if (d > 0) r += 0.9 * Math.exp(-d * 1.1) * Math.sin(d * 5.2);
  }
  return r * G(t);
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }

  // ---- Halo de respiración alrededor del grupo (más marcado mientras dice "Respirá conmigo")
  const resp = 0.5 - 0.5 * Math.cos(t * TAU / 4); // 4 s por ciclo (2 inhalar, 2 exhalar)
  const guia = 0.35 + 0.65 * env(t, 6.6, 7.2, 10.2, 10.8);
  ctx.save(); ctx.translate(GRUPO[0], GRUPO[1]); ctx.scale(1, 0.62);
  for (let i = 0; i < 2; i++) {
    const r = 330 + 34 * resp + i * 26;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.lineWidth = 10 - i * 4; ctx.strokeStyle = rgba(MENTA, g * guia * (0.32 - i * 0.12) * (0.55 + 0.45 * resp)); ctx.stroke();
  }
  ctx.restore();

  // ---- Brújula: la aguja busca el rumbo
  sprite(ctx, 'fondoAguja');
  sprite(ctx, 'aguja', 0, 0, 1, aguja(t), 1, BRUJULA[0], BRUJULA[1]);
  glowDot(ctx, BRUJULA[0], BRUJULA[1], 70, MENTA, 0.18 * g * (0.6 + 0.4 * Math.sin(t * 2)));

  // ---- Parpadeo del Drino naranja
  PARPADEOS.forEach(tp => {
    const d = t - tp;
    if (d < 0 || d > 0.16) return;
    const c = Math.sin(Math.PI * d / 0.16); // 0 → 1 (cerrado) → 0
    OJOS.forEach(([x, y]) => {
      const r = 7.8; // párpado: el color de la piel baja sobre el ojo
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      ctx.fillStyle = rgba(PIEL, g); ctx.fillRect(x - r, y - r, 2 * r, 2 * r * c);
      ctx.restore();
      if (c > 0.6) {
        ctx.strokeStyle = rgba(TINTA, g * (c - 0.6) / 0.4); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 6, y + 1); ctx.quadraticCurveTo(x, y + 5, x + 6, y + 1); ctx.stroke();
      }
    });
  });

  // ---- Corazones que suben desde el abrazo
  emitters(t, 1.4, 12.2, 0.9, 3.0, (p, i) => {
    const x0 = [430, 585, 520][i % 3], y0 = [690, 700, 600][i % 3];
    const x = x0 + 18 * Math.sin(p * 5 + i) + (rnd(i, 1) - 0.5) * 40 * p, y = y0 - 150 * p;
    corazon(ctx, x, y, 1.4 + 0.8 * rnd(i, 2), i % 2 ? NARANJA : VERDE, g * 0.85 * Math.sin(Math.PI * p));
  });

  // ---- Conversación
  CHAT.forEach(([a, b, lado, lineas]) => {
    const L = LADOS[lado];
    const k = resorte(t - a), al = g * (1 - smooth(b - 0.35, b, t));
    if (t < a || t > b) return;
    globo(ctx, L.x, L.y, L.w, L.h, L.cx, L.cy, lineas, L.color, al, k, t - a < 0.7, t);
  });

  // ---- Funciones de abajo, en secuencia
  const TARJETAS = [[113, 905, 361, 134, VERDE], [516, 905, 361, 134, NARANJA], [113, 1046, 361, 142, NARANJA], [516, 1046, 361, 142, VERDE]];
  TARJETAS.forEach(([x, y, w, h, col], i) => {
    [2.0, 8.4].forEach(t0 => {
      const a = t0 + i * 0.7;
      sheen(ctx, x + 10, y + 10, w - 20, h - 20, 40, (t - a) / 1.1, 0.4 * g);
      sparkle(ctx, x + 30, y + 30, 12, BLANCO, g * env(t, a, a + 0.15, a + 0.4, a + 0.8));
    });
  });
  // Privacidad
  sheen(ctx, 0, 1196, 990, 40, 0, (t - 5.0) / 2.0, 0.45 * g);

  ctx.restore();
}

/** Muelle amortiguado: 0 → 1 con un pequeño rebote (p en segundos desde el inicio). */
function resorte(p) {
  if (p <= 0) return 0;
  return 1 - Math.exp(-7 * p) * Math.cos(10 * p);
}

const load = () => loadSprites(SPRITES_SRC);
