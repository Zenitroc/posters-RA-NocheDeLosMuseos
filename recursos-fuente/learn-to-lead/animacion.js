/*
 * Learn To Lead · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * La figura es un director de orquesta: su batuta (recorte real del póster, sobre una placa limpia) marca
 * un compás de 4/4 girando desde la mano. En cada tiempo la punta suelta música: un pentagrama que
 * ondula hacia arriba y sale del papel con las notas de la melodía, notas sueltas que flotan y ondas de
 * sonido. Los cuadros 1·2·3·4 (SIMULA, CREA, ANALIZA, MEJORA) se encienden cada uno en su tiempo.
 * El lienzo se extiende un 30 % por lado (MARGEN): el pentagrama y las notas siguen sobre la pared.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10, MARGEN = 0.3;
const NAVY = [9, 54, 74], TEAL = [24, 95, 117], MINT = [110, 200, 188], CLARO = [205, 244, 238], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

/* ---------------------------------------------------------------- batuta */

const PIVOTE = [521, 277], PUNTA = [683, 112];   // la mano que la sostiene y la punta en reposo (el póster)
const T0 = 1.2, TIEMPO = 0.5, TIEMPOS = 16;       // 4 compases de 4/4 a 120 por minuto
const FUERZA = [1, 0.6, 0.78, 0.55];              // el 1 de cada compás es el más marcado
const GIRO = 0.3;                                 // rad en el tiempo fuerte (≈ 17°), siempre hacia abajo

/** Giro de la batuta sin envolvente: cae acelerando a cada tiempo (ictus) y rebota hacia arriba. */
function marcar(t) {
  const k = (t - T0) / TIEMPO, i = Math.floor(k), p = k - i;
  const fuerza = j => (j < 0 || j >= TIEMPOS ? 0 : FUERZA[j % 4]);
  const rebote = p < 0.42 ? fuerza(i) * Math.pow(1 - p / 0.42, 2) : 0;
  const caida = p > 0.42 ? fuerza(i + 1) * Math.pow((p - 0.42) / 0.58, 2.2) : 0;
  return GIRO * (rebote + caida);
}
const giro = t => marcar(t) * G(t);

/** Posición de la punta para un giro dado. */
function punta(rot) {
  const vx = PUNTA[0] - PIVOTE[0], vy = PUNTA[1] - PIVOTE[1], c = Math.cos(rot), s = Math.sin(rot);
  return [PIVOTE[0] + vx * c - vy * s, PIVOTE[1] + vx * s + vy * c];
}

/* ---------------------------------------------------------------- notas */

/**
 * Figura musical dibujada a mano (sin depender de fuentes): `tipo` = 'negra' | 'corchea' | 'doble'
 * (dos corcheas unidas). (x, y) = centro de la cabeza; la plica sube hacia -y local; `rot` gira todo.
 */
