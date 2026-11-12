/*
 * PreTriage · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * Historia en 14 s, con personajes que SALEN DEL PAPEL (el lienzo se extiende un 30 % por lado):
 *  1. El paciente tiembla de fiebre; el médico, en el celular, le habla (cabeza, boca, mano) y el globo
 *     se escribe.
 *  2. El paciente se despega del póster (deja su hueco en el papel) y sale caminando por la derecha,
 *     hacia la pared, donde aparece la guardia ("Espera 12 min"). Entra, lo atienden y sale curado.
 *  3. Mientras tanto el médico sale del celular hacia vos, saluda ("¡Te esperamos!") y vuelve a entrar.
 *  4. El paciente vuelve caminando contento a su lugar y aparece su turno confirmado.
 * Abajo, cada paso se enciende cuando la historia pasa por él y su ícono salta fuera del papel.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 14, MARGEN = 0.3;
const TEAL = [32, 178, 170], NAVY = [30, 42, 95], RED = [240, 80, 70], WHITE = [255, 255, 255], SWEAT = [120, 190, 240], INK = [18, 18, 22], GREEN = [60, 190, 110];
const G = t => env(t, 0.3, 1.0, 12.9, 13.6);

// Renglones del globo de diálogo [x0, x1, y]
const RENGLONES = [[246, 332, 446], [247, 310, 456.3], [249, 284, 466.7], [293, 316, 466.7]];
const PILDORAS = [[10, 929, 232, 79], [262, 929, 228, 79], [512, 929, 230, 79], [755, 929, 230, 79]];
const ICONOS = [[148, 855], [380, 858], [627, 860], [862, 856]];
// Momento en que la historia pasa por cada paso
const PASOS = [1.0, 3.6, 5.4, 10.3];

// ---- Paciente (pies en 680, 746)
const PIES = [680, 746], AFUERA = 1150, GUARDIA = [1150, 330];
const TP = { despega: 1.8, camina: 2.3, llega: 4.7, adentro: 5.3, sale: 7.3, vuelve: 7.9, casa: 10.3, fin: 10.8 };
const fiebre = t => 1 - smooth(TP.adentro, TP.sale, t);

function paciente(t) {
  const alto = env(t, TP.despega, TP.camina, TP.casa, TP.fin);
  let x = PIES[0], y = PIES[1], sc = 1, andando = 0;
  if (t >= TP.camina && t < TP.llega) { x = PIES[0] + (AFUERA - PIES[0]) * clamp((t - TP.camina) / (TP.llega - TP.camina)); andando = 1; }
  else if (t >= TP.llega && t < TP.adentro) {
    const k = easeInOut((t - TP.llega) / (TP.adentro - TP.llega));
    x = AFUERA; y = PIES[1] + (GUARDIA[1] + 60 - PIES[1]) * k; sc = 1 - 0.85 * k;
  } else if (t >= TP.adentro && t < TP.sale) { x = AFUERA; y = GUARDIA[1] + 60; sc = 0.15; }
  else if (t >= TP.sale && t < TP.vuelve) {
    const k = easeInOut((t - TP.sale) / (TP.vuelve - TP.sale));
    x = AFUERA; y = GUARDIA[1] + 60 + (PIES[1] - GUARDIA[1] - 60) * k; sc = 0.15 + 0.85 * k;
  } else if (t >= TP.vuelve && t < TP.casa) { x = AFUERA + (PIES[0] - AFUERA) * clamp((t - TP.vuelve) / (TP.casa - TP.vuelve)); andando = 1; }
  // Mira a la derecha (espejado) al ir; vuelve mirando a la izquierda (como en el póster).
  const sx = 1 - 2 * (smooth(TP.camina - 0.2, TP.camina + 0.1, t) * (1 - smooth(TP.sale - 0.1, TP.sale + 0.2, t)));
  const paso = caminata(t, t < TP.sale ? 2.0 : 2.6, t < TP.sale ? 0.8 : 1.2);
  const aterrizaje = t > TP.casa ? -14 * Math.sin(Math.PI * clamp((t - TP.casa) / 0.3)) * Math.exp(-(t - TP.casa) * 3) : 0;
  const visible = 1 - smooth(TP.adentro - 0.25, TP.adentro, t) * (1 - smooth(TP.sale, TP.sale + 0.25, t));
  return { x, y: y + paso.bote * andando - 12 * alto + aterrizaje, sc, sx, rot: paso.balanceo * andando, alto, andando, visible };
}

// ---- Médico que sale del celular (pies en 400, 750)
const medAfuera = t => env(t, 4.8, 5.3, 7.5, 8.0);
const habla = t => env(t, 1.0, 1.3, 4.0, 4.4);

/** Globito de diálogo con texto. */
function globo(ctx, x, y, texto, a, cola = -1) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.translate(x, y); const s = 0.6 + 0.4 * clamp(a); ctx.scale(s, s);
  ctx.font = '800 22px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const w = ctx.measureText(texto).width + 34;
  rrect(ctx, -w / 2, -26, w, 50, 24); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(cola * 10, 20); ctx.lineTo(cola * 26, 42); ctx.lineTo(cola * -10, 20); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(TEAL, 1); rrect(ctx, -w / 2, -26, w, 50, 24); ctx.stroke();
  ctx.fillStyle = rgba(NAVY, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(texto, 0, 0);
  ctx.restore();
}

