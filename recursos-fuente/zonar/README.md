# ZonAR · póster animado para WebAR

original/poster.jpg            Póster recibido (sin modificar)
output/poster-animado.mp4      Video completo: H.264 High, 1132×1600, 30 fps, 10 s, sin audio, loop
output/zonar-overlay.js        Capa transparente (Canvas 2D): solo los elementos animados
output/capa-ar.html            Demo de la capa sola + ejemplo de integración MindAR/Three.js/A-Frame
output/configuracion.json      Dimensiones, recursos, tiempos y zonas (coordenadas normalizadas 0–1)
output/preview.html            Vista previa autocontenida (MP4, capa en vivo, original, comparar, diferencia, grilla)
source/zonar-anim.js           Código de la animación (fuente única del video y de la capa)
source/prep_assets.py          Extrae recortes y máscara del póster → source/assets.js
source/render_frames.py        Renderiza en Chromium headless y codifica con FFmpeg
source/build_preview.py        Arma preview.html

Regenerar tras ajustar la animación:
  python3 source/prep_assets.py
  cat source/assets.js source/zonar-anim.js > output/zonar-overlay.js
  python3 source/render_frames.py video
  python3 source/build_preview.py
(Requiere Python con Pillow, OpenCV, Playwright+Chromium y FFmpeg.)
