/*
 * Arbiter · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * 1) La cámara empuja sobre la foto de la sala, vuelan papeles y un barrido de análisis marca cada
 *    documento (riesgos en rojo, faltantes en ámbar, lo correcto en turquesa).
 * 2) SALE DEL PAPEL (lienzo extendido un 30 % por lado): cada documento detectado se despega de la foto
 *    (deja su hueco), vuela a la pared y recibe su sello: FRAUDE a la derecha, FALTA DOC. a la
 *    izquierda, OK arriba. Después vuelven a su lugar.
 * 3) El isotipo se despega y da una vuelta completa.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 14, MARGEN = 0.3;
const TEAL = [40, 235, 215], RED = [255, 80, 70], AMBER = [255, 185, 50], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 0.9, 12.9, 13.6);

// quad: 4 esquinas del recuadro; lab: [x, y, w, h] de la etiqueta; c: color; t0: instante de detección
const DOCS = [
  { quad: [[410, 252], [468, 249], [480, 352], [418, 358]], lab: [420, 225, 160, 19], c: TEAL, t0: 1.3 },
  { quad: [[514, 281], [580, 286], [565, 389], [506, 383]], lab: [514, 254, 148, 19], c: TEAL, t0: 1.7 },
  { quad: [[666, 397], [740, 397], [740, 489], [666, 489]], lab: [666, 372, 195, 19], c: RED, t0: 2.1 },
  { quad: [[346, 460], [429, 471], [421, 531], [343, 522]], lab: [348, 437, 147, 19], c: TEAL, t0: 2.6 },
  { quad: [[486, 526], [584, 526], [584, 628], [486, 628]], lab: [490, 501, 233, 19], c: AMBER, t0: 3.0 },
  { quad: [[92, 543], [166, 530], [191, 670], [108, 686]], lab: [100, 510, 99, 19], c: TEAL, t0: 3.5 },
  { quad: [[606, 596], [650, 594], [657, 650], [612, 655]], lab: [612, 569, 178, 19], c: TEAL, t0: 3.9 },
  { quad: [[791, 654], [898, 662], [890, 733], [786, 722]], lab: [722, 631, 194, 19], c: RED, t0: 4.3 },
  { quad: [[163, 717], [344, 712], [344, 792], [163, 777]], lab: [164, 691, 200, 19], c: TEAL, t0: 4.8 },
];

function bracketQuad(ctx, q, color, a, len = 14) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(color, a); ctx.lineWidth = 3.2;
  for (let i = 0; i < 4; i++) {
    const p = q[i], n = q[(i + 1) % 4], pr = q[(i + 3) % 4];
    const d1 = Math.hypot(n[0] - p[0], n[1] - p[1]), d2 = Math.hypot(pr[0] - p[0], pr[1] - p[1]);
    ctx.beginPath();
    ctx.moveTo(p[0] + (pr[0] - p[0]) / d2 * len, p[1] + (pr[1] - p[1]) / d2 * len);
    ctx.lineTo(p[0], p[1]);
    ctx.lineTo(p[0] + (n[0] - p[0]) / d1 * len, p[1] + (n[1] - p[1]) / d1 * len);
    ctx.stroke();
  }
}


/** Movimiento de cámara: empuje suave y leve paneo en los primeros 5,5 s (después la foto queda quieta
 *  para que los documentos recortados calcen al despegarse). */
const T_CAMARA = 5.5;
function camara(t) {
  const u = Math.sin(Math.PI * clamp(t / T_CAMARA)), k = u * u;               // 0 → 1 → 0, con pendiente nula en los extremos
  const s = 1 + 0.07 * k;
  return { s, tx: 14 * Math.sin(2 * Math.PI * clamp(t / T_CAMARA)) * k / 0.9, ty: -10 * k };
}

// ---- Documentos que salen a la pared: destino, escala y sello según el resultado del análisis
const SELLOS = { [RED.join()]: 'FRAUDE', [AMBER.join()]: 'FALTA DOC.', [TEAL.join()]: 'OK ✓' };
const DESTINOS = (() => {
  let ok = 0, rojo = 0;
  return DOCS.map((d) => {
    if (d.c === RED) return [1150, 260 + 420 * rojo++];
    if (d.c === AMBER) return [-160, 560];
    return [70 + 170 * ok++, -220];
  });
})();
const centro = q => q.reduce((s, v) => [s[0] + v[0] / 4, s[1] + v[1] / 4], [0, 0]);
const T_SALE = 5.8, T_VUELVE = 10.0;

