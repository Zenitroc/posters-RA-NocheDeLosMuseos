"""
Video de IA → animacion.mp4 del póster (VigIA, EnerScope, Learn To Lead).

Los videos generados (Gemini/Veo, 720×1280, 24 fps) no son el póster recortado sin más: la IA lo achica al
ancho del video, reacomoda el diseño para llenar el 9:16 (estira la foto, corre bloques), deforma textos y a
veces mueve la cámara. Este script, para cada cuadro:

  1. lo alinea con el póster impreso (similitud por cuadro, estimada sobre una zona estática o sobre la
     propia foto que se anima) y lo estabiliza en el tiempo;
  2. corrige el color para que empalme con el impreso;
  3. toma del video sólo la zona que se anima (una zona fija con bordes suaves, o lo que difiere del
     póster), y todo lo demás —textos, logos, íconos, costados que el video no cubre— sale del póster real;
  4. funde el primer y el último tramo con el póster para que el loop sea invisible.

  python recursos-fuente/_comun/componer-video-ia.py <slug> [carpeta-debug]
  slug: vigia | enerscope | learn-to-lead
  Entrada: recursos-fuente/<slug>/original/video-ia.mp4 y public/posters/<slug>/poster.jpg
  Salida:  public/posters/<slug>/animacion.mp4

Requiere: Python 3 con numpy y opencv-python, y ffmpeg en el PATH.
(AssistVet tiene su propio script: recursos-fuente/assistvet/componer-video.py.)
"""
import os, sys, subprocess, cv2, numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..', '..'))
if len(sys.argv) < 2:
    sys.exit(__doc__)
SLUG, DEBUG = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
H = 1600
W = {'vigia': 1132, 'enerscope': 1066, 'learn-to-lead': 1132}[SLUG]
VIDEO = os.path.join(RAIZ, 'recursos-fuente', SLUG, 'original', 'video-ia.mp4')
SALIDA = os.path.join(RAIZ, 'public', 'posters', SLUG, 'animacion.mp4')
P8 = cv2.resize(cv2.imread(os.path.join(RAIZ, 'public', 'posters', SLUG, 'poster.jpg')), (W, H), interpolation=cv2.INTER_AREA)
P = P8.astype(np.float32)
cap = cv2.VideoCapture(VIDEO); FPS = round(cap.get(cv2.CAP_PROP_FPS)) or 24; F = []
while True:
    ok, f = cap.read()
    if not ok: break
    F.append(f)
N = len(F); VH, VW = F[0].shape[:2]
if DEBUG: os.makedirs(DEBUG, exist_ok=True)

# ---------------------------------------------------------------- utilidades
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
gris = lambda im: cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)

def suave(x, sigma):
    """Suavizado gaussiano a lo largo del tiempo (eje 0), con bordes replicados."""
    x = np.asarray(x, np.float64)
    if sigma <= 0: return x
    r = int(3 * sigma); w = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); w /= w.sum()
    pad = np.concatenate([np.repeat(x[:1], r, 0), x, np.repeat(x[-1:], r, 0)])
    return np.stack([np.convolve(pad[:, j], w, 'valid') for j in range(x.shape[1])], 1)

def a_params(M):  # similitud → (escala, ángulo, tx, ty)
    return [np.hypot(M[0, 0], M[1, 0]), np.arctan2(M[1, 0], M[0, 0]), M[0, 2], M[1, 2]]

def de_params(s, a, tx, ty):
    return np.float32([[s * np.cos(a), -s * np.sin(a), tx], [s * np.sin(a), s * np.cos(a), ty]])

def poligono(pts, dil=0, pluma=0):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.int32(pts)], 255)
    if dil: m = cv2.dilate(m, k(dil))
    m = m.astype(np.float32) / 255
    return cv2.GaussianBlur(m, (0, 0), pluma) if pluma else m

def rect(x0, y0, x1, y1, pluma=0):
    return poligono([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], pluma=pluma)

def circulo(cx, cy, r, pluma=0):
    m = np.zeros((H, W), np.float32); cv2.circle(m, (int(cx), int(cy)), int(r), 1, -1)
    return cv2.GaussianBlur(m, (0, 0), pluma) if pluma else m

