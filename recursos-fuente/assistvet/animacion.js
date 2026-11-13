/*
 * AssistVet · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Cuenta el flujo del póster: "Hablás → AssistVet redacta → Firmás".
 *  1. Hablás: el micrófono escucha; a la izquierda, sobre la pared, aparece el dictado del veterinario y
 *     llegan solas las imágenes de la ecografía. Una onda de voz viaja del micrófono a la IA.
 *  2. AssistVet redacta: las chispas titilan y, a la derecha (fuera del papel), se escribe el borrador del
 *     informe órgano por órgano; marca una diferencia entre lo dictado y la imagen.
 *  3. Firmás: el sello verde se enciende, el veterinario corrige y firma; aparece el QR y el informe sale
 *     hacia la familia. El perro sigue todo con la cabeza ladeada y, al final, se pone contento.
 * El lienzo se extiende un 30 % por lado (MARGEN): el dictado y el informe viven en la pared.
 *
 * Desde que existe el video de IA (el perro sale entero), AssistVet usa "modo": "video" y esta capa queda
 * como respaldo. El MP4 se genera con recursos-fuente/assistvet/componer-video.py, no con construir.mjs.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10, MARGEN = 0.3;
const PURPLE = [167, 139, 250], PURPLE_D = [124, 92, 230], GREEN = [74, 201, 110], WHITE = [255, 255, 255];
const AMBER = [255, 190, 80], INK = [20, 16, 34];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const MIC = [190, 677], IA = [495, 677], FIRMA = [798, 677];
const PIVOTE = [500, 1232], PIE = 1231; // el perro se apoya en el borde del pie blanco

/* ---------------------------------------------------------------- utilidades propias */

function texto(ctx, s, x, y, peso, px, color, a, align = 'left') {
  if (a <= 0.01) return;
  ctx.font = FUENTE(peso, px); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(color, a); ctx.fillText(s, x, y);
}

/** Texto que se escribe solo: muestra `k` (0..1) del texto y un cursor mientras escribe. */
function tipeo(ctx, s, x, y, peso, px, color, a, k, t) {
  const n = Math.floor(s.length * clamp(k));
  if (n <= 0 || a <= 0.01) return;
  const parte = s.slice(0, n);
  texto(ctx, parte, x, y, peso, px, color, a);
  if (n < s.length && Math.sin(t * 16) > 0) {
    ctx.fillStyle = rgba(color, a); ctx.fillRect(x + ctx.measureText(parte).width + 1.5, y - px * 0.55, 1.4, px * 1.1);
  }
}

function corazon(ctx, x, y, s, color, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-7, -3, -4, -9, 0, -5); ctx.bezierCurveTo(4, -9, 7, -3, 0, 3);
  ctx.fillStyle = rgba(color, a); ctx.shadowColor = rgba(color, a); ctx.shadowBlur = 8; ctx.fill();
  ctx.restore();
}

/** Tilde (check) que se dibuja de a poco (k: 0..1). */
function tilde(ctx, x, y, s, color, a, k, w = 3) {
  if (k <= 0 || a <= 0.01) return;
  const p = [[x - s * 0.5, y], [x - s * 0.12, y + s * 0.38], [x + s * 0.55, y - s * 0.4]];
  const pl = polyline(p), L = pl.total * clamp(k);
  ctx.beginPath(); ctx.moveTo(...p[0]);
  for (let s2 = 2; s2 <= L; s2 += 2) ctx.lineTo(...pl.at(s2));
  ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(color, a); ctx.stroke();
}

