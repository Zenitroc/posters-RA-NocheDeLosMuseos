/*
 * AeroInspect · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * El dron (recorte real del póster, sobre una placa limpia) vuela en un ocho suave, inclinándose hacia donde
 * avanza, con las hélices girando. Su haz de escaneo barre los silos y marca, una por una, una grieta, una
 * corrosión y una deformación (recuadro + etiqueta con la confianza de la IA). A la derecha, sobre la pared,
 * se arma el reporte con cada hallazgo y termina programando el mantenimiento. Los cuatro íconos de abajo
 * se encienden según la etapa: inspección, análisis, misión y alerta.
 * El lienzo se extiende un 30 % por lado (MARGEN): el reporte vive en la pared.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 12, MARGEN = 0.3;
const CIAN = [80, 200, 255], AZUL = [30, 90, 200], ROJO = [235, 64, 52], AMBAR = [245, 160, 30], VERDE = [52, 180, 100];
const BLANCO = [255, 255, 255], TINTA = [24, 34, 58];
const G = t => env(t, 0.3, 1.0, 10.8, 11.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const CENTRO = [657, 330];   // centro del dron (pivote de su inclinación)
const CAMARA = [643, 380];   // lente de la cámara
const HELICES = [[557, 291], [628, 261], [764, 275], [709, 316]];
const ICONOS = [[153, 990], [375, 990], [622, 990], [849, 990]];

// Hallazgos: dónde mira el dron, qué marca y cuándo
const HALLAZGOS = [
  { t0: 1.6, x: 505, y: 705, w: 52, h: 58, tipo: 'Grieta', conf: 94, color: ROJO },
  { t0: 4.3, x: 360, y: 720, w: 50, h: 62, tipo: 'Corrosión', conf: 88, color: AMBAR },
  { t0: 7.0, x: 668, y: 660, w: 48, h: 54, tipo: 'Deformación', conf: 81, color: AMBAR },
];
const ESCANEO = 2.0; // segundos que el haz barre cada zona antes de marcar

/** Vuelo en ocho: desplazamiento e inclinación (hacia donde avanza). */
function vuelo(t) {
  const g = G(t), w = TAU / DUR;
  const dx = g * 34 * Math.sin(w * t), dy = g * 13 * Math.sin(w * 2 * t) + g * 2.5 * Math.sin(t * 5.3);
  const vx = g * 34 * w * Math.cos(w * t);
  return { dx, dy, rot: 0.028 * vx };
}

function texto(ctx, s, x, y, peso, px, color, a, align = 'left') {
  if (a <= 0.01) return;
  ctx.font = FUENTE(peso, px); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(color, a); ctx.fillText(s, x, y);
}

/** Recuadro de detección con esquinas y etiqueta. k: aparición (0..1). */
function deteccion(ctx, h, k, a) {
  if (a <= 0.01 || k <= 0) return;
  const e = 1 + 0.5 * (1 - easeOut(k)), w = h.w * e, hh = h.h * e, x = h.x - w / 2, y = h.y - hh / 2, c = 12;
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(h.color, 1); ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.shadowColor = rgba(h.color, 0.8); ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
  ctx.moveTo(x + w - c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + c);
  ctx.moveTo(x + w, y + hh - c); ctx.lineTo(x + w, y + hh); ctx.lineTo(x + w - c, y + hh);
  ctx.moveTo(x + c, y + hh); ctx.lineTo(x, y + hh); ctx.lineTo(x, y + hh - c);
  ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = rgba(h.color, 0.12); ctx.fillRect(x, y, w, hh);
  // Etiqueta
  const ke = clamp((k - 0.3) / 0.7);
  if (ke > 0) {
    const s = `${h.tipo} ${h.conf}%`;
    ctx.font = FUENTE(700, 15); const tw = ctx.measureText(s).width + 18;
    ctx.globalAlpha = a * ke;
    rrect(ctx, x, y - 30, tw, 24, 6); ctx.fillStyle = rgba(h.color, 0.95); ctx.fill();
    texto(ctx, s, x + 9, y - 18, 700, 15, BLANCO, 1);
  }
  ctx.restore();
}