def similitud_por_cuadro(ancla, sigma=2.0):
    """Similitud video→póster por cuadro (ORB + RANSAC contra la zona estática `ancla` del póster), suavizada."""
    orb, bf = cv2.ORB_create(12000), cv2.BFMatcher(cv2.NORM_HAMMING)
    kp_p, de_p = orb.detectAndCompute(gris(P8), ancla)
    par = []
    for i, f in enumerate(F):
        kp, de = orb.detectAndCompute(gris(f), None)
        ms = [m for m, n in bf.knnMatch(de, de_p, k=2) if m.distance < 0.8 * n.distance]
        src = np.float32([kp[m.queryIdx].pt for m in ms]); dst = np.float32([kp_p[m.trainIdx].pt for m in ms])
        M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2.5, maxIters=10000)
        par.append(a_params(M) if M is not None and inl.sum() >= 30 else [np.nan] * 4)
    par = np.array(par)
    for j in range(4):  # cuadros sin estimación: interpolar
        bad = np.isnan(par[:, j])
        if bad.any(): par[bad, j] = np.interp(np.where(bad)[0], np.where(~bad)[0], par[~bad, j])
    par = suave(par, sigma)
    print(f'alineación por cuadro: escala {par[:, 0].min():.3f}–{par[:, 0].max():.3f}, '
          f'tx {par[:, 2].min():.0f}–{par[:, 2].max():.0f}, ty {par[:, 3].min():.0f}–{par[:, 3].max():.0f}')
    return [de_params(*p) for p in par]

def media_desvio(V, zona):
    """Ajuste por media y desvío por canal (para fotos regeneradas sin correspondencia píxel a píxel)."""
    g = []
    for c in range(3):
        x, y = V[..., c][zona], P[..., c][zona]
        a = y.std() / max(x.std(), 1e-3); g += [a, y.mean() - a * x.mean()]
    return g

def lut_histograma(Vs, zona):
    """Tabla por canal que iguala el histograma del video (varios cuadros) al del póster sobre `zona`."""
    t = []
    for c in range(3):
        x = np.concatenate([V[..., c][zona] for V in Vs]); y = P[..., c][zona]
        q = np.linspace(0, 100, 101)
        xq, yq = np.percentile(x, q), np.percentile(y, q)
        xq = np.maximum.accumulate(xq + np.arange(101) * 1e-4)
        t.append(np.interp(np.arange(256), xq, yq).astype(np.float32))
    return np.stack(t)

def aplicar_lut(V, t):
    Vi = np.clip(V, 0, 255)
    lo = np.floor(Vi).astype(np.int32); hi = np.minimum(lo + 1, 255); f = Vi - lo
    return np.stack([t[c][lo[..., c]] * (1 - f[..., c]) + t[c][hi[..., c]] * f[..., c] for c in range(3)], -1)

def aplicar_color(V, g):
    return np.stack([V[..., c] * g[2 * c] + g[2 * c + 1] for c in range(3)], -1)

def peso(i, entra=0.35, sale=0.6):
    """Entrada y salida fundidas con el póster impreso (loop invisible)."""
    t, dur = i / FPS, N / FPS
    s = lambda e0, e1, x: (lambda q: q * q * (3 - 2 * q))(min(1, max(0, (x - e0) / (e1 - e0))))
    return s(0.0, entra, t) * (1 - s(dur - sale, dur - 0.04, t))

def cobertura(M, valido_video=None, margen=8, pluma=4):
    """Zona del póster cubierta por el cuadro (con margen hacia adentro y borde suave)."""
    v = valido_video if valido_video is not None else np.full((VH, VW), 255, np.uint8)
    c = cv2.warpAffine(v, M, (W, H), flags=cv2.INTER_NEAREST)
    return cv2.GaussianBlur(cv2.erode(c, k(margen)).astype(np.float32) / 255, (0, 0), pluma)

