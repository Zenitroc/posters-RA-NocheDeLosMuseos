/*
 * SyntaxLearn · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Celebra el 1.er puesto en el CoNaIISI 2026: una escarapela dorada con laureles llega con un estallido de
 * papelitos junto al QR (sin taparlo) y queda balanceándose. El producto cobra vida: el autómata procesa la
 * cadena "ab" (q0 → q1 → q2) y la acepta, el roadmap avanza hacia los temas habilitados, aparece la pista de
 * la IA tras un error, el verificador marca la no equivalencia y se encienden los pasos "Cómo funciona".
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 12;
const CIAN = [90, 175, 255], VERDE = [80, 220, 140], VIOLETA = [185, 125, 255], AMBAR = [255, 180, 60], ROJO = [245, 95, 95];
const BLANCO = [255, 255, 255], FONDO = [12, 22, 46];
const ORO = [238, 186, 64], ORO_CLARO = [255, 230, 150], ORO_OSCURO = [176, 122, 26];
const G = t => env(t, 0.3, 1.0, 10.8, 11.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

/* ---------------------------------------------------------------- escarapela del 1.er puesto */

const MEDALLA = [845, 188], R = 56, LLEGA = 0.7;

/** Muelle amortiguado: 0 → 1 con un pequeño rebote (p en segundos desde el inicio). */
function resorte(p) {
  if (p <= 0) return 0;
  return 1 - Math.exp(-6 * p) * Math.cos(9 * p);
}

/** Hoja de laurel (elipse en punta) en el ángulo dado. */
function hoja(ctx, ang, r, s) {
  ctx.save(); ctx.rotate(ang); ctx.translate(r, 0); ctx.rotate(Math.PI / 2 + 0.5 * s);
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(5, 0, 0, 9); ctx.quadraticCurveTo(-5, 0, 0, -9); ctx.fill();
  ctx.restore();
}

function escarapela(ctx, t, g) {
  const k = resorte(t - LLEGA);
  if (k <= 0.001 || g <= 0.002) return;
  const [cx, cy] = MEDALLA;
  const mece = 0.045 * Math.sin((t - LLEGA) * 1.6) * smooth(LLEGA, LLEGA + 1.5, t);
  ctx.save();
  ctx.globalAlpha = clamp(g * smooth(LLEGA, LLEGA + 0.2, t));
  ctx.translate(cx, cy - (1 - k) * 60);
  ctx.rotate(mece + (1 - k) * 0.9);
  ctx.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k);

  // Cintas (azul y cian del póster, con borde dorado)
  for (const s of [-1, 1]) {
    ctx.save(); ctx.rotate(s * 0.3 + 0.04 * Math.sin(t * 2.2 + s));
    ctx.beginPath();
    ctx.moveTo(-15, 22); ctx.lineTo(15, 22); ctx.lineTo(15, R + 48); ctx.lineTo(0, R + 36); ctx.lineTo(-15, R + 48); ctx.closePath();
    ctx.fillStyle = s < 0 ? 'rgb(40,105,230)' : 'rgb(50,195,235)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(ORO, 1); ctx.stroke();
    ctx.restore();
  }
  // Halo
  blob(ctx, 0, 0, R * 2.1, ORO_CLARO, 0.32 * (0.7 + 0.3 * Math.sin(t * 3)));
  // Borde festoneado dorado
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const ang = (i / 96) * TAU, r = R + 5.5 * Math.cos(ang * 24);
    if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r); else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  ctx.closePath();
  const go = ctx.createLinearGradient(-R, -R, R, R);
  go.addColorStop(0, rgba(ORO_CLARO, 1)); go.addColorStop(0.5, rgba(ORO, 1)); go.addColorStop(1, rgba(ORO_OSCURO, 1));
  ctx.fillStyle = go; ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5; ctx.fill();
  ctx.shadowColor = 'transparent';
  // Disco central con laureles
  ctx.beginPath(); ctx.arc(0, 0, R - 10, 0, TAU); ctx.fillStyle = rgba(FONDO, 1); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, R - 13, 0, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(ORO_CLARO, 0.85); ctx.stroke();
  ctx.fillStyle = rgba(ORO, 0.95);
  for (let i = 0; i < 6; i++) { // laureles a los costados (no tapan los textos)
    const a = Math.PI * (0.8 + i * 0.075);
    hoja(ctx, a, R - 17, -1); hoja(ctx, Math.PI - a, R - 17, 1);
  }
  // Estrella arriba
  ctx.save(); ctx.translate(0, -27); ctx.fillStyle = rgba(ORO_CLARO, 1);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.restore();
  // Textos
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = rgba(ORO_CLARO, 1);
  ctx.font = FUENTE(800, 32); ctx.fillText('1.º', 0, -5);
  ctx.font = FUENTE(800, 8.5); ctx.fillText('PRIMER PUESTO', 0, 17);
  ctx.fillStyle = '#fff'; ctx.font = FUENTE(700, 8); ctx.fillText('CoNaIISI 2026', 0, 29);
  // Brillo que cruza el disco
  const q = ((t - LLEGA - 0.6) % 3.0) / 1.0;
  if (q > 0 && q < 1) {
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R + 6, 0, TAU); ctx.clip();
    const bx = -R * 1.6 + q * R * 3.2, gb = ctx.createLinearGradient(bx - 22, -R, bx + 22, R);
    gb.addColorStop(0, 'rgba(255,255,255,0)'); gb.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gb.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gb; ctx.fillRect(-R - 8, -R - 8, 2 * R + 16, 2 * R + 16); ctx.restore();
  }
  ctx.restore();

  // Estallido de papelitos al llegar
  const d = t - LLEGA - 0.15;
  if (d > 0 && d < 2.2) {
    const COL = [ORO, ORO_CLARO, CIAN, [40, 105, 230], VERDE, VIOLETA];
    for (let i = 0; i < 34; i++) {
      const ang = rnd(i, 1) * TAU, v = 90 + 150 * rnd(i, 2);
      const x = cx + Math.cos(ang) * v * d * (1 - 0.25 * d);
      const y = cy + Math.sin(ang) * v * d * (1 - 0.25 * d) + 70 * d * d;
      const a = g * (1 - smooth(1.2, 2.2, d));
      ctx.save(); ctx.translate(x, y); ctx.rotate(d * (4 + 6 * rnd(i, 3)) + i);
      ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(d * 8 + i)));
      ctx.fillStyle = rgba(COL[i % COL.length], a); ctx.fillRect(-4, -2.5, 8, 5);
      ctx.restore();
    }
  }
  // Destellos alrededor de vez en cuando
  emitters(t, LLEGA + 0.2, 10.4, 2.4, 1.0, (p, i) => {
    for (let s = 0; s < 3; s++) {
      const ang = rnd(i, s + 5) * TAU, dd = R + 12 + 22 * p;
      sparkle(ctx, cx + Math.cos(ang) * dd, cy + Math.sin(ang) * dd, 9 * (1 - p) + 3, ORO_CLARO, g * Math.sin(Math.PI * p));
    }
  });
}