/** Haz de escaneo desde la cámara hasta una zona, con una línea que la barre. */
function haz(ctx, cam, h, p, a) {
  if (a <= 0.01) return;
  const x0 = h.x - h.w * 0.9, x1 = h.x + h.w * 0.9, y0 = h.y - h.h * 0.8, y1 = h.y + h.h * 0.8;
  const sy = y0 + (y1 - y0) * (0.5 - 0.5 * Math.cos(p * Math.PI * 3)); // barre arriba-abajo
  const gr = ctx.createLinearGradient(cam[0], cam[1], h.x, h.y);
  gr.addColorStop(0, rgba(BLANCO, 0.75 * a)); gr.addColorStop(0.25, rgba(CIAN, 0.32 * a)); gr.addColorStop(1, rgba(CIAN, 0.12 * a));
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(cam[0] - 2, cam[1]); ctx.lineTo(x0, sy); ctx.lineTo(x1, sy); ctx.lineTo(cam[0] + 2, cam[1]); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.shadowColor = rgba(CIAN, a); ctx.shadowBlur = 12;
  ctx.strokeStyle = rgba(BLANCO, 0.9 * a); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(x1, sy); ctx.stroke(); ctx.restore();
  glowDot(ctx, cam[0], cam[1], 22, CIAN, 0.8 * a);
}