/** Miniatura de ecografía: abanico gris con moteado y un órgano anecoico. */
const MOTEADO = Array.from({ length: 140 }, (_, i) => [rnd(i, 1), rnd(i, 2), rnd(i, 3)]);
function ecografia(ctx, x, y, s, a, semilla) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = clamp(a);
  rrect(ctx, x - s / 2, y - s / 2, s, s, 8); ctx.fillStyle = 'rgb(6,6,10)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(PURPLE, 0.7); ctx.stroke();
  const ax = x, ay = y - s * 0.42, R = s * 0.82, a0 = Math.PI * 0.5 - 0.62, a1 = Math.PI * 0.5 + 0.62;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.arc(ax, ay, R, a0, a1); ctx.closePath();
  ctx.save(); ctx.clip();
  const gr = ctx.createRadialGradient(ax, ay, 0, ax, ay, R);
  gr.addColorStop(0, 'rgb(150,150,150)'); gr.addColorStop(1, 'rgb(45,45,48)');
  ctx.fillStyle = gr; ctx.fillRect(x - s / 2, y - s / 2, s, s);
  for (const [u, v, w] of MOTEADO) {
    const ang = a0 + (a1 - a0) * ((u + semilla * 0.37) % 1), r = R * (0.08 + 0.92 * v);
    ctx.fillStyle = `rgba(230,230,230,${0.12 + 0.35 * w})`;
    ctx.fillRect(ax + Math.cos(ang) * r, ay + Math.sin(ang) * r, 2 + w * 3, 1.4);
  }
  ctx.beginPath(); ctx.ellipse(x + (semilla ? 6 : -4), y + s * 0.08, s * (semilla ? 0.16 : 0.2), s * 0.11, semilla ? 0.4 : -0.2, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
  ctx.restore();
  texto(ctx, semilla ? 'RIÑÓN IZQ.' : 'VEJIGA', x - s / 2 + 6, y - s / 2 + 9, 700, 7.5, WHITE, 0.8);
  ctx.restore();
}

/** QR decorativo (patrón estable) con sus tres ojos. */
function qr(ctx, x, y, s, a) {
  if (a <= 0.01) return;
  const n = 17, c = s / n;
  ctx.save(); ctx.globalAlpha = clamp(a);
  rrect(ctx, x - 5, y - 5, s + 10, s + 10, 5); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.fillStyle = rgba(INK, 1);
  const ojo = (i, j) => i < 5 && j < 5 || i > n - 6 && j < 5 || i < 5 && j > n - 6;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (ojo(i, j)) continue;
    if (rnd(i * 31 + j, 7) > 0.52) ctx.fillRect(x + i * c, y + j * c, c + 0.3, c + 0.3);
  }
  for (const [i, j] of [[0, 0], [n - 5, 0], [0, n - 5]]) {
    ctx.fillRect(x + i * c, y + j * c, 5 * c, 5 * c);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + (i + 1) * c, y + (j + 1) * c, 3 * c, 3 * c);
    ctx.fillStyle = rgba(INK, 1); ctx.fillRect(x + (i + 1.8) * c, y + (j + 1.8) * c, 1.4 * c, 1.4 * c);
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- piezas de la escena */

/** El perro: asoma, ladea la cabeza siguiendo el flujo y al final se alegra. Nunca deja hueco abajo. */
function perro(ctx, t, g) {
  const rot = g * (0.032 * env(t, 1.3, 1.9, 2.8, 3.4) - 0.03 * env(t, 3.7, 4.3, 5.0, 5.6)
    + 0.016 * Math.sin(t * 10) * env(t, 6.3, 6.6, 7.8, 8.4));
  const asoma = 26 * env(t, 0.35, 0.75, 0.95, 1.6);
  const dy = g * (4 + 3 * Math.sin(t * 1.7)) + asoma + Math.abs(Math.sin(rot)) * 385;
  const sc = 1 + g * 0.007 * (0.5 - 0.5 * Math.cos(t * 2.4));
  ctx.save();
  ctx.beginPath(); ctx.rect(-50, 0, DW + 100, PIE); ctx.clip();
  sprite(ctx, 'fondoPerro'); // placa limpia: el póster sin el perro
  ctx.save();
  pivotar(ctx, PIVOTE[0], PIVOTE[1], 0, dy, rot, sc);
  sprite(ctx, 'perro');
  // brillo en los ojos cuando se pone contento
  const feliz = g * env(t, 6.3, 6.7, 7.9, 8.5);
  for (const [ex, ey] of [[397, 1041], [608, 1041]]) sparkle(ctx, ex, ey, 10 + 3 * Math.sin(t * 8), WHITE, feliz * (0.55 + 0.45 * Math.sin(t * 7 + ex)));
  ctx.restore();
  ctx.restore();
  // corazones que suben desde la cabeza
  emitters(t, 6.5, 8.3, 0.35, 1.8, (p, i) => {
    const x = 380 + rnd(i, 1) * 240 + 14 * Math.sin(p * 6 + i), y = 930 - 150 * p;
    corazon(ctx, x, y, 1.4 + 1.2 * p, i % 3 ? [255, 120, 150] : PURPLE, g * Math.sin(Math.PI * clamp(p * 1.15)));
  });
}