function docEn(t, i) {
  const ts = T_SALE + i * 0.22, tv = T_VUELVE + i * 0.14, dur = 0.9;
  const ida = easeInOut(clamp((t - ts) / dur)), vuelta = easeInOut(clamp((t - tv) / dur));
  const k = ida * (1 - vuelta), arco = Math.sin(Math.PI * clamp((t - ts) / dur)) + Math.sin(Math.PI * clamp((t - tv) / dur));
  const alto = env(t, ts - 0.3, ts, tv + dur - 0.1, tv + dur + 0.2);
  return { k, arco, alto, giro: TAU * (ida - vuelta) };
}

/** Sello de goma: doble borde y texto, girado, que "cae" con un golpe. */
function sello(ctx, x, y, texto, color, a, golpe) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.22); const s = 1 + 0.8 * (1 - easeOut(golpe)); ctx.scale(s, s); ctx.globalAlpha = clamp(a);
  ctx.font = '900 34px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const w = ctx.measureText(texto).width + 34;
  ctx.lineWidth = 5; ctx.strokeStyle = rgba(color, 1); rrect(ctx, -w / 2, -30, w, 60, 8); ctx.stroke();
  ctx.lineWidth = 2; rrect(ctx, -w / 2 + 7, -23, w - 14, 46, 5); ctx.stroke();
  ctx.fillStyle = rgba(color, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(texto, 0, 2);
  ctx.restore();
}

