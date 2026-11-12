/*
 * PreTriage · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * El médico (dentro del celular) habla: mueve la cabeza y la boca, gesticula con la mano y el globo de
 * diálogo se va escribiendo. El paciente tiembla de fiebre, se marea y transpira; cuando el médico le
 * responde se calma y aparece su turno. El escudo late, y abajo los cuatro pasos se encienden en orden
 * con las flechas empujando hacia el siguiente.
 * Cada figura que se mueve es un recorte con su silueta que se dibuja sobre una "placa limpia" (el póster
 * con la figura borrada), así no quedan fantasmas del impreso.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const TEAL = [32, 178, 170], NAVY = [30, 42, 95], RED = [240, 80, 70], WHITE = [255, 255, 255], SWEAT = [120, 190, 240], INK = [18, 18, 22];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);

// Ventanas en que el médico habla
const habla = t => env(t, 1.2, 1.5, 4.6, 5.0) + env(t, 5.6, 5.9, 8.2, 8.6);
// Fiebre del paciente: fuerte al principio, se calma cuando el médico le responde
const fiebre = t => 1 - 0.85 * smooth(5.4, 7.0, t);

// Renglones del globo de diálogo [x0, x1, y]
const RENGLONES = [[246, 332, 446], [247, 310, 456.3], [249, 284, 466.7], [293, 316, 466.7]];
const PILDORAS = [[10, 929, 232, 79], [262, 929, 228, 79], [512, 929, 230, 79], [755, 929, 230, 79]];
const ICONOS = [[148, 855], [380, 858], [627, 860], [862, 856]];

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  // ---- Placas limpias (el póster sin las figuras que se mueven): van primero, todo lo demás encima
  ['fondoPaciente', 'piso', 'fondoMedCabeza', 'fondoMedMano', 'fondoFlecha1', 'fondoFlecha2', 'fondoFlecha3'].forEach(n => sprite(ctx, n));

  // ---- Escudo: late y emite ondas
  const latido = Math.pow(Math.max(0, Math.sin(t * 2.6)), 6);
  emitters(t, 1.8, 8.6, 1.9, 1.6, (p) => sonar(ctx, 551, 441, p, 30, 74, 2.6, TEAL, 0.7 * g));
  blob(ctx, 551, 441, 70, TEAL, 0.18 * g * (0.5 + latido));
  sprite(ctx, 'escudo', 0, 0, 1 + 0.07 * latido * g, 0, 1);
  sparkle(ctx, 551, 438, 20, WHITE, g * env(t, 3.0, 3.3, 3.5, 4.0));
  sparkle(ctx, 551, 438, 18, WHITE, g * env(t, 6.4, 6.7, 6.9, 7.4));

  // ---- Paciente: fiebre (temblor), mareo y respiración
  const f = fiebre(t) * g;
  const temblor = f * (1.1 * Math.sin(t * 53) + 0.6 * Math.sin(t * 37 + 1));
  const mareo = 0.013 * Math.sin(t * 1.5) * g + f * 0.004 * Math.sin(t * 41);
  const resp = 1 + 0.009 * Math.sin(t * 2.4) * g;
  blob(ctx, 680, 480, 85 + 8 * Math.sin(t * 4), RED, 0.2 * f * (0.6 + 0.4 * Math.sin(t * 3.1)));
  spriteT(ctx, 'paciente', { dx: temblor, rot: mareo, sx: 1, sy: resp, px: 680, py: 746 });
  // Gotas de sudor que caen desde la frente
  ctx.save(); pivotar(ctx, 680, 746, temblor, 0, mareo, 1, resp);
  emitters(t, 0.8, 7.0, 0.7, 1.2, (p, i) => {
    const [x, y] = [[707, 478], [668, 500], [703, 466]][i % 3];
    const a = 0.85 * g * fiebre(t) * Math.sin(Math.PI * clamp(p * 1.3));
    if (a <= 0.01) return;
    const yy = y + 34 * p * p, r = 3.2;
    ctx.beginPath(); ctx.moveTo(x, yy - r * 2.2); ctx.quadraticCurveTo(x + r * 1.3, yy, x, yy + r); ctx.quadraticCurveTo(x - r * 1.3, yy, x, yy - r * 2.2);
    ctx.fillStyle = rgba(SWEAT, a); ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = rgba([40, 90, 150], a); ctx.stroke();
  });
  ctx.restore();
  // Rayitas de temblor extra
  [[590, 505, -1], [592, 610, -1], [748, 655, 1]].forEach(([x, y, s], i) => {
    const a = 0.8 * f * (0.5 + 0.5 * Math.sin(t * 9 + i * 2));
    if (a <= 0.02) return;
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) { const yy = y - 16 + k * 2.6, xx = x + s * 10 + Math.sin(k * 1.6 + t * 20) * 2.2; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.strokeStyle = rgba(INK, a); ctx.stroke();
  });

  // ---- Médico: cabeza que acompaña lo que dice, boca que habla, mano que gesticula
  const h = habla(t) * g;
  const giro = (0.05 * Math.sin(t * 2.1) + 0.025 * Math.sin(t * 5.3)) * h + 0.015 * Math.sin(t * 1.1) * g;
  const asiente = 1.4 * Math.max(0, Math.sin(t * 4.2)) * h;
  ctx.save();
  pivotar(ctx, 403, 478, 0, asiente * 0.35, giro);
  ctx.drawImage(SPR.medCabeza.cv, SPR.medCabeza.x, SPR.medCabeza.y, SPR.medCabeza.w, SPR.medCabeza.h);
  const boca = 1 + h * (-0.55 + 0.75 * Math.abs(Math.sin(t * 9.5) * Math.sin(t * 3.7 + 0.6)));
  spriteT(ctx, 'medBoca', { sx: 1, sy: boca, px: 411.5, py: 459 });
  ctx.restore();
  sprite(ctx, 'cuello'); // contorno izquierdo del cuello fijo: tapa la unión con la cabeza
  const gesto = -h * (0.1 + 0.08 * Math.sin(t * 3.4)) + 0.03 * Math.sin(t * 1.3) * g;
  sprite(ctx, 'medMano', 0, 0, 1, gesto, 1, 514, 551);
  sprite(ctx, 'puno'); // el puño de la manga queda fijo y tapa la unión con la muñeca

  // ---- Globo de diálogo: el mensaje se escribe renglón por renglón (dos veces)
  const escrito = t < 5.4 ? clamp((t - 1.3) / 2.6) : clamp((t - 5.7) / 2.2);
  const borrado = g * smooth(1.0, 1.3, t);
  if (borrado > 0.01) {
    ctx.fillStyle = rgba(WHITE, borrado); ctx.fillRect(242, 441, 96, 31);
    const total = RENGLONES.reduce((s, [a, b]) => s + b - a, 0);
    let resto = total * escrito;
    ctx.lineCap = 'round'; ctx.lineWidth = 1.45; ctx.strokeStyle = rgba(INK, borrado);
    for (const [x0, x1, y] of RENGLONES) {
      const l = Math.min(resto, x1 - x0); resto -= l;
      if (l <= 0.5) break;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + l, y); ctx.stroke();
      if (resto <= 0 && escrito < 1) glowDot(ctx, x0 + l, y, 5, TEAL, 0.9 * g); // cursor
    }
    // Puntos "escribiendo…" mientras el renglón está vacío
    const espera = env(t, 0.9, 1.0, 1.25, 1.35) + env(t, 5.3, 5.4, 5.65, 5.75);
    for (let i = 0; i < 3; i++) glowDot(ctx, 278 + i * 12, 456 - 3 * Math.max(0, Math.sin(t * 10 - i)), 4.5, TEAL, espera * g);
  }
  glowRect(ctx, 232, 432, 113, 50, 6, TEAL, 0.35 * h, 2, 12);

  // ---- Tableta: un barrido verde la recorre (el pretriage llega)
  ctx.save();
  ctx.beginPath(); ctx.moveTo(410, 513); ctx.lineTo(471, 507); ctx.lineTo(443, 597); ctx.lineTo(383, 602); ctx.closePath(); ctx.clip();
  emitters(t, 2.0, 8.2, 3.2, 1.3, (p) => {
    const y = 505 + 100 * easeInOut(p);
    const gr = ctx.createLinearGradient(0, y - 14, 0, y + 2);
    gr.addColorStop(0, rgba(TEAL, 0)); gr.addColorStop(1, rgba(TEAL, 0.55 * g * Math.sin(Math.PI * p)));
    ctx.fillStyle = gr; ctx.fillRect(375, y - 14, 100, 16);
  });
  ctx.restore();

  // ---- Chips: temperatura del paciente y, al final, su turno
  const temp = (38.2 + 0.5 * smooth(1.2, 3.5, t) - 1.2 * smooth(5.6, 7.5, t)).toFixed(1);
  chip(ctx, 700, 384, 186, 46, 'Temperatura', temp + ' °C', RED, env(t, 1.0, 1.4, 5.6, 6.1) * g, clamp((t - 1.0) / 0.6));
  chip(ctx, 636, 384, 290, 46, 'Tu turno', 'Te atienden en 12 min', TEAL, env(t, 6.3, 6.8, 8.7, 9.2) * g, clamp((t - 6.3) / 0.6));

  // ---- Pasos: se encienden en orden y las flechas empujan al siguiente
  PILDORAS.forEach(([x, y, w, hh], i) => {
    const t0 = 1.6 + i * 1.7, on = env(t, t0, t0 + 0.3, t0 + 1.4, t0 + 2.0) * g;
    glowRect(ctx, x, y, w, hh, hh / 2, TEAL, on, 3, 18);
    sheen(ctx, x, y, w, hh, hh / 2, (t - t0) / 1.1, 0.35 * g);
    const [ix, iy] = ICONOS[i];
    emitters(t, t0, t0 + 0.1, 1, 1.4, (p) => sonar(ctx, ix, iy, p, 30, 78, 2.6, TEAL, 0.8 * g));
    blob(ctx, ix, iy, 70, TEAL, 0.16 * on);
    if (i < 3) {
      const empuje = 7 * Math.sin(Math.PI * clamp((t - t0 - 0.9) / 0.8)) * g;
      sprite(ctx, 'flecha' + (i + 1), empuje, 0, 1, 0, 1);
    }
  });
  // Paciente atendido: destello final sobre el médico del último paso
  sparkle(ctx, 885, 822, 22, WHITE, g * env(t, 7.3, 7.6, 7.8, 8.3));

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