/** Ícono de una columna: halo, latido del recorte y anillos. */
function icono(ctx, nombre, [x, y], color, on, t, g) {
  blob(ctx, x, y, 60, color, 0.4 * on);
  sprite(ctx, nombre, 0, 0, 1 + 0.22 * on * (0.75 + 0.25 * Math.sin(t * 6)), 0, g);
  if (on > 0.05) emitters(t, 0, DUR, 0.7, 1.1, (p) => sonar(ctx, x, y, p, 20, 54, 2, color, 0.7 * on));
}

/** Onda de voz (barras tipo audio) entre el micrófono y la IA. */
function ondaVoz(ctx, t, a) {
  if (a <= 0.01) return;
  const x0 = MIC[0] + 34, x1 = IA[0] - 34;
  for (let x = x0; x <= x1; x += 4.5) {
    const u = (x - x0) / (x1 - x0);
    const habla = 0.5 + 0.5 * Math.sin(t * 3.1 + u * 9) * Math.sin(t * 5.3 - u * 14 + 1.3);
    const h = 3 + 22 * Math.sin(Math.PI * u) * habla;
    ctx.fillStyle = rgba(mix(WHITE, PURPLE, u), a * (0.55 + 0.45 * Math.sin(Math.PI * u)));
    rrect(ctx, x - 1.3, MIC[1] - h / 2, 2.6, h, 1.3); ctx.fill();
  }
}

/** Renglones de texto que fluyen de la IA a la firma. */
function flujoTexto(ctx, t, a) {
  if (a <= 0.01) return;
  const x0 = IA[0] + 34, x1 = FIRMA[0] - 34;
  for (let i = 0; i < 9; i++) {
    const q = (t * 0.55 + i / 9) % 1, x = x0 + (x1 - x0) * q, w = 10 + rnd(i, 4) * 14, y = FIRMA[1] + (rnd(i, 5) - 0.5) * 16;
    ctx.fillStyle = rgba(mix(PURPLE, GREEN, q), a * Math.sin(Math.PI * q));
    rrect(ctx, x - w / 2, y - 1.8, w, 3.6, 1.8); ctx.fill();
  }
}