/** Cartel de la guardia, en la pared a la derecha del póster. */
function guardia(ctx, t, a) {
  if (a <= 0.01) return;
  const [x, y] = GUARDIA, s = 0.5 + 0.5 * easeOut(clamp(a * 1.4));
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -95, -95, 190, 190, 22); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 4; ctx.strokeStyle = rgba(NAVY, 1); ctx.stroke();
  // Cruz roja
  ctx.fillStyle = rgba(RED, 1); ctx.fillRect(-12, -78, 24, 64); ctx.fillRect(-32, -58, 64, 24);
  ctx.fillStyle = rgba(NAVY, 1); ctx.font = '800 26px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Guardia', 0, 6);
  // Estado: espera → atendiendo (barra) → listo
  ctx.font = '700 17px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  if (t < TP.adentro) { ctx.fillStyle = rgba(TEAL, 1); ctx.fillText('Espera: 12 min', 0, 40); }
  else if (t < TP.sale - 0.4) {
    ctx.fillStyle = '#555'; ctx.fillText('Atendiendo…', 0, 36);
    rrect(ctx, -70, 52, 140, 12, 6); ctx.fillStyle = '#e6e6ea'; ctx.fill();
    rrect(ctx, -70, 52, 140 * clamp((t - TP.adentro) / (TP.sale - 0.4 - TP.adentro)), 12, 6); ctx.fillStyle = rgba(TEAL, 1); ctx.fill();
  } else { ctx.fillStyle = rgba(GREEN, 1); ctx.fillText('¡Listo! ✓', 0, 40); }
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);

  const p = paciente(t), mo = medAfuera(t) * g;

  // ---- Placas limpias (el póster sin las figuras que se mueven): van primero, todo lo demás encima
  ['fondoPaciente', 'piso', 'fondoMedCabeza', 'fondoMedMano', 'fondoFlecha1', 'fondoFlecha2', 'fondoFlecha3'].forEach(n => sprite(ctx, n));
  if (mo > 0.001) sprite(ctx, 'fondoMedico');

  // ---- Escudo: late y emite ondas
  const latido = Math.pow(Math.max(0, Math.sin(t * 2.6)), 6);
  emitters(t, 1.8, 12.6, 1.9, 1.6, (q) => sonar(ctx, 551, 441, q, 30, 74, 2.6, TEAL, 0.7 * g));
  blob(ctx, 551, 441, 70, TEAL, 0.18 * g * (0.5 + latido));
  sprite(ctx, 'escudo', 0, 0, 1 + 0.07 * latido * g, 0, 1);
  sparkle(ctx, 551, 438, 20, WHITE, g * env(t, 10.4, 10.7, 10.9, 11.4));

  // ---- Guardia en la pared
  guardia(ctx, t, g * env(t, 3.6, 4.0, 8.2, 8.7));

  // ---- Paciente
  const f = fiebre(t) * g * (1 - p.alto);
  const temblor = f * (1.1 * Math.sin(t * 53) + 0.6 * Math.sin(t * 37 + 1)) + fiebre(t) * g * p.alto * 0.6 * Math.sin(t * 47);
  const mareo = 0.013 * Math.sin(t * 1.5) * g * (1 - p.alto) + f * 0.004 * Math.sin(t * 41);
  const resp = 1 + 0.009 * Math.sin(t * 2.4) * g;
  blob(ctx, 680, 480, 85 + 8 * Math.sin(t * 4), RED, 0.2 * f * (0.6 + 0.4 * Math.sin(t * 3.1)));
  if (p.andando) sombraPiso(ctx, p.x, PIES[1] + 4, 170 * p.sc, 0.8 * g * p.visible);
  despegar(ctx, 'paciente', {
    alto: p.alto * g, hueco: p.alto * g, a: p.visible,
    dx: p.x - PIES[0] + temblor, dy: p.y - PIES[1], sx: p.sc * p.sx, sy: p.sc * resp, rot: p.rot + mareo, px: PIES[0], py: PIES[1],
  });
  // Gotas de sudor (mientras tiene fiebre, en su lugar)
  ctx.save(); pivotar(ctx, 680, 746, temblor, 0, mareo, 1, resp);
  emitters(t, 0.8, TP.camina, 0.7, 1.2, (q, i) => {
    const [x, y] = [[707, 478], [668, 500], [703, 466]][i % 3];
    const a = 0.85 * g * (1 - p.alto) * Math.sin(Math.PI * clamp(q * 1.3));
    if (a <= 0.01) return;
    const yy = y + 34 * q * q, r = 3.2;
    ctx.beginPath(); ctx.moveTo(x, yy - r * 2.2); ctx.quadraticCurveTo(x + r * 1.3, yy, x, yy + r); ctx.quadraticCurveTo(x - r * 1.3, yy, x, yy - r * 2.2);
    ctx.fillStyle = rgba(SWEAT, a); ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = rgba([40, 90, 150], a); ctx.stroke();
  });
  ctx.restore();
  // Vuelve contento: corazoncitos y destellos a su paso
  if (t > TP.vuelve && t < TP.casa + 0.6) {
    emitters(t, TP.vuelve, TP.casa + 0.3, 0.35, 1.0, (q, i) => {
      const hx = paciente(t - q).x + 30 + rnd(i, 1) * 40, hy = 430 - 50 * q;
      sparkle(ctx, hx, hy, 10, WHITE, g * Math.sin(Math.PI * q));
      glowDot(ctx, hx, hy, 8, GREEN, 0.6 * g * Math.sin(Math.PI * q));
    });
  }

  // ---- Médico: en el celular habla (cabeza, boca, mano); entre 4.8 y 8 s sale del celular y saluda
  if (mo > 0.001) {
    const saludo = 0.06 * Math.sin(t * 7) * mo;
    despegar(ctx, 'medico', { alto: mo, hueco: mo, sx: 1 + 0.3 * mo, sy: 1 + 0.3 * mo, dx: -40 * mo, dy: -24 * mo, rot: saludo, px: 400, py: 750 });
    globo(ctx, 300, 330, '¡Te esperamos!', g * env(t, 5.4, 5.7, 7.2, 7.5), 1);
  } else {
    const h = habla(t) * g;
    const giro = (0.05 * Math.sin(t * 2.1) + 0.025 * Math.sin(t * 5.3)) * h + 0.015 * Math.sin(t * 1.1) * g;
    const asiente = 1.4 * Math.max(0, Math.sin(t * 4.2)) * h;
    ctx.save();
    pivotar(ctx, 403, 478, 0, asiente * 0.35, giro);
    ctx.drawImage(SPR.medCabeza.cv, SPR.medCabeza.x, SPR.medCabeza.y, SPR.medCabeza.w, SPR.medCabeza.h);
    const boca = 1 + h * (-0.55 + 0.75 * Math.abs(Math.sin(t * 9.5) * Math.sin(t * 3.7 + 0.6)));
    spriteT(ctx, 'medBoca', { sx: 1, sy: boca, px: 411.5, py: 459 });
    ctx.restore();
    sprite(ctx, 'cuello');
    const gesto = -h * (0.1 + 0.08 * Math.sin(t * 3.4)) + 0.03 * Math.sin(t * 1.3) * g;
    sprite(ctx, 'medMano', 0, 0, 1, gesto, 1, 514, 551);
    sprite(ctx, 'puno');
  }

  // ---- Globo de diálogo del celular: el mensaje se escribe
  const escrito = clamp((t - 1.3) / 2.6);
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
      if (resto <= 0 && escrito < 1) glowDot(ctx, x0 + l, y, 5, TEAL, 0.9 * g);
    }
    const espera = env(t, 0.9, 1.0, 1.25, 1.35);
    for (let i = 0; i < 3; i++) glowDot(ctx, 278 + i * 12, 456 - 3 * Math.max(0, Math.sin(t * 10 - i)), 4.5, TEAL, espera * g);
  }
  glowRect(ctx, 232, 432, 113, 50, 6, TEAL, 0.35 * habla(t) * g, 2, 12);

  // ---- Chips: temperatura (con fiebre) y turno confirmado (al volver)
  const temp = (38.2 + 0.5 * smooth(0.8, 2.0, t)).toFixed(1);
  chip(ctx, 700, 384, 186, 46, 'Temperatura', temp + ' °C', RED, env(t, 0.8, 1.2, 1.9, 2.3) * g, clamp((t - 0.8) / 0.6));
  chip(ctx, 636, 384, 290, 46, '¡Atendido a tiempo!', 'Esperó 12 min, no 3 horas', TEAL, env(t, 10.6, 11.0, 12.3, 12.8) * g, clamp((t - 10.6) / 0.6));

  // ---- Pasos: cada uno se enciende cuando la historia pasa por él y su ícono salta fuera del papel
  PILDORAS.forEach(([x, y, w, hh], i) => {
    const t0 = PASOS[i], on = env(t, t0, t0 + 0.3, t0 + 1.4, t0 + 2.0) * g;
    glowRect(ctx, x, y, w, hh, hh / 2, TEAL, on, 3, 18);
    sheen(ctx, x, y, w, hh, hh / 2, (t - t0) / 1.1, 0.35 * g);
    const [ix, iy] = ICONOS[i];
    const k = clamp((t - t0) / 1.0), salto = Math.sin(Math.PI * k) * g;
    if (k > 0 && k < 1) {
      sprite(ctx, 'fondoIcono' + (i + 1));
      sombraPiso(ctx, ix, iy + 52, 110, 0.7 * g * (1 - 0.5 * salto));
      despegar(ctx, 'icono' + (i + 1), { alto: salto, hueco: 0.4 * salto, dy: -90 * salto, sx: 1 + 0.3 * salto, sy: 1 + 0.3 * salto, rot: 0.25 * Math.sin(TAU * k) * g });
    }
    emitters(t, t0 + 0.5, t0 + 0.6, 1, 1.2, (q) => sonar(ctx, ix, iy, q, 30, 78, 2.6, TEAL, 0.8 * g));
    if (i < 3) {
      const empuje = 9 * Math.sin(Math.PI * clamp((t - t0 - 0.9) / 0.8)) * g;
      sprite(ctx, 'flecha' + (i + 1), empuje, 0, 1, 0, 1);
    }
  });

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