/** Hoja de papel flotando: parallelogramo con "renglones" que gira en 3D. */
function hoja(ctx, x, y, w, h, giro, ang, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(Math.cos(giro) * 0.85 + 0.15 * Math.sign(Math.cos(giro) || 1), 1);
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(238,238,232,0.95)'; ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 8;
  ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(70,80,90,0.55)';
  for (let i = 0; i < 5; i++) ctx.fillRect(-w / 2 + 6, -h / 2 + 8 + i * (h - 14) / 5, (w - 12) * (i === 4 ? 0.5 : 0.9), 2);
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  if (g <= 0.002) return;
  begin(ctx, W, H, DW, DH);
  const cam = camara(t);
  const cx = 495, cy = 480;
  const aplicarCamara = () => { ctx.translate(cx + cam.tx, cy + cam.ty); ctx.scale(cam.s, cam.s); ctx.translate(-cx, -cy); };

  // ---- Foto con empuje de cámara (recorte del póster)
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 136, DW, 780); ctx.clip();
  aplicarCamara();
  ctx.drawImage(SPR.foto.cv, SPR.foto.x, SPR.foto.y, SPR.foto.w, SPR.foto.h);

  // ---- Papeles que vuelan (se ven sobre la foto, con parallax según su tamaño)
  for (let i = 0; i < 18; i++) {
    const per = 5 + rnd(i, 1) * 4, q = ((t / per + rnd(i, 2)) % 1), d = 0.55 + rnd(i, 3) * 0.9;
    const x = 60 + rnd(i, 4) * 870 + Math.sin(q * 6 + i) * 40 * d - q * 90 * d, y = 880 - q * 780 * (0.6 + 0.4 * d);
    hoja(ctx, x, y, 38 * d, 50 * d, q * 9 + i, q * 5 - 1 + rnd(i, 5), Math.sin(Math.PI * q) * 0.72 * g);
  }

  // ---- Barrido de análisis
  const sp = (t - 0.6) / 4.6;
  if (sp > 0 && sp < 1) {
    const yy = 135 + 760 * (sp < 0.5 ? sp * 2 : 2 - sp * 2), a = Math.sin(Math.PI * sp) * g;
    const gr = ctx.createLinearGradient(0, yy - 70, 0, yy + 4);
    gr.addColorStop(0, rgba(TEAL, 0)); gr.addColorStop(1, rgba(TEAL, 0.22 * a));
    ctx.fillStyle = gr; ctx.fillRect(0, yy - 70, DW, 74);
    ctx.save(); ctx.shadowColor = rgba(TEAL, a); ctx.shadowBlur = 16;
    ctx.fillStyle = rgba(TEAL, 0.9 * a); ctx.fillRect(0, yy, DW, 2); ctx.restore();
  }

  // ---- Detección de cada documento (sigue el movimiento de la foto)
  DOCS.forEach((d, i) => {
    const k = t - d.t0;
    if (k < 0) return;
    const flash = env(k, 0, 0.25, 0.7, 1.6);
    const hold = smooth(0.2, 0.7, k) * (1 - smooth(5.6, 6.0, t)) + smooth(11.4, 11.8, t) * (1 - smooth(12.4, 12.9, t));
    const breath = 0.7 + 0.3 * Math.sin(t * 3 + i);
    const a = clamp(flash + hold * 0.6 * breath) * g;
    if (a <= 0.01) return;
    const q = d.quad;
    ctx.save();
    ctx.beginPath(); q.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.fillStyle = rgba(d.c, 0.22 * flash * g); ctx.fill();
    ctx.shadowColor = rgba(d.c, a); ctx.shadowBlur = 14;
    ctx.lineWidth = 2.4; ctx.strokeStyle = rgba(d.c, 0.9 * a); ctx.stroke();
    ctx.restore();
    bracketQuad(ctx, q, d.c, a);
    const [lx, ly, lw, lh] = d.lab;
    ctx.save();
    ctx.fillStyle = rgba(d.c, 0.28 * a); ctx.fillRect(lx - 4, ly - 3, lw + 8, lh + 6);
    ctx.shadowColor = rgba(d.c, a); ctx.shadowBlur = 10;
    ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(d.c, 0.9 * a); ctx.strokeRect(lx - 4, ly - 3, lw + 8, lh + 6);
    ctx.restore();
    emitters(t, d.t0, d.t0 + 0.1, 5, 1.2, (p) => {
      const c = q.reduce((s, v) => [s[0] + v[0] / 4, s[1] + v[1] / 4], [0, 0]);
      sonar(ctx, c[0], c[1], p, 10, 70, 2, d.c, 0.7 * g);
    });
  });
  ctx.restore();

  // ---- Los documentos salen del papel, se sellan en la pared y vuelven
  const fuera = DOCS.map((d, i) => docEn(t, i));
  if (fuera.some(f => f.alto > 0.001)) {
    sprite(ctx, 'fondoDocs');
    DOCS.forEach((d, i) => {
      const f = fuera[i]; if (f.alto <= 0.001) return;
      const [cx0, cy0] = centro(d.quad), [dx1, dy1] = DESTINOS[i];
      const x = cx0 + (dx1 - cx0) * f.k, y = cy0 + (dy1 - cy0) * f.k - 120 * f.arco;
      const sc = 1 + (d.c === TEAL ? 0.35 : 0.9) * f.k + 0.1 * f.alto;
      // Línea de trazabilidad desde su lugar en la foto (mientras viaja y está afuera)
      ctx.save(); ctx.setLineDash([4, 6]); ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(d.c, 0.6 * f.k * g);
      ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
      despegar(ctx, 'doc' + i, { alto: f.alto * g, hueco: f.alto * g, dx: x - cx0, dy: y - cy0, sx: sc, sy: sc, rot: f.giro * 0.5 + 0.08 * Math.sin(t * 2 + i) * f.k, px: cx0, py: cy0 });
      // Marco de color del resultado alrededor de la ficha
      ctx.save(); pivotar(ctx, cx0, cy0, x - cx0, y - cy0, f.giro * 0.5 + 0.08 * Math.sin(t * 2 + i) * f.k, sc, sc);
      ctx.beginPath(); d.quad.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.shadowColor = rgba(d.c, f.alto * g); ctx.shadowBlur = 12; ctx.lineWidth = 2.5 / sc * 1.4; ctx.strokeStyle = rgba(d.c, 0.95 * f.alto * g); ctx.stroke();
      ctx.restore();
      // Sello al llegar
      const ts = T_SALE + i * 0.22 + 1.0, golpe = clamp((t - ts) / 0.25);
      sello(ctx, x, y + 10, SELLOS[d.c.join()], d.c, g * f.k * smooth(ts, ts + 0.1, t), golpe);
      if (golpe > 0 && golpe < 1) sonar(ctx, x, y, golpe, 30, 110, 3, d.c, 0.8 * g);
    });
  }
  chip(ctx, 315, 1430, 360, 48, 'Análisis del siniestro', '2 riesgos · 1 faltante · 6 OK', TEAL, g * env(t, 8.0, 8.4, 9.8, 10.3), clamp((t - 8.0) / 0.6));

  // ---- El isotipo se despega y da una vuelta completa
  const ki = clamp((t - 11.4) / 1.2), si = Math.sin(Math.PI * ki) * g;
  if (ki > 0 && ki < 1) {
    sprite(ctx, 'fondoIsotipo');
    despegar(ctx, 'isotipo', { alto: si, hueco: si, dy: -60 * si, sx: 1 + 0.35 * si, sy: 1 + 0.35 * si, rot: TAU * easeInOut(ki) });
  }

  // ---- Isotipo: destellos y pulso
  sparkle(ctx, 200, 948, 30, WHITE, 0.95 * g * env(t, 5.4, 5.9, 6.2, 7.0));
  sparkle(ctx, 200, 948, 24, TEAL, 0.9 * g * env(t, 1.0, 1.4, 1.7, 2.3));
  emitters(t, 3.0, 12.4, 2.4, 1.6, (p) => sonar(ctx, 108, 1038, p, 6, 40, 2.2, TEAL, 0.7 * g));

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