function nota(ctx, x, y, s, tipo, color, a, rot = 0) {
  if (a <= 0.01 || s <= 0.01) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = rgba(color, a); ctx.strokeStyle = rgba(color, a);
  const cabeza = (cx, cy) => { ctx.beginPath(); ctx.ellipse(cx, cy, 4.7, 3.3, -0.38, 0, TAU); ctx.fill(); };
  const plica = (cx, cy, alto) => { ctx.fillRect(cx + 3.4, cy - alto, 1.5, alto); };
  if (tipo === 'doble') {
    cabeza(0, 0); cabeza(13, -3);
    plica(0, 0, 18); plica(13, -3, 18);
    ctx.beginPath(); ctx.moveTo(3.4, -18); ctx.lineTo(17.9, -21); ctx.lineTo(17.9, -16.6); ctx.lineTo(3.4, -13.6); ctx.closePath(); ctx.fill();
  } else {
    cabeza(0, 0); plica(0, 0, 19);
    if (tipo === 'corchea') {
      ctx.beginPath(); ctx.moveTo(4.9, -19);
      ctx.bezierCurveTo(6.5, -13, 12.5, -12, 10.5, -4.5);
      ctx.bezierCurveTo(10.6, -10, 7, -11.5, 4.9, -13.5);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

/** Nota con halo claro (para que se lea como luz sobre el papel o la pared). */
function notaLuz(ctx, x, y, s, tipo, color, a, rot) {
  if (a <= 0.01) return;
  ctx.save(); ctx.shadowColor = rgba(CLARO, a); ctx.shadowBlur = 10 * s;
  nota(ctx, x, y, s, tipo, color, a, rot);
  ctx.restore();
}

/* ---------------------------------------------------------------- pentagrama */

const ESP = 12; // separación entre líneas
// Sale de la punta, cruza la esquina superior derecha del póster ondulando y sigue por la pared
const CAMINO = recorrido(esquinasSuaves([[690, 104], [770, 150], [870, 170], [950, 120], [1030, 60], [1140, 40], [1290, -30]], 80, 10));
const MELODIA = [ // [posición en el pentagrama (0 = 1.ª línea … 8 = 5.ª línea), figura] por tiempo
  [2, 'negra'], [4, 'corchea'], [6, 'negra'], [5, 'doble'],
  [4, 'negra'], [6, 'corchea'], [8, 'negra'], [7, 'doble'],
  [6, 'negra'], [4, 'doble'], [3, 'corchea'], [5, 'negra'],
  [7, 'doble'], [6, 'corchea'], [4, 'negra'], [2, 'negra'],
];
const VEL = 165; // unidades por segundo a lo largo del pentagrama

/** Punto del pentagrama: s a lo largo, `alto` sobre la línea central; el comienzo sigue a la punta. */
function enPentagrama(t, s, alto, tip) {
  const p = CAMINO.at(s), nx = p.dy, ny = -p.dx;      // normal "hacia arriba" del pentagrama
  const abre = smooth(0, 130, s);                       // las líneas nacen juntas en la punta y se abren
  const onda = 16 * Math.sin(s / 80 - t * 2.6) * abre;
  const pega = 1 - smooth(0, 150, s);                   // el arranque acompaña a la batuta
  const o = onda + alto * (0.15 + 0.85 * abre);
  return {
    x: p.x + nx * o + (tip[0] - PUNTA[0]) * pega,
    y: p.y + ny * o + (tip[1] - PUNTA[1]) * pega,
    ang: Math.atan2(p.dy, p.dx),
  };
}

function pentagrama(ctx, t, g, tip) {
  const largo = CAMINO.total * easeInOut((t - 0.7) / 1.8);
  if (largo < 4 || g <= 0.003) return;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const alto = (i - 2) * ESP;
    let prev = enPentagrama(t, 0, alto, tip);
    for (let s = 8; s <= largo; s += 8) {
      const q = enPentagrama(t, s, alto, tip);
      const a = g * 0.8 * smooth(0, 40, s) * (1 - smooth(CAMINO.total - 160, CAMINO.total, s)) * (0.4 + 0.6 * smooth(largo, largo - 60, s));
      if (a > 0.004) {
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y);
        ctx.lineWidth = 2.4; ctx.strokeStyle = rgba(TEAL, a); ctx.stroke();
      }
      prev = q;
    }
  }
  // Clave de sol estilizada al comienzo, cuando el pentagrama ya se abrió
  const cs = enPentagrama(t, 165, 0, tip);
  claveSol(ctx, cs.x, cs.y, cs.ang, NAVY, g * 0.9 * smooth(1.4, 2.2, t), 1.45);

  // Notas de la melodía: cada tiempo suelta una que viaja por el pentagrama
  for (let i = 0; i < TIEMPOS; i++) {
    const tb = T0 + i * TIEMPO, s = (t - tb) * VEL + 60;
    if (t < tb || s > CAMINO.total) continue;
    const [pos, tipo] = MELODIA[i];
    const q = enPentagrama(t, s, (pos - 4) * ESP / 2, tip);
    const a = g * smooth(60, 110, s) * (1 - smooth(CAMINO.total - 200, CAMINO.total - 20, s));
    const pop = 1 + 0.35 * (1 - easeOut((t - tb) / 0.35));
    notaLuz(ctx, q.x, q.y, 1.85 * pop, tipo, i % 4 === 0 ? NAVY : TEAL, a, q.ang);
  }
}

/** Clave de sol simplificada (espiral + trazo vertical). */
function claveSol(ctx, x, y, rot, color, a, s = 1) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.strokeStyle = rgba(color, a); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(2, 26); ctx.bezierCurveTo(-6, 28, -6, 20, 0, 20);
  ctx.lineTo(4, -26);
  ctx.bezierCurveTo(5, -34, 12, -30, 8, -22);
  ctx.bezierCurveTo(4, -14, -10, -8, -10, 4);
  ctx.bezierCurveTo(-10, 14, 8, 14, 9, 4);
  ctx.bezierCurveTo(9, -4, -2, -6, -2, 2);
  ctx.stroke(); ctx.restore();
}

/* ---------------------------------------------------------------- cuadros 1·2·3·4 */

const CUADROS = [ // [x, y, w, h] del número y ancho del bloque con su texto
  [85.8, 815.8, 57, 70, 345], [480.6, 815.8, 55, 70, 410],
  [85.8, 953.2, 57, 71, 345], [480.6, 955, 55, 69, 410],
];