/** Pared izquierda: el dictado del veterinario y las imágenes que llegan solas. */
function dictado(ctx, t, g) {
  const ent = easeOut((t - 1.0) / 0.7), sal = smooth(2.9, 3.5, t);
  const a = g * smooth(1.0, 1.3, t) * (1 - sal);
  if (a <= 0.01) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(-400, -100, 398, DH + 200); ctx.clip(); // asoma por detrás del borde del póster
  const x = -268 + (1 - ent) * 270, y = 560, w = 252, h = 96;
  ctx.globalAlpha = clamp(a);
  rrect(ctx, x, y, w, h, 14); ctx.fillStyle = 'rgba(20,16,34,0.93)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(PURPLE, 0.75); ctx.stroke();
  glowDot(ctx, x + 22, y + 22, 13, PURPLE, 0.6 + 0.4 * Math.sin(t * 9));
  texto(ctx, 'DICTADO EN VIVO', x + 40, y + 22, 700, 10, PURPLE, 1);
  wifi(ctx, x + w - 26, y + 30, t, 1.0, 3.2, WHITE, 0.8, 0.55, 0.9);
  const frase = ['«Hígado de tamaño normal,', 'riñones conservados, vejiga', 'con contenido anecoico…»'];
  let k = clamp((t - 1.4) / 1.4) * frase.join('').length;
  frase.forEach((r, i) => { tipeo(ctx, r, x + 16, y + 46 + i * 16, 500, 12, WHITE, 1, k / r.length, t); k -= r.length; });
  ctx.globalAlpha = 1;
  ctx.restore();

  // Imágenes del estudio: llegan, y después vuelan hacia la IA
  [[-205, 735, 1.5], [-85, 735, 1.9]].forEach(([ix, iy, t0], s) => {
    const llega = easeOut((t - t0) / 0.5), vuela = easeInOut((t - 2.8 - s * 0.12) / 0.7);
    if (llega <= 0) return;
    const px = ix + (IA[0] - ix) * vuela, py = iy + (1 - llega) * 40 + (IA[1] - iy) * vuela - Math.sin(Math.PI * vuela) * 90;
    ecografia(ctx, px, py, 96 * (1 - 0.8 * vuela), g * llega * (1 - smooth(0.75, 1, vuela)), s);
  });
  texto(ctx, 'IMÁGENES DEL ESTUDIO', -268, 668, 700, 9.5, PURPLE, g * smooth(1.5, 1.8, t) * (1 - smooth(2.7, 3.0, t)));
}

const ORGANOS = [
  ['Hígado', 'Tamaño y ecogenicidad normales'],
  ['Riñones', 'Relación córtico-medular conservada'],
  ['Vejiga', 'Contenido anecoico, pared regular'],
];

