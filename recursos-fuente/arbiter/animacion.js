/*
 * Arbiter · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * La cámara empuja lentamente sobre la foto de la sala (la foto es un recorte real del póster), los
 * papeles vuelan por el aire y un barrido de análisis va marcando cada documento: los riesgos
 * (fraude, documento falso) en rojo, lo que falta en ámbar. Las marcas siguen el movimiento de la foto.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const TEAL = [40, 235, 215], RED = [255, 80, 70], AMBER = [255, 185, 50], WHITE = [255, 255, 255];
const G = t => env(t, 0.3, 0.9, 9.0, 9.7);

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


/** Movimiento de cámara: empuje suave y leve paneo; vale 1 / 0 en t = 0 y t = DUR (loop invisible). */
function camara(t) {
  const u = Math.sin(Math.PI * t / DUR), k = u * u;               // 0 → 1 → 0, con pendiente nula en los extremos
  const s = 1 + 0.07 * k;
  return { s, tx: 14 * Math.sin(2 * Math.PI * t / DUR) * k / 0.9, ty: -10 * k };
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
    const hold = smooth(0.2, 0.7, k) * (1 - smooth(8.2, 9.2, t));
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

  // ---- Isotipo: destellos y pulso
  sparkle(ctx, 200, 948, 30, WHITE, 0.95 * g * env(t, 5.4, 5.9, 6.2, 7.0));
  sparkle(ctx, 200, 948, 24, TEAL, 0.9 * g * env(t, 1.0, 1.4, 1.7, 2.3));
  emitters(t, 3.0, 8.4, 2.4, 1.6, (p) => sonar(ctx, 108, 1038, p, 6, 40, 2.2, TEAL, 0.7 * g));

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
