# Proyectos que cobran vida

Plataforma WebAR de la **Noche de los Museos — UTN Buenos Aires** (Departamento de Ingeniería en
Sistemas de Información, UTN FRBA).

El visitante escanea **un único QR** (el de la entrada o el de cualquier póster): se abre **la cámara
directamente**, apunta a cualquier póster de la muestra y la plataforma **lo reconoce sola** y
reproduce sobre el papel su versión animada, siguiendo al póster mientras mueve el teléfono. Sin
apps, sin registros, sin elegir nada: sólo el navegador. Funciona en celulares (vertical y apaisado).

Todos los pósters se compilan en un único archivo `.mind` (`escaner/targets.mind`, generado al
construir el sitio fusionando los `target.mind` de cada proyecto, sin recompilar). MindAR detecta
todos a la vez; al reconocer uno, se descarga y reproduce solo la animación de ese proyecto.

La animación de cada póster puede ser:

- **Capa Canvas transparente**: un script dibuja sólo los elementos que se mueven; el resto es el
  póster impreso real visto por la cámara.
- **Video MP4** completo y opaco sobre el póster.
- **Ambos**: la capa como principal y el MP4 como respaldo y para la vista sin RA.

El proyecto **ZonAR** usa sus recursos definitivos: póster original (1131×1600), capa
`ZonarAnim` y MP4 de respaldo. El código fuente de su animación está en `recursos-fuente/zonar/`.

**AgroLink, Arbiter, INFRABOT, VictoriaX, DrHero, PreTriage, Adaliza, CECI y AssistVet** también tienen capa Canvas + MP4 de respaldo. Sus
animaciones están en `recursos-fuente/<slug>/animacion.js` (utilidades comunes en
`recursos-fuente/_comun/efectos.js`) y los pósters originales en `recursos-fuente/<slug>/original/`.
Mueven **recortes reales del póster** (el camión, la foto de la sala, el robot, las ilustraciones;
se declaran en `recursos-fuente/<slug>/sprites.json`) y le suman fondos en movimiento (nubes, papeles,
luces, burbujas) y efectos sobre los elementos del diseño.
Un recorte puede llevar **silueta** (polígono o automática separando el fondo claro) y una **placa
limpia** (`limpiarSprite`: el póster con la figura borrada por inpainting), así una figura se mueve sin
dejar fantasmas del impreso; también se pueden borrar partes (`limpiar`) para animarlas aparte, como los
ojos que guiñan en Adaliza; `ignorar` excluye zonas como fuente del relleno (el pie blanco bajo el perro de
AssistVet). El formato está documentado en `recursos-fuente/construir.mjs`.

**Salir del papel.** Si una animación declara `const MARGEN = 0.3`, su lienzo se extiende un 30 % por
lado alrededor del póster (la RA agranda el plano en la misma proporción): los personajes pueden salir
a "la pared" (el camión de AgroLink avanza hacia vos y pasa por detrás del póster, el paciente de PreTriage camina hasta la
guardia, el robot de INFRABOT vuela, el dictado y el informe de AssistVet se escriben a los costados, el celular de DrHero salta y rota, los documentos de Arbiter se sellan
afuera). Con `"sombras": true` en `sprites.json` se generan el hueco que deja el recorte en el papel y
su sombra proyectada; `despegar()` (en `_comun/efectos.js`) los usa. El MP4 de respaldo queda recortado
al póster; la vista sin RA muestra el lienzo completo.
**AssistVet** usa como animación principal un **video de IA** (el perro sale del póster, se sienta y saca la
lengua): `recursos-fuente/assistvet/componer-video.py` lo alinea solo con el póster y toma del video únicamente
la zona del perro; textos, logos y costados son los del póster real (la IA los deforma y su video es más
angosto). Si generan otra toma, reemplacen `recursos-fuente/assistvet/original/video-ia.mp4` y corran
`python recursos-fuente/assistvet/componer-video.py` (requiere numpy, opencv-python y ffmpeg). Su capa Canvas
queda de respaldo y `construir.mjs video` no pisa ese MP4.

Para regenerar tras ajustar una animación:

