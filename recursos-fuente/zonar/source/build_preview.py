"""Arma output/preview.html autocontenido (póster, capa JS y MP4 embebidos)."""
import base64, json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
tpl = (R/"source/preview.template.html").read_text()
out = (tpl.replace("__OVERLAY__", (R/"output/zonar-overlay.js").read_text())
          .replace("__POSTER__", (R/"source/poster_b64.txt").read_text())
          .replace("__CONFIG__", json.dumps(json.load(open(R/"output/configuracion.json")), ensure_ascii=False))
          .replace("__VIDEO__", base64.b64encode((R/"output/poster-animado.mp4").read_bytes()).decode()))
(R/"output/preview.html").write_text(out); print(len(out)//1024, "KB")
