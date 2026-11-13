"""
AssistVet · video de IA → animacion.mp4 del póster.

El video generado (Gemini/Veo, 720×1280) muestra el póster recortado a lo angosto y con algunos textos
deformados. Este script lo alinea solo con el póster (puntos ORB + RANSAC sobre la mitad superior),
y en cada cuadro toma del video únicamente la zona del perro (diferencia contra el póster impreso +
silueta del perro original), con bordes suaves; todo lo demás es el póster real, nítido y completo.
Los primeros y últimos cuadros se funden con el póster para que el loop sea invisible.

  python recursos-fuente/assistvet/componer-video.py                       (rutas por defecto)
  python recursos-fuente/assistvet/componer-video.py <video> <poster> <salida.mp4> [carpeta-debug]

Requiere: Python 3 con numpy y opencv-python, y ffmpeg en el PATH.
"""
import os, sys, subprocess, cv2, numpy as np
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..', '..'))
args = sys.argv[1:] + [None] * 4
video = args[0] or os.path.join(AQUI, 'original', 'video-ia.mp4')
poster = args[1] or os.path.join(AQUI, 'original', 'AssistVet.png')
salida = args[2] or os.path.join(RAIZ, 'public', 'posters', 'assistvet', 'animacion.mp4')
debug = args[3]
W, H = 1132, 1600
P = cv2.resize(cv2.imread(poster), (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
cap = cv2.VideoCapture(video); FPS = round(cap.get(cv2.CAP_PROP_FPS)) or 24; F = []
while True:
    ok, f = cap.read()
    if not ok: break
    F.append(f)
N = len(F)

def alinear():
    """Similitud video → póster: mediana de las estimaciones en varios cuadros (zona superior, estática)."""
    orb, bf = cv2.ORB_create(6000), cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    gp = cv2.cvtColor(P.astype(np.uint8), cv2.COLOR_BGR2GRAY)
    mp = np.zeros_like(gp); mp[:int(H * 0.52)] = 255
    kp_p, de_p = orb.detectAndCompute(gp, mp)
    est = []
    for i in np.linspace(0, N - 1, 8).astype(int):
        g = cv2.cvtColor(F[i], cv2.COLOR_BGR2GRAY)
        m = np.zeros_like(g); m[:int(g.shape[0] * 0.5)] = 255
        kp, de = orb.detectAndCompute(g, m)
        ms = bf.match(de, de_p)
        src = np.float32([kp[x.queryIdx].pt for x in ms]); dst = np.float32([kp_p[x.trainIdx].pt for x in ms])
        M, _ = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2.0, maxIters=5000)
        est.append(M)
    M = np.median(np.stack(est), axis=0).astype(np.float32)
    print(f'alineación: escala {np.hypot(M[0, 0], M[1, 0]):.4f}, desplazamiento ({M[0, 2]:.1f}, {M[1, 2]:.1f}) px')
    return M
A = alinear()
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
# zona cubierta por el video (con margen hacia adentro)
valido = cv2.warpAffine(np.full(F[0].shape[:2], 255, np.uint8), A, (W, H), flags=cv2.INTER_NEAREST)
valido = cv2.erode(valido, k(10))
valido = cv2.GaussianBlur(valido.astype(np.float32) / 255, (0, 0), 5)
# silueta del perro impreso (siempre se toma del video, para que no haya costuras sobre el perro)
PIE = 1407
base = np.zeros((H, W), np.uint8)
reg = P[960:PIE].max(axis=2) > 48
base[960:PIE] = reg * 255
base = cv2.morphologyEx(base, cv2.MORPH_CLOSE, k(9)); base = cv2.dilate(base, k(14))
# corrección de color: ajuste lineal por canal en el fondo estático del primer cuadro
V0 = cv2.warpAffine(F[0], A, (W, H)).astype(np.float32)
fondo = (valido > 0.99) & (base == 0)
fondo[PIE - 10:] = False
gan = []
for c in range(3):
    x, y = V0[..., c][fondo], P[..., c][fondo]
    a, b = np.polyfit(x, y, 1); gan.append((a, b))
print('color', [(round(a, 3), round(b, 1)) for a, b in gan])
def corregir(V):
    return np.stack([V[..., c] * gan[c][0] + gan[c][1] for c in range(3)], -1)
Pb = cv2.GaussianBlur(P, (0, 0), 3)
crudas = []
for f in F:
    V = corregir(cv2.warpAffine(f, A, (W, H)).astype(np.float32))
    d = np.abs(cv2.GaussianBlur(V, (0, 0), 3) - Pb).sum(axis=2)
    m = (d > 70).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k(3))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] > 2500
    m = keep[lab].astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(15))
    # rellenar huecos interiores (el pelaje parecido al fondo)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    lleno = np.zeros_like(m); cv2.drawContours(lleno, cs, -1, 255, -1)
    crudas.append(cv2.dilate(lleno, k(10)))
def peso(i):  # entrada y salida fundidas con el póster impreso
    t = i / FPS; dur = N / FPS
    s = lambda e0, e1, x: (lambda q: q * q * (3 - 2 * q))(min(1, max(0, (x - e0) / (e1 - e0))))
    return s(0.0, 0.35, t) * (1 - s(dur - 0.6, dur - 0.04, t))
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', salida], stdin=subprocess.PIPE)
for i, f in enumerate(F):
    m = np.maximum.reduce([crudas[j] for j in range(max(0, i - 2), min(N, i + 3))])
    m = np.maximum(m, base)
    a = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 6) * valido * peso(i)
    V = corregir(cv2.warpAffine(f, A, (W, H), flags=cv2.INTER_LANCZOS4).astype(np.float32))
    out = np.clip(P * (1 - a[..., None]) + V * a[..., None], 0, 255).astype(np.uint8)
    proc.stdin.write(out.tobytes())
    if debug and i % 30 == 0:
        dbg = out.copy(); dbg[..., 2] = np.clip(dbg[..., 2] + a * 120, 0, 255).astype(np.uint8)
        cv2.imwrite(f'{debug}/c{i:03d}.png', np.hstack([out, dbg]))
proc.stdin.close(); proc.wait()
print('listo', salida)
