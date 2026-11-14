/*
 * HydroPilot · capa animada. Coordenadas de diseño 990×1400 (póster 1131×1600).
 * "Precisión en cada gota": gotas de agua caen dentro del logo hasta el cuenco y lo hacen ondular; las hojas
 * del logo (recorte real del póster, sobre una placa limpia) se mecen y rebotan con cada gota. A los costados
 * aparecen las lecturas del cultivo (pH, conductividad, temperatura, nivel) que se actualizan solas, y las
 * cuatro tarjetas (anomalías, optimización, forecasting, simulación) se encienden en secuencia.
 */
const W = 1131, H = 1600, DW = 990, DH = 1400, DUR = 10;
const AGUA = [26, 170, 205], AGUA_C = [150, 225, 245], VERDE = [120, 200, 90], VERDE_O = [30, 90, 30], BLANCO = [255, 255, 255];
const G = t => env(t, 0.3, 1.0, 8.9, 9.7);
const FUENTE = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const BASE = [502, 410];             // base de las hojas (pivote)
const CUENCO = [498, 446];           // donde caen las gotas
const GOTAS = [1.2, 3.6, 6.0];       // momento en que cada gota toca el cuenco
const CAIDA = 0.75;                  // duración de la caída
const TARJETAS = [[35, 884, 212, 226, 141], [273, 884, 211, 226, 379], [510, 884, 211, 226, 617], [747, 884, 212, 226, 853]];

/** Gota con brillo (forma de lágrima). */
function gota(ctx, x, y, s, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const gr = ctx.createLinearGradient(-6, -14, 6, 8);
  gr.addColorStop(0, rgba(AGUA_C, a)); gr.addColorStop(1, rgba(AGUA, a));
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(0, -16);
  ctx.bezierCurveTo(3, -9, 8, -4, 8, 2); ctx.arc(0, 2, 8, 0, Math.PI); ctx.bezierCurveTo(-8, -4, -3, -9, 0, -16);
  ctx.fill();
  ctx.fillStyle = rgba(BLANCO, 0.85 * a); ctx.beginPath(); ctx.ellipse(-3, 0, 1.8, 3.6, 0.3, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Lectura del cultivo: píldora translúcida con etiqueta y valor. */
function lectura(ctx, x, y, etiqueta, valor, a) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a;
  rrect(ctx, x, y, 176, 54, 27); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = rgba(AGUA_C, 1); ctx.beginPath(); ctx.arc(x + 25, y + 27, 7, 0, TAU); ctx.fill();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = FUENTE(500, 13); ctx.fillStyle = 'rgba(220,240,220,0.95)'; ctx.fillText(etiqueta, x + 42, y + 18);
  ctx.font = FUENTE(700, 21); ctx.fillStyle = '#fff'; ctx.fillText(valor, x + 42, y + 37);
  ctx.restore();
}

function render(ctx, t) {
  t = ((t % DUR) + DUR) % DUR;
  const g = G(t);
  begin(ctx, W, H, DW, DH);
  if (g <= 0.002) { ctx.restore(); return; }

  // ---- Rebote de las hojas con cada gota + vaivén
  let rebote = 0;
  GOTAS.forEach(tg => { const d = t - tg; if (d > 0) rebote += Math.exp(-d * 3.2) * Math.sin(d * 14); });
  const rot = g * (0.03 * Math.sin(t * TAU / 5) + 0.035 * rebote);
  sprite(ctx, 'fondoHojas');
  spriteT(ctx, 'hojas', { px: BASE[0], py: BASE[1], rot, sy: 1 + g * 0.025 * rebote });

  // ---- Gotas: caen por el centro, salpican y ondulan el cuenco
  GOTAS.forEach((tg, i) => {
    const d = t - tg;
    if (d > -CAIDA && d < 0) {
      const p = (d + CAIDA) / CAIDA, y = 252 + (CUENCO[1] - 10 - 238) * p * p;
      gota(ctx, 500 + 3 * Math.sin(i * 2.1), y, 1.35 + 0.15 * p, g * smooth(0, 0.12, p));
    }
    if (d >= 0 && d < 1.8) {
      for (let r = 0; r < 3; r++) { // ondas elípticas sobre el agua del cuenco
        const q = clamp((d - r * 0.2) / 1.3);
        if (q <= 0 || q >= 1) continue;
        ctx.save(); ctx.translate(CUENCO[0], CUENCO[1]); ctx.scale(1, 0.2);
        ctx.beginPath(); ctx.arc(0, 0, 14 + 70 * easeOut(q), 0, TAU);
        ctx.lineWidth = 3 * (1 - q) + 1; ctx.strokeStyle = rgba(AGUA, 0.8 * g * (1 - q)); ctx.stroke();
        ctx.restore();
      }
      for (let k = 0; k < 6; k++) { // salpicadura
        const q = d / 0.55;
        if (q >= 1) continue;
        const ang = -Math.PI / 2 + (k - 2.5) * 0.42, v = 34 + 10 * rnd(k, i);
        gota(ctx, CUENCO[0] + Math.cos(ang) * v * q, CUENCO[1] + Math.sin(ang) * v * q + 60 * q * q, 0.32, g * (1 - q));
      }
      glowDot(ctx, CUENCO[0], CUENCO[1], 50, AGUA_C, 0.4 * g * Math.exp(-d * 4));
    }
  });

  // ---- Lecturas del cultivo a los costados del logo (se actualizan solas)
  const nivel = 86 + GOTAS.filter(tg => t > tg).length;
  const ent = n => g * smooth(1.6 + n * 0.35, 2.1 + n * 0.35, t);
  lectura(ctx, 40, 446, 'pH', (6.1 + 0.1 * Math.sin(t * 0.9)).toFixed(1), ent(0));
  lectura(ctx, 40, 512, 'Conductividad', `${(1.8 + 0.06 * Math.sin(t * 0.7 + 1)).toFixed(2)} mS`, ent(1));
  lectura(ctx, 774, 446, 'Temperatura', `${(22.4 + 0.3 * Math.sin(t * 0.5)).toFixed(1)} °C`, ent(2));
  lectura(ctx, 774, 512, 'Nivel de solución', `${nivel} %`, ent(3));

  // ---- Tarjetas en secuencia
  TARJETAS.forEach(([x, y, w, h, cx], i) => {
    const t0 = 2.6 + i * 1.1;
    const k = g * env(t, t0, t0 + 0.25, t0 + 0.8, t0 + 1.6);
    glowRect(ctx, x, y, w, h, 28, BLANCO, 0.9 * k, 3, 22);
    emitters(t, t0, t0 + 0.1, 5, 1.2, p => sonar(ctx, cx, 955, p, 30, 66, 2.6, VERDE, 0.85 * g));
    sheen(ctx, x, y, w, h, 28, (t - t0) / 1.1, 0.35 * g, [210, 255, 210]);
  });

  // ---- "Precisión en cada gota": brillo cuando cae la segunda gota
  sheen(ctx, 150, 682, 690, 52, 10, (t - GOTAS[1] - 0.1) / 1.2, 0.35 * g);

  ctx.restore();
}

const load = () => loadSprites(SPRITES_SRC);