```bash
node recursos-fuente/construir.mjs capa  agrolink          # → public/posters/agrolink/capa.js
node recursos-fuente/construir.mjs video agrolink          # → animacion.mp4 (H.264 vía WebCodecs en Chromium)
node recursos-fuente/construir.mjs stills agrolink 2.2 5   # PNG de prueba en salida/stills/
node recursos-fuente/construir.mjs sprites agrolink         # cada recorte en PNG, para revisarlos
```

---

### Más información junto al póster

Si el `proyecto.json` tiene `masInfo` (lista de párrafos, o un texto con párrafos separados por una
línea en blanco), al reconocer el póster aparece una **tarjeta flotante** que lo sigue en pantalla: se
ubica sola en el espacio libre a su costado (o arriba/abajo) unida al póster por una línea. Si el póster
ocupa toda la pantalla se reduce a un chip "Más sobre …" en su esquina; tocándolo (o "Más info") se abre
el texto completo sin salir de la cámara. Sin `masInfo` se usa la `descripcion`. El texto también se
muestra en la página del proyecto.

### Premios

Con `"premio"` en el `proyecto.json` (p. ej. `"2.º puesto · CoNaIISI 2026"`), el proyecto muestra una insignia
dorada en el catálogo, en su página y en la tarjeta flotante de la RA. CECI además lo celebra en su
animación con una escarapela junto al título.

## Rutas del sitio

| Ruta | Pantalla |
|---|---|
| `/` | **Cámara directa**: reconoce cualquier póster y activa su animación |
| `/proyectos` | Catálogo de proyectos (alternativa sin cámara) |
| `/p/<slug>` | Página del proyecto (destino del QR) |
| `/p/<slug>/ra` | Experiencia de realidad aumentada (cámara) |
| `/p/<slug>/video` | Animación sin RA (alternativa) |
| `/recursos` | QR para imprimir, URLs y estado de los recursos de cada proyecto |
| `/recursos/vista-previa/<slug>` | Póster vs. video y superposición, para revisar antes de publicar |
| `/recursos/compilar` | Compilador de targets `.mind` en el navegador |

`/recursos` no tiene autenticación ni aparece en el menú: es una ruta conocida por la organización.

## Requisitos

- **Node.js 22.18 o superior** (los scripts `.ts` se ejecutan con Node directamente).
- npm 10.
- Para desplegar: Docker (opcional) o cualquier servidor de archivos estáticos con HTTPS.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. En la misma computadora la cámara funciona (`localhost` cuenta como
seguro). **Desde un celular en la misma red no**: los navegadores exigen HTTPS para la cámara.
Para probar en el teléfono, desplegá con HTTPS o usá un túnel HTTPS (p. ej. `cloudflared tunnel
--url http://localhost:5173`).

Para probar la RA sin imprimir: abrí el póster (`public/posters/zonar/poster.jpg`) en otra pantalla
y apuntá la cámara a esa pantalla.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (recarga al cambiar archivos de `public/posters`) |
| `npm run build` | Valida proyectos, chequea tipos y genera `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm test` | Pruebas unitarias y de navegación (Vitest) |
| `npm run test:e2e` | E2E en Chromium con cámara simulada + WebKit (requiere `npm run build` antes) |
| `npm run test:e2e:escaner` | Cámara simulada filmando cada póster por separado: verifica que `/` lo reconozca solo y arranque su animación |
| `npm run check` | typecheck + lint + test + build |
| `npm run proyecto:nuevo` | Agrega un proyecto (ver abajo) |
| `npm run proyecto:preparar` | Genera miniaturas y compila los `.mind` que falten o estén desactualizados |
| `npm run proyectos:validar` | Lista proyectos y lo que les falta (`-- --estricto` falla si hay problemas) |
| `npm run qr` | Genera los QR en `salida/qr/` (PNG 2048 px y SVG) |

## Modos de animación

En `proyecto.json`:

```jsonc
"animacion": {
  "modo": "auto",            // auto | video | canvas
  "canvas": { "global": "ZonarAnim", "ancho": 1131, "alto": 1600, "fps": 30, "ladoMaximo": 1024 }
}
```

| Modo | Qué hace |
|---|---|
| `auto` (por defecto) | Usa la capa Canvas si existe y el navegador puede dibujarla; si no, el MP4. |
| `canvas` | Igual que `auto`, pero el validador avisa si falta la capa. |
| `video` | Usa el MP4; la capa queda como respaldo. |