/** Reporte sobre la pared (derecha del póster). */
function reporte(ctx, t, g) {
  const a0 = g * smooth(1.2, 1.8, t);
  if (a0 <= 0.01) return;
  const x = 1012, y = 520, w = 270, h = 280;
  ctx.save(); ctx.globalAlpha = a0;
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  rrect(ctx, x, y, w, h, 14); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill();
  ctx.shadowColor = 'transparent';
  rrect(ctx, x, y, w, 46, 14); ctx.fillStyle = rgba(AZUL, 1); ctx.fill(); ctx.fillRect(x, y + 30, w, 16);
  texto(ctx, 'Reporte de inspección', x + 16, y + 17, 700, 16, BLANCO, 1);
  texto(ctx, 'Planta de acopio · Silos', x + 16, y + 35, 500, 12, [200, 220, 255], 1);
  // Progreso del vuelo
  const prog = clamp((t - 1.2) / 8.4);
  rrect(ctx, x + 16, y + 62, w - 32, 7, 3.5); ctx.fillStyle = 'rgba(30,90,200,0.15)'; ctx.fill();
  rrect(ctx, x + 16, y + 62, (w - 32) * prog, 7, 3.5); ctx.fillStyle = rgba(CIAN, 1); ctx.fill();
  texto(ctx, `Vuelo automático · ${Math.round(prog * 100)}%`, x + 16, y + 84, 500, 12, [90, 100, 120], 1);
  // Hallazgos
  HALLAZGOS.forEach((hz, i) => {
    const k = clamp((t - hz.t0 - ESCANEO) / 0.4);
    if (k <= 0) return;
    const yy = y + 116 + i * 42;
    ctx.globalAlpha = a0 * k;
    ctx.fillStyle = rgba(hz.color, 1); ctx.beginPath(); ctx.arc(x + 24, yy, 6, 0, TAU); ctx.fill();
    texto(ctx, hz.tipo, x + 38, yy - 7, 700, 14, TINTA, 1);
    texto(ctx, `Confianza IA ${hz.conf}%`, x + 38, yy + 10, 500, 11, [100, 110, 130], 1);
    texto(ctx, i === 0 ? 'ALTA' : 'MEDIA', x + w - 16, yy, 700, 11, hz.color, 1, 'right');
  });
  // Mantenimiento programado
  const km = clamp((t - 9.6) / 0.4);
  if (km > 0) {
    ctx.globalAlpha = a0 * km;
    rrect(ctx, x + 16, y + h - 58, w - 32, 40, 10); ctx.fillStyle = rgba(VERDE, 0.14); ctx.fill();
    texto(ctx, '✓ Mantenimiento programado', x + 28, y + h - 38, 700, 13, [20, 120, 60], 1);
  }
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }
  const v = vuelo(t);
  // Punto del dron (en coordenadas del póster) luego de moverlo e inclinarlo
  const mover = ([px, py]) => {
    const c = Math.cos(v.rot), s = Math.sin(v.rot), x = px - CENTRO[0], y = py - CENTRO[1];
    return [CENTRO[0] + v.dx + x * c - y * s, CENTRO[1] + v.dy + x * s + y * c];
  };
  const cam = mover(CAMARA);

  // ---- Haces de escaneo y detecciones sobre los silos
  HALLAZGOS.forEach(hz => {
    const d = t - hz.t0;
    if (d > 0 && d < ESCANEO + 0.3) haz(ctx, cam, hz, d / ESCANEO, g * env(d, 0, 0.25, ESCANEO, ESCANEO + 0.3));
    if (d > ESCANEO - 0.1) {
      const k = clamp((d - ESCANEO + 0.1) / 0.5);
      emitters(t, hz.t0 + ESCANEO, hz.t0 + ESCANEO + 0.1, 5, 1.2, p => sonar(ctx, hz.x, hz.y, p, 10, 60, 3, hz.color, 0.8 * g));
      deteccion(ctx, hz, k, g);
    }
  });

  // ---- Dron: placa limpia y recorte volando
  sprite(ctx, 'fondoDron');
  sprite(ctx, 'dron', v.dx, v.dy, 1, v.rot, 1, CENTRO[0], CENTRO[1]);
  // Hélices girando (discos de movimiento)
  HELICES.forEach(([hx, hy], i) => {
    const [x, y] = mover([hx, hy]);
    ctx.save(); ctx.translate(x, y - 3); ctx.rotate(v.rot); ctx.scale(1, 0.22);
    const gr = ctx.createRadialGradient(0, 0, 6, 0, 0, 44);
    gr.addColorStop(0, rgba(TINTA, 0)); gr.addColorStop(0.75, rgba(TINTA, 0.16 * g)); gr.addColorStop(1, rgba(TINTA, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill();
    const ang = t * 38 + i * 1.3; // aspa borrosa que gira
    ctx.rotate(ang); ctx.fillStyle = rgba(TINTA, 0.22 * g);
    ctx.beginPath(); ctx.ellipse(0, 0, 42, 5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  });
  // Luces de navegación
  const parpadeo = Math.pow(Math.max(0, Math.sin(t * TAU / 1.1)), 8);
  glowDot(ctx, ...mover([556, 300]), 12, ROJO, g * (0.3 + 0.7 * parpadeo));
  glowDot(ctx, ...mover([762, 286]), 12, VERDE, g * (0.3 + 0.7 * parpadeo));

  // ---- Reporte en la pared
  reporte(ctx, t, g);

  // ---- Íconos: inspección (vuelo), análisis (cada hallazgo), misión, alertas (reporte)
  const etapas = [[1.0, 0], [3.6, 1], [6.3, 1], [9.0, 1], [5.0, 2], [9.6, 3]];
  etapas.forEach(([t0, i]) => {
    const [x, y] = ICONOS[i];
    emitters(t, t0, t0 + 0.1, 5, 1.3, p => sonar(ctx, x, y, p, 26, 58, 2.6, AZUL, 0.75 * g));
    glowDot(ctx, x, y, 40, CIAN, 0.3 * g * env(t, t0, t0 + 0.2, t0 + 0.5, t0 + 1.2));
  });

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