/* ---------------------------------------------------------------- producto */

const Q = { q0: [567.5, 620.6], q1: [637.5, 721], q2: [708.75, 600] };
const ARISTA_A = [[583, 646], [617.5, 697.5]], ARISTA_B = [[655, 696], [698.75, 629]];
const CORRIDAS = [1.6, 7.0]; // comienzo de cada corrida del autómata

/** Corrida del autómata con la cadena "ab": q0 → (a) → q1 → (b) → q2, aceptada. */
function automata(ctx, t, g) {
  CORRIDAS.forEach(t0 => {
    const d = t - t0;
    if (d < 0 || d > 4.2) return;
    const fin = 1 - smooth(3.4, 4.2, d);
    // Estados activos
    const activo = (q, a, b) => {
      const k = g * fin * env(d, a, a + 0.15, b, b + 0.3);
      if (k <= 0.01) return;
      ring(ctx, Q[q][0], Q[q][1], 30, 3.5, CIAN, k);
      glowDot(ctx, Q[q][0], Q[q][1], 48, CIAN, 0.35 * k);
    };
    activo('q0', 0, 0.75);
    activo('q1', 1.35, 1.95);
    // Ficha que viaja por las aristas
    const viaje = (arista, a, letra) => {
      const p = (d - a) / 0.6;
      if (p <= 0 || p >= 1) return;
      signal(ctx, polyline(arista), p, VERDE, g * fin, 40, 10);
      const [x0, y0] = arista[0], [x1, y1] = arista[1], e = easeInOut(p);
      ctx.save(); ctx.font = FUENTE(800, 15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(BLANCO, g * fin * Math.sin(Math.PI * p));
      ctx.fillText(letra, x0 + (x1 - x0) * e + 14, y0 + (y1 - y0) * e - 10); ctx.restore();
    };
    viaje(ARISTA_A, 0.7, 'a');
    viaje(ARISTA_B, 1.9, 'b');
    // q2 (final) acepta
    const ka = g * fin * smooth(2.5, 2.7, d);
    if (ka > 0.01) {
      ring(ctx, Q.q2[0], Q.q2[1], 30, 3.5, VERDE, ka);
      ring(ctx, Q.q2[0], Q.q2[1], 23, 2.5, VERDE, ka);
      glowDot(ctx, Q.q2[0], Q.q2[1], 52, VERDE, 0.35 * ka);
      emitters(t, t0 + 2.5, t0 + 2.6, 5, 1.0, p => sonar(ctx, Q.q2[0], Q.q2[1], p, 30, 70, 3, VERDE, 0.85 * g));
      glowRect(ctx, 768, 644, 167.6, 40, 5, VERDE, ka * (0.6 + 0.4 * Math.sin((d - 2.5) * 6)), 3, 16);
      sheen(ctx, 768, 644, 167.6, 40, 5, (d - 2.6) / 0.8, 0.5 * g, [190, 255, 210]);
    }
    // Cadena "ab": cada letra se marca al consumirse
    [[0.7, 0], [1.9, 1]].forEach(([a, i]) => {
      const k = g * fin * smooth(a, a + 0.1, d);
      ctx.fillStyle = rgba(VERDE, 0.22 * k); ctx.fillRect(779 + i * 9.5, 616, 9.5, 17);
    });
  });
}

function roadmap(ctx, t, g) {
  // Del tema completado hacia los habilitados
  emitters(t, 1.2, 10.2, 3.0, 1.0, p => {
    signal(ctx, polyline([[692.5, 371], [622.5, 400]]), p, VERDE, g, 30, 8);
    signal(ctx, polyline([[692.5, 371], [769, 394]]), p, VERDE, g, 30, 8);
  });
  // En progreso late; refuerzo IA titila en violeta
  glowRect(ctx, 729, 402, 112, 40, 2, CIAN, g * (0.35 + 0.35 * Math.sin(t * 3)), 2.5, 14);
  glowRect(ctx, 789, 324, 133.5, 46.6, 2, VIOLETA, g * (0.3 + 0.3 * Math.sin(t * 2.2 + 1)), 2.5, 14);
  sparkle(ctx, 915, 326, 10, VIOLETA, g * env(t, 3.0, 3.3, 3.6, 4.2));
  sparkle(ctx, 915, 326, 10, VIOLETA, g * env(t, 8.4, 8.7, 9.0, 9.6));
}

function leccion(ctx, t, g) {
  [2.4, 7.8].forEach(t0 => {
    // Respuesta equivocada: el recuadro rojo parpadea…
    const ke = g * env(t, t0, t0 + 0.15, t0 + 0.9, t0 + 1.3);
    glowRect(ctx, 509, 830, 91.6, 22.5, 3, ROJO, ke * (0.6 + 0.4 * Math.sin(t * 14)), 2.5, 12);
    // …y la IA ofrece la pista
    const kp = g * env(t, t0 + 1.0, t0 + 1.4, t0 + 3.4, t0 + 4.2);
    glowRect(ctx, 505.6, 863, 426.4, 78, 4, CIAN, 0.8 * kp, 2.5, 18);
    sheen(ctx, 505.6, 863, 426.4, 78, 4, (t - t0 - 1.1) / 1.2, 0.3 * g, [180, 220, 255]);
    sparkle(ctx, 522.5, 880, 13, CIAN, kp);
  });
  // Verificador: "no es equivalente" late en ámbar
  [4.6, 9.4].forEach(t0 => {
    const k = g * env(t, t0, t0 + 0.2, t0 + 1.2, t0 + 1.8);
    glowRect(ctx, 690.6, 1030.6, 245, 50, 4, AMBAR, k * (0.65 + 0.35 * Math.sin((t - t0) * 9)), 3, 16);
  });
}

const PASOS = [478, 544.5, 608, 673, 737];
const PALABRAS = [[243, 844, 184], [283, 905, 144], [311, 969, 113], [293, 1030, 131]];

function izquierda(ctx, t, g) {
  // Cómo funciona: los cinco pasos se encienden en orden
  [1.0, 6.4].forEach(t0 => PASOS.forEach((y, i) => {
    const a = t0 + i * 0.55, k = g * env(t, a, a + 0.15, a + 0.5, a + 1.0);
    glowRect(ctx, 31, y - 14, 27, 28, 3, CIAN, k, 2.5, 14);
    sheen(ctx, 31, y - 16, 430, 34, 4, (t - a) / 0.9, 0.22 * g, [170, 210, 255]);
  }));
  // Personalizado · Interactivo · Trazable · Verificado
  PALABRAS.forEach(([x, y, w], i) => {
    [3.6, 9.0].forEach(t0 => sheen(ctx, x - 6, y - 18, w + 12, 36, 6, (t - t0 - i * 0.45) / 0.8, 0.5 * g));
  });
  // Estrellitas alrededor de la notebook
  for (let i = 0; i < 9; i++) {
    const x = 18 + rnd(i, 1) * 170, y = 815 + rnd(i, 2) * 245, per = 1.4 + rnd(i, 3) * 1.4, q = ((t + rnd(i, 4) * per) % per) / per;
    sparkle(ctx, x, y, 7 + 5 * rnd(i, 5), [255, 240, 200], g * 0.9 * Math.pow(Math.sin(Math.PI * q), 3));
  }
  // Rayos de "Aprender haciendo"
  glowDot(ctx, 350, 285, 40, AMBAR, g * 0.22 * (0.6 + 0.4 * Math.sin(t * 2.6)));
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }
  izquierda(ctx, t, g);
  roadmap(ctx, t, g);
  automata(ctx, t, g);
  leccion(ctx, t, g);
  // Pregunta final
  sheen(ctx, 141, 1172, 705, 46, 8, (t - 5.4) / 1.4, 0.45 * g);
  escarapela(ctx, t, g);
  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