Si la capa no carga, o falla mientras se usa, la RA se reinicia sola con el MP4, siempre que exista.
Un proyecto puede tener sólo MP4 o sólo capa: no hace falta generar ambos. La vista sin RA usa el
MP4 y, si no hay, dibuja la capa sobre la imagen del póster.

**Alternar el modo sin tocar archivos (para pruebas):** agregá `?modo=canvas` o `?modo=video` a la
URL, por ejemplo `https://dominio/p/zonar?modo=video` o `https://dominio/p/zonar/ra?modo=canvas`.
Con `?modo=` la pantalla de RA muestra una etiqueta con el formato en uso, y "(respaldo)" si hubo
que cambiar. En `/recursos` cada proyecto tiene enlaces para probar cada modo.
**Cambiar el modo definitivo:** editá `"modo"` en `proyecto.json` y volvé a desplegar.

### Contrato de una capa Canvas

El script (`archivos.capa`, por defecto `capa.js`) es un JavaScript clásico que define un objeto
global (`animacion.canvas.global`) con:

```js
window.MiCapa = {
  WIDTH: 1131, HEIGHT: 1600,   // tamaño del lienzo = coordenadas del póster
  DURATION: 10,                // duración del ciclo en segundos
  load() { return Promise.resolve(); },   // opcional: preparar imágenes, etc.
  render(ctx, segundos) { /* dibujar SOLO lo animado; el fondo queda transparente */ },
};
```

La plataforma se encarga del reloj (inicia al detectar el póster, pausa al perderlo, "Repetir"
vuelve a 0), de borrar el lienzo en cada cuadro, de limitar los FPS (`fps`) y de reducir la
textura (`ladoMaximo`) para celulares. `WIDTH/HEIGHT` deben tener la proporción del póster;
`ancho`/`alto` en `proyecto.json` permiten que el validador lo verifique al compilar.
El script se ejecuta en el sitio con permisos completos: sólo incorporen código de confianza
(el de ZonAR se revisó: sólo dibuja y no hace pedidos de red).

## Agregar un póster nuevo

Necesitás: **nombre**, **imagen original** del póster (JPG o PNG, la misma que se imprime), la
animación (**video MP4** y/o **capa Canvas**) y, opcionalmente, una descripción.

### Opción A — un comando

```bash
npm run proyecto:nuevo -- --nombre "Nombre del Proyecto" \
  --poster ruta/al/poster.png --video ruta/a/animacion.mp4 \
  --subtitulo "Lema" --descripcion "Una oración sobre el proyecto." --equipo "Ana, Juan" --orden 2
```

Con capa Canvas (con o sin `--video`):

```bash
npm run proyecto:nuevo -- --nombre "Nombre" --poster poster.jpg --video animado.mp4 \
  --capa overlay.js --capa-global NombreGlobal --capa-ancho 1131 --capa-alto 1600 --modo auto
```

Esto:

1. crea `public/posters/nombre-del-proyecto/` (el slug sale del nombre; o pasá `--slug`),
2. copia el póster, el video y/o la capa,
3. escribe `proyecto.json`,
4. genera `miniatura.jpg` y compila `target.mind` (30–90 s).

Después:

```bash
npm run proyectos:validar          # revisar que no falte nada ni haya advertencias
npm run dev                        # probar /p/<slug> y /recursos/vista-previa/<slug>
```

Al desplegar el nuevo build, el proyecto aparece en el catálogo, en `/recursos` y en `/p/<slug>`.

Se puede crear un proyecto sin póster o sin video: queda publicado como "Próximamente" hasta que
se agreguen los archivos y se ejecute `npm run proyecto:preparar -- <slug>`.

### Opción B — a mano

1. Crear `public/posters/<slug>/` (minúsculas, números y guiones).
2. Copiar `docs/plantilla-proyecto.json` como `proyecto.json` y completarlo (sólo `nombre` es
   obligatorio).
3. Poner `poster.jpg` (o `.png` indicándolo en `archivos.poster`) y `animacion.mp4`.
4. `npm run proyecto:preparar -- <slug>` para generar `miniatura.jpg` y `target.mind`.
   Sin Node, el `.mind` también se puede generar en `/recursos/compilar` y guardarlo en la carpeta.