/** Pared derecha: el borrador del informe, la firma, el QR y el envío. */
function informe(ctx, t, g) {
  const ent = easeOut((t - 3.0) / 0.7), envia = easeInOut((t - 7.7) / 0.8);
  const a = g * smooth(3.0, 3.3, t) * (1 - smooth(0.6, 1, envia));
  if (a <= 0.01) return;
  const x = 1010 - (1 - ent) * 268 + envia * 120, y = 372 - envia * 160, w = 262, h = 404;
  ctx.save();
  ctx.beginPath(); ctx.rect(DW + 2, -400, 600, DH + 800); ctx.clip();
  ctx.globalAlpha = clamp(a);
  const firmado = smooth(6.0, 6.3, t);
  rrect(ctx, x, y, w, h, 16); ctx.fillStyle = 'rgba(20,16,34,0.95)'; ctx.fill();
  ctx.save(); ctx.shadowColor = rgba(mix(PURPLE, GREEN, firmado), 0.9); ctx.shadowBlur = 16;
  ctx.lineWidth = 2; ctx.strokeStyle = rgba(mix(PURPLE, GREEN, firmado), 0.9); ctx.stroke(); ctx.restore();

  // cabecera
  sprite(ctx, 'logo', x + 26 - 386, y + 26 - 227, 0.62, 0, 1, 386, 227);
  texto(ctx, 'AssistVet', x + 46, y + 26, 800, 15, WHITE, 1);
  const chipW = 84, cx = x + w - chipW - 12;
  rrect(ctx, cx, y + 15, chipW, 22, 11); ctx.fillStyle = rgba(mix(PURPLE_D, [40, 150, 80], firmado), 0.9); ctx.fill();
  texto(ctx, firmado > 0.5 ? 'FIRMADO ✓' : 'BORRADOR IA', cx + chipW / 2, y + 26.5, 800, 9.5, WHITE, 1, 'center');
  texto(ctx, 'Informe ecográfico · Abdomen', x + 16, y + 56, 600, 11.5, [210, 205, 230], 1);
  texto(ctx, 'Paciente: Toby · canino, 6 años', x + 16, y + 74, 500, 11, [160, 155, 180], 1);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 16, y + 88, w - 32, 1);

  // órganos que se escriben de a uno
  ORGANOS.forEach(([org, hallazgo], i) => {
    const t0 = 3.4 + i * 0.6, oy = y + 108 + i * 50;
    const on = smooth(t0, t0 + 0.2, t);
    if (on <= 0.01) return;
    glowDot(ctx, x + 22, oy, 7, PURPLE, on);
    texto(ctx, org, x + 34, oy, 700, 12.5, WHITE, on);
    tipeo(ctx, hallazgo, x + 34, oy + 18, 500, 11, [205, 200, 225], on, (t - t0 - 0.1) / 0.5, t);
  });

  // diferencia entre dictado e imagen → el veterinario la revisa
  const aviso = smooth(5.0, 5.2, t), corrige = smooth(5.7, 5.9, t);
  if (aviso > 0.01) {
    const vy = y + 248;
    rrect(ctx, x + 14, vy - 13, w - 28, 26, 8);
    ctx.fillStyle = rgba(mix([80, 55, 10], [20, 70, 40], corrige), 0.85 * aviso); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(mix(AMBER, GREEN, corrige), aviso); ctx.stroke();
    texto(ctx, corrige > 0.5 ? '✓ Vejiga: sedimento leve (corregido)' : '⚠ La imagen muestra sedimento: revisar',
      x + 24, vy, 700, 10.5, mix(AMBER, [170, 255, 200], corrige), aviso);
    if (aviso < 1 || (t > 5.0 && t < 5.7)) ring(ctx, x + w - 22, vy, 8 + 4 * Math.sin(t * 10), 1.5, AMBER, aviso * (1 - corrige));
  }

  // firma manuscrita que se traza
  const traza = clamp((t - 5.95) / 0.7);
  if (traza > 0) {
    const sx = x + 22, sy = y + 318;
    ctx.beginPath();
    for (let i = 0; i <= 60 * traza; i++) {
      const u = i / 60, px = sx + u * 120, py = sy - 6 * Math.sin(u * 19) - 8 * Math.sin(u * 5 + 1) * (1 - u);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(WHITE, 0.95); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(sx, sy + 16, 130, 1);
    texto(ctx, 'M.V. responsable', sx, sy + 28, 500, 9.5, [170, 165, 190], 1);
  }
  // sello verde
  const sello = smooth(6.3, 6.5, t);
  if (sello > 0.01) {
    const k = 1 + 0.4 * (1 - easeOut((t - 6.3) / 0.35));
    ctx.save(); ctx.translate(x + 110, y + 300); ctx.rotate(-0.18); ctx.scale(k, k);
    ring(ctx, 0, 0, 24, 2.5, GREEN, sello * 0.9);
    tilde(ctx, 0, 0, 22, GREEN, sello, (t - 6.3) / 0.35, 3.5);
    ctx.restore();
  }
  // QR de autenticidad
  const vq = smooth(6.8, 7.1, t);
  if (vq > 0.01) {
    qr(ctx, x + w - 82, y + 290, 62, vq);
    texto(ctx, 'Verificá el informe', x + w - 51, y + 368, 600, 8.5, [190, 185, 210], vq, 'center');
    sheen(ctx, x + w - 87, y + 285, 72, 72, 5, (t - 7.0) / 0.6, 0.6);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // "Enviado a la familia"
  const env2 = g * env(t, 7.9, 8.15, 8.7, 9.1);
  chip(ctx, 1012, 560, 252, 46, 'Enviado a la familia', 'Al instante, con QR ✓', GREEN, env2, clamp((t - 7.9) / 0.5));
}

/* ---------------------------------------------------------------- cuadro */

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // ---- Fondo vivo: manchas violeta y verde que derivan detrás de los títulos
  ctx.save(); ctx.beginPath(); ctx.rect(0, 150, DW, 680); ctx.clip();
  blob(ctx, 160 + 60 * Math.sin(t * 0.6), 420 + 40 * Math.cos(t * 0.5), 260, PURPLE_D, 0.1 * g);
  blob(ctx, 840 + 50 * Math.cos(t * 0.5), 640 + 40 * Math.sin(t * 0.7), 240, GREEN, 0.07 * g);
  ctx.restore();

  // ---- Logo y titulares en secuencia (Vos atendés → AssistVet escribe → Vos validás)
  emitters(t, 0.6, 0.7, 1, 1.4, (p) => sonar(ctx, 386, 227, p, 26, 70, 2, PURPLE, 0.8 * g));
  sprite(ctx, 'logo', 0, 0, 1 + 0.08 * g * env(t, 0.6, 0.9, 1.1, 1.6), 0, g);
  sheen(ctx, 240, 330, 510, 80, 10, (t - 0.8) / 1.3, 0.35 * g);
  blob(ctx, 495, 460, 300, PURPLE, 0.12 * g * env(t, 3.0, 3.4, 4.6, 5.2));
  sheen(ctx, 145, 420, 700, 86, 10, (t - 3.1) / 1.5, 0.4 * g);
  blob(ctx, 495, 553, 260, GREEN, 0.12 * g * env(t, 5.6, 6.0, 7.0, 7.6));
  sheen(ctx, 262, 512, 466, 86, 10, (t - 5.8) / 1.3, 0.4 * g);

  // ---- Las tres columnas
  const onMic = g * env(t, 1.0, 1.3, 2.9, 3.3), onIA = g * env(t, 3.0, 3.3, 5.0, 5.5), onFirma = g * env(t, 5.6, 5.9, 7.6, 8.1);
  icono(ctx, 'iconoMic', MIC, WHITE, onMic, t, g);
  icono(ctx, 'iconoIA', IA, PURPLE, onIA, t, g);
  icono(ctx, 'iconoFirma', FIRMA, GREEN, onFirma, t, g);
  ondaVoz(ctx, t, g * env(t, 1.2, 1.6, 2.8, 3.2));
  flujoTexto(ctx, t, g * env(t, 4.6, 5.0, 5.7, 6.0));
  if (onIA > 0.02) for (let s = 0; s < 4; s++) {
    const ang = s * 1.57 + t * 1.3, r = 34 + 6 * Math.sin(t * 4 + s);
    sparkle(ctx, IA[0] + Math.cos(ang) * r, IA[1] + Math.sin(ang) * r, 7 + 3 * Math.sin(t * 8 + s * 2), PURPLE, onIA * (0.5 + 0.5 * Math.sin(t * 6 + s)));
  }
  if (onFirma > 0.02) tilde(ctx, FIRMA[0], FIRMA[1] - 46, 18, GREEN, onFirma, (t - 5.7) / 0.4, 3);
  sheen(ctx, 140, 704, 100, 28, 6, (t - 1.1) / 0.9, 0.5 * g);
  sheen(ctx, 382, 704, 226, 28, 6, (t - 3.1) / 1.0, 0.5 * g);
  sheen(ctx, 755, 704, 90, 28, 6, (t - 5.7) / 0.9, 0.5 * g);

  // ---- Señales: voz → IA → firma
  emitters(t, 2.6, 2.7, 1, 0.8, (p) => signal(ctx, polyline([MIC, [IA[0] - 30, IA[1]]]), p, PURPLE, 0.9 * g, 60, 8));
  emitters(t, 5.2, 5.3, 1, 0.8, (p) => signal(ctx, polyline([[IA[0] + 30, IA[1]], FIRMA]), p, GREEN, 0.9 * g, 60, 8));

  // ---- El perro
  perro(ctx, t, g);

  // ---- Fuera del papel: dictado (izquierda) e informe (derecha)
  dictado(ctx, t, g);
  emitters(t, 3.0, 3.1, 1, 0.7, (p) => signal(ctx, polyline([[IA[0] + 24, IA[1] - 20], [700, 560], [DW + 14, 470]]), p, PURPLE, 0.9 * g, 70, 8));
  informe(ctx, t, g);

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