# ---------------------------------------------------------------- VigIA: la vaca y el campo
def vigia():
    """La IA estiró la foto a lo alto y agrandó un poco la vaca. Se alinea la foto por la vaca y el
    horizonte (escala/posición buscadas por correlación en el cuadro 0) y se estabiliza con el horizonte
    de la derecha (la cámara cabecea unos px). Del video sale la franja de la foto entre el título y los
    íconos; el dispositivo, los textos y los íconos son los del póster."""
    g0 = gris(F[0]).astype(np.float32); gp = gris(P8).astype(np.float32)
    vx0, vy0, vx1, vy1 = 20, 280, 300, 540  # vaca + horizonte en el video
    best = None
    for s in np.arange(1.38, 1.56, 0.0025):
        t = cv2.resize(g0[vy0:vy1, vx0:vx1], None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        r = cv2.matchTemplate(gp[300:1000, 0:700], t, cv2.TM_CCOEFF_NORMED)
        _, mx, _, loc = cv2.minMaxLoc(r)
        if best is None or mx > best[0]: best = (mx, s, loc)
    _, s, loc = best
    M0 = np.float32([[s, 0, loc[0] - vx0 * s], [0, s, loc[1] + 300 - vy0 * s]])
    print(f'vaca: escala {s:.4f}, desplazamiento ({M0[0, 2]:.1f}, {M0[1, 2]:.1f}), correlación {best[0]:.3f}')
    # estabilización: traslación del horizonte (abajo a la derecha, libre de vaca y dispositivo)
    hx0, hy0, hx1, hy1 = 500, 548, 720, 640
    ref = g0[hy0:hy1, hx0:hx1]; d = []
    for f in F:
        w = np.eye(2, 3, dtype=np.float32)
        try:
            _, w = cv2.findTransformECC(ref, gris(f)[hy0:hy1, hx0:hx1].astype(np.float32), w, cv2.MOTION_TRANSLATION,
                                        (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 100, 1e-4), None, 5)
        except cv2.error:
            pass
        d.append([0.0, w[1, 2]])  # sólo vertical: en x lo engañan las vacas lejanas que caminan
    d = suave(np.array(d), 2.0)
    print(f'estabilización: dy {d[:, 1].min():.1f}…{d[:, 1].max():.1f} px de video')
    Ms = [M0 @ np.float32([[1, 0, -dx], [0, 1, -dy], [0, 0, 1]]) for dx, dy in d]

    # dispositivo impreso (silueta a mano: carcasa blanca, panel y boquilla)
    disp = [(882, 376), (925, 357), (985, 363), (1003, 388), (1000, 470), (1050, 530), (1078, 575), (1082, 670),
            (1045, 822), (975, 905), (880, 910), (730, 826), (672, 746), (680, 680), (712, 505), (735, 470), (880, 452)]
    m_disp = poligono(disp, dil=4, pluma=2)
    if DEBUG: cv2.imwrite(f'{DEBUG}/dispositivo.png', (m_disp * 255).astype(np.uint8))
    # letras de "se pierde" (verdes): el cielo entre ellas y sobre la cabeza de la vaca puede ser del video
    b, g_, r_ = [P[..., c] for c in range(3)]
    letras = np.zeros((H, W), np.uint8)
    caja = (g_ > r_ + 25) & (g_ > b + 25); letras[430:560, 70:490] = caja[430:560, 70:490].astype(np.uint8) * 255
    letras = cv2.GaussianBlur(cv2.dilate(letras, k(7)).astype(np.float32) / 255, (0, 0), 3)
    # dispositivo del video (está más arriba y se mece): su silueta en coords de video, para no mostrarlo
    Md = np.float32([[1.582, 0, -35], [0, 1.582, 30]])  # capa del dispositivo en el video → póster
    v_disp = cv2.warpAffine((m_disp > 0.05).astype(np.uint8) * 255, cv2.invertAffineTransform(Md), (VW, VH))
    v_disp = cv2.dilate(v_disp, k(12))

    # franja de la foto que se anima: bajo "se pierde" (más alta a la derecha del texto) hasta los íconos
    zona = poligono([(0, 462), (W, 462), (W, 1045), (0, 1045)], pluma=7)
    zona = np.minimum(zona, poligono([(0, 0), (W, 0), (W, 1060), (0, 1060)], pluma=14))  # abajo, más suave
    for cx in (230, 550, 872):
        zona *= 1 - circulo(cx, 1100, 128, pluma=5)
    zona *= (1 - m_disp) * (1 - letras)
    base = zona > 0.98
    # color: media y desvío sobre la foto del cuadro 0
    V0 = cv2.warpAffine(F[0], Ms[0], (W, H)).astype(np.float32)
    cub0 = cobertura(Ms[0]) > 0.99
    gcol = media_desvio(V0, base & cub0)
    print('color', np.round(gcol, 3).tolist())

    def cuadro(i):
        M = Ms[i]
        # el video no llega a los costados (~35 px): se completa con su borde reflejado, fundido con el póster
        V = aplicar_color(cv2.warpAffine(F[i], M, (W, H), flags=cv2.INTER_LANCZOS4,
                                         borderMode=cv2.BORDER_REFLECT101).astype(np.float32), gcol)
        vd = cv2.warpAffine(v_disp, M, (W, H)).astype(np.float32) / 255
        vd = cv2.GaussianBlur(vd, (0, 0), 4)
        cub = cv2.warpAffine(np.full((VH, VW), 255, np.uint8), M, (W, H), flags=cv2.INTER_NEAREST)
        cub = cv2.GaussianBlur(cv2.dilate(cub, k(14)).astype(np.float32) / 255, (0, 0), 14)
        a = zona * cub * (1 - vd) * peso(i)
        return V, a, P
    return cuadro

# ---------------------------------------------------------------- EnerScope: el buque y el agua
def enerscope():
    """El video es el póster al ancho (×1.48) con la parte baja estirada y una cámara que casi no se
    mueve. Se alinea por cuadro con el encabezado, el logo y el bloque de texto; del video sale el buque
    con el agua (que se mece y refleja); los textos —que la IA corre a mitad del video— son los del póster."""
    ancla = np.zeros((H, W), np.uint8); ancla[20:525] = 255; ancla[525:1010, 40:560] = 255
    Ms = similitud_por_cuadro(ancla, sigma=3.0)
    zona = poligono([(578, 520), (W, 520), (W, 1110), (440, 1110), (440, 860), (578, 860)], pluma=12)
    zona *= 1 - rect(30, 860, 420, 1010, pluma=10)          # bajada "Simulación de inversiones…"
    zona *= 1 - rect(230, 1110, 900, 1185, pluma=8)          # MODELÁ · SIMULÁ · COMPARÁ (por las dudas)
    # color: histograma del video igualado al del póster sobre la zona (bruma, buque y agua), fijo en el tiempo
    muestra = [cv2.warpAffine(F[i], Ms[i], (W, H)).astype(np.float32) for i in range(0, N, 24)]
    lut = lut_histograma(muestra, (zona > 0.5) & (cobertura(Ms[0]) > 0.99))
    def cuadro(i):
        M = Ms[i]
        V = aplicar_lut(cv2.warpAffine(F[i], M, (W, H), flags=cv2.INTER_LANCZOS4).astype(np.float32), lut)
        return V, zona * cobertura(M, margen=8, pluma=8) * peso(i), P
    return cuadro

# ---------------------------------------------------------------- Learn To Lead: la figura y los datos
def learn_to_lead():
    """La cámara arranca acercada (×1.36) y se aleja hasta ×1.25; la figura baja la batuta y traza arcos de
    luz con números y gráficos flotando. Se alinea por cuadro con la lista y el pie (estáticos); del video
    sale sólo lo que difiere del póster (figura y efectos), por encima de la franja oscura. El ala derecha
    de la figura queda fuera del video: cuando la figura se mueve, ahí se muestra el fondo limpio."""
    ancla = np.zeros((H, W), np.uint8); ancla[890:1540] = 255
    Ms = similitud_por_cuadro(ancla, sigma=2.0)
    # franjas negras arriba/abajo que mete la IA en algunos cuadros (en coords de video)
    validos = []
    for f in F:
        filas = gris(f).mean(axis=1) > 28
        v = np.zeros((VH, VW), np.uint8)
        idx = np.where(filas)[0]
        v[idx.min() + 3: idx.max() - 2] = 255
        validos.append(v)
    # color: histograma por cuadro sobre lo estático (lista, franja y pie), suavizado en el tiempo; así se
    # compensa también el velo claro que la IA mete a mitad del video
    estatico = np.zeros((H, W), bool); estatico[890:1540, 60:1080] = True
    luts = []
    for i, f in enumerate(F):
        V = cv2.warpAffine(f, Ms[i], (W, H)).astype(np.float32)
        luts.append(lut_histograma([V], estatico & (cobertura(Ms[i], validos[i]) > 0.99)).ravel())
    luts = suave(np.array(luts), 3.0).reshape(N, 3, 256).astype(np.float32)
    # sólo entre el encabezado y la lista (ahí la IA deforma/corre textos que no se animan)
    permitido = rect(0, 118, W, 900, pluma=8)
    # figura impresa (azul oscuro) y placa limpia sin ella
    hsv = cv2.cvtColor(P8, cv2.COLOR_BGR2HSV)
    oscuro = ((hsv[..., 2] < 140)).astype(np.uint8) * 255
    zona_fig = np.zeros((H, W), np.uint8); zona_fig[100:880, 640:] = 255; zona_fig[100:530, 515:640] = 255
    fig = cv2.dilate(cv2.bitwise_and(oscuro, zona_fig), k(6))
    limpia = cv2.inpaint(P8, fig, 9, cv2.INPAINT_TELEA).astype(np.float32)
    limpia = np.where(fig[..., None] > 0, cv2.GaussianBlur(limpia, (0, 0), 6), limpia)
    fig_f = cv2.GaussianBlur(cv2.dilate(fig, k(10)).astype(np.float32) / 255, (0, 0), 4)
    if DEBUG: cv2.imwrite(f'{DEBUG}/placa-limpia.jpg', limpia.astype(np.uint8))
    Pb = cv2.GaussianBlur(P, (0, 0), 3)

    crudas, Vs, cubs = [], [], []
    for i, f in enumerate(F):
        M = Ms[i]
        V = aplicar_lut(cv2.warpAffine(f, M, (W, H), flags=cv2.INTER_LANCZOS4).astype(np.float32), luts[i])
        cub = cobertura(M, validos[i], margen=8, pluma=5)
        d = np.abs(cv2.GaussianBlur(V, (0, 0), 3) - Pb).sum(axis=2)
        m = ((d > 75) & (cub > 0.5)).astype(np.uint8) * 255
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k(2))
        n, lab, st, _ = cv2.connectedComponentsWithStats(m)
        keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] > 600
        m = keep[lab].astype(np.uint8) * 255
        m = cv2.dilate(cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(9)), k(8))
        crudas.append(m); cubs.append(cub)
    # ¿la figura del video dejó la pose impresa? (fracción del brazo/ala derecha, dentro del video, que cambió)
    ala = (fig > 0); ala[:, :860] = False; ala[:, 1000:] = False; ala[:150] = False; ala[480:] = False
    salio = np.array([[(c[ala] > 0).mean()] for c in crudas])
    salio = np.clip(suave(salio, 3.0).ravel() / 0.4, 0, 1)
    print('máscaras listas; figura fuera de pose en', int((salio > 0.5).sum()), 'cuadros')

    def cuadro(i):
        M = Ms[i]
        V = aplicar_lut(cv2.warpAffine(F[i], M, (W, H), flags=cv2.INTER_LANCZOS4).astype(np.float32), luts[i])
        m = np.maximum.reduce([crudas[j] for j in range(max(0, i - 2), min(N, i + 3))])
        a = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 5) * permitido
        cub = cubs[i]
        a_vid = a * cub
        # más allá del borde derecho del video queda la punta del ala impresa: si la figura dejó la pose,
        # ahí va el fondo limpio
        borde = M[0, 2] + M[0, 0] * VW - 45  # desde un poco antes del borde (donde el video ya se funde)
        franja = np.clip((np.arange(W, dtype=np.float32) - borde) / 15 + 0.5, 0, 1)[None, :]
        lado = salio[i] * fig_f * franja * peso(i)
        base = P * (1 - lado[..., None]) + limpia * lado[..., None]
        return V, a_vid * peso(i), base
    return cuadro

cuadro = {'vigia': vigia, 'enerscope': enerscope, 'learn-to-lead': learn_to_lead}[SLUG]()

proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', SALIDA],
    stdin=subprocess.PIPE)
for i in range(N):
    V, a, base = cuadro(i)
    out = np.clip(base * (1 - a[..., None]) + V * a[..., None], 0, 255).astype(np.uint8)
    proc.stdin.write(out.tobytes())
    if DEBUG and i % 20 == 0:
        dbg = out.copy(); dbg[..., 2] = np.clip(dbg[..., 2] + a * 120, 0, 255).astype(np.uint8)
        cv2.imwrite(f'{DEBUG}/c{i:03d}.jpg', np.hstack([out, dbg]), [cv2.IMWRITE_JPEG_QUALITY, 85])
proc.stdin.close(); proc.wait()
print('listo', SALIDA)