### Reemplazar los recursos de un proyecto

1. Copiar los nuevos archivos con los mismos nombres: `poster.jpg`, `animacion.mp4`, `capa.js`.
2. Si cambió el póster: `npm run proyecto:preparar -- <slug> --forzar` (recompila target y miniatura).
3. Revisar `/recursos/vista-previa/<slug>` y desplegar.

Para ZonAR, si se ajusta la animación en su proyecto de origen (`recursos-fuente/zonar/`), copiar
el nuevo `output/zonar-overlay.js` como `public/posters/zonar/capa.js` y
`output/poster-animado.mp4` como `animacion.mp4`.

No hace falta tocar código. Las URLs llevan `?v=<hash>`, así que los navegadores no muestran la
versión vieja.

### `proyecto.json`

```jsonc
{
  "nombre": "ZonAR",                      // obligatorio
  "subtitulo": "Hacé visible el ruido",
  "descripcion": "…",
  "premio": "2.º puesto · CoNaIISI 2026",  // opcional: insignia de distinción
  "equipo": ["…"],
  "orden": 1,                             // orden en el catálogo
  "activo": true,                         // false: no se publica (sí aparece en /recursos)
  "demo": false,                          // marca recursos temporales
  "archivos": { "poster": "poster.jpg", "video": "animacion.mp4", "target": "target.mind", "miniatura": "miniatura.jpg" },
  "reproduccion": {
    "bucle": true,
    "ajuste": "auto",                     // auto | estirar | contener | cubrir
    "alPerderSeguimiento": "pausar",      // pausar | continuar
    "reiniciarAlDetectar": false,
    "escala": 1,                          // ajuste fino del tamaño del video
    "desplazamiento": { "x": 0, "y": 0 }  // en fracciones del ancho del póster
  }
}
```

**Ajuste del video:** si el MP4 tiene la misma proporción que el póster (±2 %) cubre el póster
exacto. Si no, con `"auto"` se muestra **sin deformar** ("contener") y se emite una advertencia
de configuración; elegí explícitamente `estirar`, `contener` o `cubrir` para silenciarla.

### Recomendaciones para los videos de IA

- MP4 H.264, sin audio (o se ignora), 720–1080 px de ancho, **menos de 25 MB**.
- Misma proporción que el póster original.
- Que el primer y el último cuadro se parezcan al póster impreso: la transición se nota menos.
- La IA puede alterar textos, logos y proporciones: revisá siempre la vista previa antes de publicar.

### Buenas imágenes objetivo

MindAR reconoce mejor pósters con mucho detalle y contraste (textos, ilustraciones, bordes). Zonas
lisas grandes, degradés suaves o patrones repetidos lo dificultan. El póster impreso tiene que ser
la **misma imagen** con la que se compiló el target.

## QR

- **Desde el sitio:** `/recursos` muestra el QR de cada proyecto con su URL, botones para descargar
  **PNG** (2048 px) o **SVG**, y "Imprimir hoja de QR" (A4, dos por fila).
- **Desde la terminal:** `npm run qr` (todos) o `npm run qr -- zonar --url https://dominio`.
  Archivos en `salida/qr/qr-<slug>.png|svg`.

El QR contiene `VITE_SITIO_URL/p/<slug>`. Si `VITE_SITIO_URL` no está configurada, `/recursos` usa
la dirección desde donde se la abre (y avisa); el campo se puede editar. **Configurá el dominio
definitivo antes de imprimir.** Los QR son negro sobre blanco con corrección de errores M; impresos
a 3 cm o más se leen sin problema desde 30–50 cm.

## Configuración

`.env` (copiar de `.env.example`):

```
VITE_SITIO_URL=https://dominio-definitivo
```

Se incrusta en el build: si cambia el dominio, hay que volver a compilar (o editar la URL en
`/recursos` al generar los QR).

## Despliegue

El resultado de `npm run build` (`dist/`) es un sitio **estático**. Requisitos del servidor:

1. **HTTPS** (obligatorio para la cámara).
2. **Fallback de SPA:** cualquier ruta que no sea un archivo debe devolver `index.html`.
3. **Soporte de `Range`** en los MP4 (Safari no reproduce video sin él).
4. Recomendado: caché larga para `/assets/*`, `no-cache` para `index.html`.