/* ---------------------------------------------------------------- render */

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }
  const rot = giro(t), tip = punta(rot);

  // ---- Halo que late con el compás detrás de la figura
  let latido = 0;
  for (let i = 0; i < TIEMPOS; i++) {
    const d = t - (T0 + i * TIEMPO);
    if (d >= 0 && d < 1) latido = Math.max(latido, Math.exp(-d / 0.22) * FUERZA[i % 4]);
  }
  blob(ctx, 640, 330, 240 + 30 * latido, MINT, g * (0.08 + 0.1 * latido));

  // ---- Cuadros 1·2·3·4: cada uno se enciende en su tiempo del compás
  for (let i = 0; i < TIEMPOS; i++) {
    const tb = T0 + i * TIEMPO, d = t - tb;
    if (d < -0.05 || d > 1.1) continue;
    const [x, y, w, h, bloque] = CUADROS[i % 4];
    const k = Math.exp(-Math.max(0, d) / 0.3) * smooth(-0.05, 0.02, d);
    glowRect(ctx, x - 4, y - 4, w + 8, h + 8, 6, MINT, g * k, 3, 18);
    sheen(ctx, x, y - 4, bloque, h + 8, 6, d / 0.7, 0.4 * g, CLARO);
  }

  // ---- Batuta: placa limpia (el póster sin la batuta) y la batuta real girando desde la mano
  sprite(ctx, 'fondoVarita');

  // Estela: el barrido de la mitad exterior de la batuta en los últimos instantes (sólo se nota si va rápido)
  const base = Math.atan2(PUNTA[1] - PIVOTE[1], PUNTA[0] - PIVOTE[0]), largo = Math.hypot(PUNTA[0] - PIVOTE[0], PUNTA[1] - PIVOTE[1]);
  const estela = ctx.createRadialGradient(PIVOTE[0], PIVOTE[1], largo * 0.45, PIVOTE[0], PIVOTE[1], largo + 4);
  estela.addColorStop(0, rgba(MINT, 0)); estela.addColorStop(0.75, rgba(MINT, 0.45)); estela.addColorStop(1, rgba(CLARO, 0.7));
  let ant = rot;
  for (let j = 1; j <= 8; j++) {
    const r = giro(t - j * 0.018);
    if (Math.abs(r - ant) > 0.002) {
      ctx.save(); ctx.globalAlpha = g * (1 - j / 9) * 0.8;
      ctx.beginPath(); ctx.moveTo(PIVOTE[0], PIVOTE[1]);
      ctx.arc(PIVOTE[0], PIVOTE[1], largo + 4, base + Math.min(r, ant), base + Math.max(r, ant));
      ctx.closePath(); ctx.fillStyle = estela; ctx.fill(); ctx.restore();
    }
    ant = r;
  }
  sprite(ctx, 'varita', 0, 0, 1, rot, 1, PIVOTE[0], PIVOTE[1]);

  // ---- Música
  pentagrama(ctx, t, g, tip);

  for (let i = 0; i < TIEMPOS; i++) {
    const tb = T0 + i * TIEMPO, d = t - tb;
    if (d < 0 || d > 2.8) continue;
    const pt = punta(giro(tb)); // donde estaba la punta en el golpe

    // Ondas de sonido desde la punta
    if (d < 0.9) {
      const p = d / 0.9;
      sonar(ctx, pt[0], pt[1], p, 6, 46 + 20 * FUERZA[i % 4], 2.2, MINT, 0.85 * g);
      if (i % 4 === 0) sonar(ctx, pt[0], pt[1], clamp(p * 1.3 - 0.15), 6, 80, 1.6, TEAL, 0.6 * g);
    }
    glowDot(ctx, pt[0], pt[1], 26, MINT, g * 0.7 * Math.exp(-d / 0.18));
    if (i % 4 === 0) sparkle(ctx, pt[0] + 4, pt[1] - 4, 22, WHITE, g * env(d, 0, 0.08, 0.2, 0.5));

    // Notas sueltas que flotan desde la punta (hacia arriba y a los costados, algunas a la pared)
    for (let n = 0; n < 2; n++) {
      const sem = i * 2 + n;
      const ang = -Math.PI / 2 + (rnd(sem, 1) - 0.6) * 2.2, vel = 70 + 60 * rnd(sem, 2);
      const vida = clamp(d / 2.8);
      const x = pt[0] + Math.cos(ang) * vel * d + 12 * Math.sin(d * 3.2 + sem);
      const y = pt[1] + Math.sin(ang) * vel * d - 16 * d * d;
      const tipo = ['corchea', 'negra', 'doble', 'corchea'][Math.floor(rnd(sem, 3) * 4)];
      const a = g * smooth(0.05 * n, 0.12 + 0.05 * n, d) * (1 - smooth(0.55, 1, vida));
      const tam = (2.1 + 1.1 * rnd(sem, 4)) * (0.4 + 0.6 * easeOut(d / 0.3));
      notaLuz(ctx, x, y, tam, tipo, rnd(sem, 5) < 0.5 ? TEAL : NAVY, a, 0.35 * Math.sin(d * 2.4 + sem));
    }
  }

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
