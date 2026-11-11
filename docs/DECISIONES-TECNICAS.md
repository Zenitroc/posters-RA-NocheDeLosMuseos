# Decisiones técnicas

## Resumen

| Necesidad | Elección | Motivo |
|---|---|---|
| Seguimiento de imagen | **MindAR 1.2.5** (`Controller` del build `mindar-image.prod.js`) | Libre (MIT), sin servicios externos, reconoce y sigue imágenes planas en el navegador (TensorFlow.js + Web Worker). |
| Render 3D | **Three.js 0.186** con un adaptador propio (`src/ra/sesion.ts`) | Plano con `VideoTexture` alineado al póster. |
| Frontend | **React 19 + React Router 7 + Vite 8 + TypeScript 6** | Rutas por proyecto (`/p/:slug`), carga diferida por ruta, build estático. |
| QR | **qrcode** | Genera SVG y PNG tanto en el navegador como en Node. |
| Servidor | **Caddy** (Docker) | HTTPS automático, soporte de `Range` (Safari lo exige para video), compresión. |

TypeScript quedó en 6.0 porque `typescript-eslint` todavía no admite TS 7.

## Por qué no `MindARThree` directamente

El build `mindar-image-three.prod.js` de MindAR 1.2.5:

1. Importa `sRGBEncoding` de `three`, que se eliminó en r162: con Three.js actual el bundle falla.
2. En `_startVideo()` rechaza la promesa **sin** el error de `getUserMedia`, así que no se puede distinguir
   "permiso denegado" de "cámara ocupada" para mostrar el mensaje correcto.
3. `stop()` no quita el listener de `resize`, no termina el Worker ni libera el contexto WebGL.

Por eso `src/ra/sesion.ts` usa el `Controller` (que no depende de Three.js) y porta la matemática de
cámara/proyección de `MindARThree` (`src/image-target/three.js`). La E2E con cámara simulada verifica
que la alineación coincide (error ≈ 0,4 % del ancho del póster).

## Compilación de targets `.mind`

MindAR **no publica una CLI**. Formas soportadas:

- **Herramienta web oficial** de MindAR / su clase `Compiler` (navegador). El sitio la incluye en
  `/recursos/compilar` (sin depender de páginas externas).
- **`OfflineCompiler`** (`mind-ar/src/image-target/offline-compiler.js`), incluida en el paquete npm,
  mismo algoritmo con `node-canvas`. La envuelve `scripts/lib/mindar.ts` y la usan
  `npm run proyecto:nuevo` y `npm run proyecto:preparar`.

Detalles:

- `mind-ar` declara `canvas@^2`, que no tiene binarios para Node 22 en Windows. `package.json` usa
  `overrides` para `canvas@^3` (misma API, binarios precompilados N-API).
- Se reduce el póster a ≤1600 px en el lado mayor antes de compilar: MindAR procesa la imagen
  completa y un archivo de imprenta de 7000 px sólo agregaría minutos y peso. Para el seguimiento
  importa la proporción, no la resolución.
- Junto a `target.mind` se escribe `target.meta.json` con el SHA-1 del póster: el validador avisa si
  el póster cambió y hay que recompilar.

## Video sobre el póster

- El plano mide exactamente lo que el póster (1 unidad = ancho del póster, centrado en el ancla).
- Si el video tiene otra proporción, con `"ajuste": "auto"` **no se deforma**: se usa "contener" y
  se muestra una advertencia en `/recursos`, en `npm run proyectos:validar` y en la vista previa. Se
  puede elegir explícitamente `estirar`, `contener` o `cubrir` (recorte centrado), más `escala` y
  `desplazamiento` para ajuste fino.
- Videos opacos MP4 (H.264). No se asume transparencia.
- Siempre `muted` + `playsinline` (requisito de autoplay en iOS y Android). Si igual se bloquea
  (p. ej. iOS en ahorro de energía) aparece "Reproducir animación".
- En iOS el `<video>` fuente se mantiene en el DOM (oculto) para que se decodifiquen cuadros.

## Rendimiento

- El catálogo carga ~106 KB gzip de JS. Three.js + MindAR (~420 KB gzip) sólo se descargan al
  abrir la cámara. Ningún video ni `.mind` se descarga en el catálogo (verificado en la E2E).
- Al abrir la cámara se descargan en paralelo motor, target y video mientras el visitante responde
  el permiso.
- `devicePixelRatio` limitado a 2 para el render.
- Recursos con `?v=<hash>`: se pueden cachear sin riesgo de servir una versión vieja.

## Estructura de un proyecto

```
public/posters/<slug>/
  proyecto.json      datos y configuración (ver docs/plantilla-proyecto.json)
  poster.jpg|png     imagen original del póster (la misma que se imprime)
  animacion.mp4      video generado con IA
  target.mind        reconocimiento de MindAR (generado)
  target.meta.json   control de versión del target (generado)
  miniatura.jpg      para el catálogo (generada)
```

El plugin `scripts/lib/vite-plugin-proyectos.ts` recorre esas carpetas en cada build (y en caliente
en desarrollo) y genera el catálogo con el estado de cada recurso. Un proyecto incompleto se publica
marcado como tal; una carpeta inválida se reporta y se omite, sin romper el build.

## Capas Canvas transparentes (agregado para ZonAR)

- **Misma sesión de seguimiento.** `src/ra/sesion.ts` mantiene el `Controller` de MindAR, el ancla,
  la post-matriz y la matemática de cámara. Sólo cambió de dónde sale la textura: la sesión recibe
  una `Animacion` (`src/ra/animacion.ts`), implementada por `ReproductorAnimacion` (MP4) y
  `AnimacionCanvas` (`src/ra/capa-canvas.ts`). No se agregaron dependencias.
- **Textura.** `CanvasTexture` de un lienzo propio de la plataforma, reducido a `ladoMaximo`
  (1024 px por defecto: 724×1024 para ZonAR) para subir menos píxeles por cuadro. Sólo se redibuja
  si la animación corre, el póster está a la vista y pasó el intervalo de `fps`.
- **Transparencia sin halos ni fondo opaco.** La textura se sube con alfa premultiplicado y se
  dibuja con un `ShaderMaterial` mínimo, que copia los valores sin conversión de color y mezcla con
  (ONE, 1 − alfa). Con alfa sin premultiplicar, el filtrado bilineal oscurece los bordes
  semitransparentes. El fundido de aparición multiplica color y alfa a la vez, así que no hay
  destello.
- **Reloj propio.** Arranca al detectar el póster, se pausa al perderlo (según
  `alPerderSeguimiento`), "Repetir" vuelve a 0 y respeta `bucle`. La capa de ZonAR es periódica:
  t = 0 equivale al póster intacto.
- **Respaldo.** Primero se intenta el formato preferido; si `load()`, la API o el primer cuadro
  fallan, se libera y se usa el MP4. Si `render()` falla en uso, la experiencia se reinicia con el
  MP4. El script se inserta una sola vez por página.
- **El MP4 no se descarga** cuando la capa funciona (verificado en la E2E).

### Observación sobre la capa de ZonAR

Para que las barras del título y el interior de algunos íconos puedan achicarse o rotar, la capa
pinta zonas con el color de fondo del póster digital (p. ej. franjas `#f6f6f6` detrás de cada
barra). En una pantalla coinciden exactamente; sobre la cámara, el papel impreso tendrá otro tono
según la luz y la impresión, y esas zonas podrían verse como rectángulos más claros u oscuros.
Hay que evaluarlo en la prueba física. Si molesta, se puede usar `"modo": "video"` sin tocar
código, o ajustar la animación en su proyecto de origen.
