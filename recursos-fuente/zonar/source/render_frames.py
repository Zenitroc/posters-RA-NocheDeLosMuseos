"""Renderiza la animación en Chromium headless (mismo código JS que la capa AR)
y la codifica a H.264 con FFmpeg."""
import base64, subprocess, sys, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS, DUR = 30, 10
mode = sys.argv[1] if len(sys.argv) > 1 else "video"
poster = (ROOT / "source/poster_b64.txt").read_text()
html = f"""<!doctype html><html><body style="margin:0">
<canvas id="c" width="1131" height="1600"></canvas>
<script>{(ROOT/'source/assets.js').read_text()}</script>
<script>{(ROOT/'source/zonar-anim.js').read_text()}</script>
<script>
const P=new Image(); P.src="{poster}";
window.ready=Promise.all([ZonarAnim.load(), P.decode()]);
window.frame=(t,overlayOnly)=>{{const c=document.getElementById('c'),x=c.getContext('2d');
 x.clearRect(0,0,c.width,c.height); if(!overlayOnly) x.drawImage(P,0,0); ZonarAnim.render(x,t);
 return c.toDataURL('image/png');}};
</script></body></html>"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1131, "height": 1600})
    pg.set_content(html); pg.evaluate("window.ready")
    grab = lambda t, o=False: base64.b64decode(pg.evaluate(f"frame({t},{str(o).lower()})").split(",")[1])
    if mode == "stills":
        out = ROOT / "source/stills"; out.mkdir(exist_ok=True)
        for t in [float(a) for a in sys.argv[2:]]:
            (out / f"t{t:05.2f}.png").write_bytes(grab(t))
            (out / f"o{t:05.2f}.png").write_bytes(grab(t, True))
    else:
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-",
            "-vf", "scale=1132:1600:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-level", "4.1",
            "-preset", "slow", "-crf", "20", "-tune", "animation", "-movflags", "+faststart", "-an",
            str(ROOT / "output/poster-animado.mp4")], stdin=subprocess.PIPE)
        for i in range(FPS * DUR):
            ff.stdin.write(grab(i / FPS))
        ff.stdin.close(); ff.wait()
    b.close()
print("done")