### Con Docker + Caddy (incluido)

```bash
# Dominio propio con HTTPS automático (Let's Encrypt): el DNS debe apuntar al servidor y 80/443 abiertos.
VITE_SITIO_URL=https://museos.ejemplo.edu.ar SITIO_DOMINIO=museos.ejemplo.edu.ar docker compose up -d --build

# Detrás de otro proxy que ya hace HTTPS: Caddy escucha HTTP en :80.
VITE_SITIO_URL=https://museos.ejemplo.edu.ar SITIO_DOMINIO=:80 docker compose up -d --build
```

Cada vez que se agrega o cambia un póster: `docker compose up -d --build`.

### Sin Docker

Copiar `dist/` a cualquier servidor estático (Nginx, Apache, Caddy, Netlify, etc.) con las cuatro
condiciones de arriba. Ejemplo Nginx:

```nginx
location / { try_files $uri /index.html; }
location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
```

## Arquitectura

```
src/
  main.tsx, rutas.tsx         arranque y rutas (las pesadas con carga diferida)
  config.ts                   URL pública y textos
  proyectos/                  modelo y validación (puro, compartido con los scripts), catálogo, URLs
  ra/
    sesion.ts                 cámara + MindAR Controller + Three.js; liberación de recursos
    reproductor.ts            <video> de la animación y políticas de autoplay
    estado.ts                 máquina de estados de la pantalla de RA
    errores.ts, compatibilidad.ts, descarga.ts
  paginas/                    Inicio, Proyecto, ExperienciaRA, VistaAlternativa, Recursos, VistaPrevia, CompilarTarget
  componentes/, estilos/      UI y sistema visual
  qr/                         generación de QR
scripts/
  lib/escaner.ts              lee public/posters → catálogo (estado, medidas, advertencias)
  lib/vite-plugin-proyectos.ts  módulo virtual `virtual:proyectos`
  lib/mindar.ts               compilación de .mind (OfflineCompiler de MindAR) y miniaturas
  proyecto-*.ts, proyectos-validar.ts, generar-qr.ts
  pruebas/                    E2E con cámara simulada
public/posters/<slug>/        un directorio por proyecto
docs/                         decisiones técnicas, pruebas en dispositivos, plantilla
```

Más detalle en [docs/DECISIONES-TECNICAS.md](docs/DECISIONES-TECNICAS.md).

## Pruebas

- `npm test`: modelo y validación de manifiestos, cálculo de ajuste del video, URLs, QR
  (se generan y **se decodifican** PNG y SVG), escáner de proyectos (completos, incompletos,
  inválidos, inactivos, sin carpeta), lectura de MP4/.mind, máquina de estados, reproductor
  (autoplay bloqueado, liberación), sesión de cámara (permisos, cierre durante la carga, sesión
  única) y navegación de todas las rutas.
- `npm run test:e2e`: build de producción en Chromium con una cámara simulada que filma el póster
  (pared, ruido, rotación, tramos sin póster). Verifica detección, reproducción, pausa al perder,
  recuperación, alineación numérica del plano, permisos denegados, cierre de cámara y que el
  catálogo no descargue recursos pesados. Además carga las páginas en WebKit.

**La RA no está validada en teléfonos reales todavía.** Ver
[docs/PRUEBAS-EN-DISPOSITIVOS.md](docs/PRUEBAS-EN-DISPOSITIVOS.md).

## Limitaciones conocidas

- MindAR 1.2.5 es la última versión publicada; el proyecto no tiene mantenimiento activo frecuente.
- El seguimiento depende de luz, reflejos, distancia y del contenido del póster.
- Girar el teléfono durante la sesión es un caso poco pulido en MindAR (portado tal cual).
- Navegadores integrados de apps (Instagram, Facebook, a veces WhatsApp) pueden bloquear la cámara:
  se indica abrir en Safari/Chrome.
- iOS en modo de ahorro de energía bloquea el autoplay: se ofrece un botón.
- El primer uso descarga ~420 KB gzip de motor + el `.mind` (~0,8 MB) + el video.
- Los videos de IA pueden alterar textos del póster: revisión manual en la vista previa.
- `VITE_SITIO_URL` se fija al compilar.
