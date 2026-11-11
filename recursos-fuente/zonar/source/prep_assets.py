"""Extrae del póster original los recursos que usa la animación.

Genera source/assets.js con sprites en base64 (data URI) para que el
módulo de animación funcione autocontenido, sin pedidos de red ni canvas
"contaminados" (requisito para usarlo como textura en Three.js/A-Frame).
"""
import base64, io, json
import cv2
import numpy as np
from PIL import Image

SRC = "original/poster.jpg"
im = np.array(Image.open(SRC).convert("RGB"))
H, W = im.shape[:2]


def crop_png(cx, cy, size):
    x0, y0 = int(round(cx - size / 2)), int(round(cy - size / 2))
    c = Image.fromarray(im[y0:y0 + size, x0:x0 + size])
    buf = io.BytesIO(); c.save(buf, "PNG", optimize=True)
    return {"x": x0, "y": y0, "w": size, "h": size,
            "src": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()}


# --- Máscara suave de la línea punteada (alfa = intensidad del guion gris)
X0, Y0, X1, Y1 = 40, 440, 690, 1100
reg = im[Y0:Y1, X0:X1].astype(np.int16)
mx, mn = reg.max(2), reg.min(2)
gray = reg.mean(2)
alpha = np.clip((246 - gray) / 43.0, 0, 1)
alpha[(mx - mn) > 10] = 0          # descarta textos e íconos de color
alpha[gray < 170] = 0
yy, xx = np.mgrid[Y0:Y1, X0:X1]
for cx, cy in [(309.5, 474), (527, 676.5), (178, 894), (403.5, 1163)]:
    alpha[np.hypot(xx - cx, yy - cy) < 68] = 0   # anillos antialias de los íconos
# conserva solo componentes pequeñas tipo guion cercanas al recorrido
m = (alpha > 0.15).astype(np.uint8)
alpha_img = np.zeros((Y1 - Y0, X1 - X0, 4), np.uint8)
alpha_img[..., :3] = 255
alpha_img[..., 3] = (alpha * 255).astype(np.uint8)
buf = io.BytesIO(); Image.fromarray(alpha_img, "RGBA").save(buf, "PNG", optimize=True)
dash = {"x": X0, "y": Y0, "w": X1 - X0, "h": Y1 - Y0,
        "src": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()}

assets = {
    "poster": {"w": W, "h": H},
    "compass": crop_png(527, 676.5, 124),
    "pin": crop_png(178, 894, 100),
    "report": crop_png(403.5, 1163, 132),
    "dash": dash,
}
with open("source/assets.js", "w") as f:
    f.write("// Generado por prep_assets.py: recortes del póster original (no editar a mano)\n")
    f.write("window.ZONAR_ASSETS = " + json.dumps(assets) + ";\n")

# póster en base64 para la vista previa autocontenida
buf = io.BytesIO(); Image.open(SRC).save(buf, "JPEG", quality=95)
with open("source/poster_b64.txt", "w") as f:
    f.write("data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode())
print("ok", {k: (v.get("w"), v.get("h")) for k, v in assets.items()})
