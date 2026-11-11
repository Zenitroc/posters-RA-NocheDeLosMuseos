# Pruebas pendientes con teléfonos reales

Lo verificado hasta ahora es automático: pruebas unitarias, de navegación y una E2E en Chromium de
escritorio con **cámara simulada**, más carga de páginas en WebKit de escritorio. **Nada de esto
reemplaza la prueba física.** El seguimiento de imágenes no se considera validado hasta completar
esta lista.

## Preparación

- [ ] Desplegar con HTTPS real (la cámara no funciona por HTTP salvo en `localhost`).
- [ ] Imprimir el póster en el tamaño real de la muestra (y uno en A4 para pruebas rápidas).
- [ ] Imprimir el QR desde `/recursos` y pegarlo junto al póster.
- [ ] Teléfonos: al menos un iPhone (iOS 16 o superior, Safari) y un Android de gama media (Chrome).
      Si se puede, un iPhone viejo (iOS 15) y un Android de gama baja.

## Lista por dispositivo

Anotar modelo, versión del sistema y navegador.

### Acceso
- [ ] La cámara nativa reconoce el QR y abre `/p/<slug>` en Safari/Chrome (no en una app).
- [ ] La página carga rápido con datos móviles (no sólo wifi).
- [ ] Se ve bien en vertical y horizontal; nada queda tapado por la muesca ni la barra inferior.

### Permisos
- [ ] "Activar cámara" pide permiso una vez; al aceptar se ve la cámara trasera.
- [ ] Denegar el permiso muestra instrucciones correctas para ese navegador y "Ver animación sin RA".
- [ ] Tras habilitar el permiso en ajustes, "Reintentar" funciona.
- [ ] Abrir el enlace desde WhatsApp/Instagram (navegador integrado): el mensaje es claro.

### Reconocimiento y seguimiento
- [ ] Tiempo hasta reconocer el póster (anotar segundos) a 1 m, 2 m y 3 m.
- [ ] Reconoce con la luz real de la sala, de noche, y con reflejos sobre el papel.
- [ ] El video queda alineado con los bordes del póster (sin desfase visible).
- [ ] Al mover el teléfono (acercar, alejar, inclinar ~30–45°) la animación sigue pegada al papel.
- [ ] Temblor o "jitter" aceptable con el teléfono quieto.
- [ ] Al salir del encuadre aparece "Perdimos el póster" y el video se pausa.
- [ ] Al volver a apuntar se recupera y el video continúa.
- [ ] No confunde pósters entre sí (abrir ZonAR y apuntar a otro póster no debe activar nada).
- [ ] Probar con el póster en una pared y en un atril, y a distintas alturas.

### Reproducción
- [ ] La animación arranca sola al reconocer el póster (silenciada).
- [ ] iOS en **modo de ahorro de energía**: aparece "Reproducir animación" y funciona al tocarlo.
- [ ] "Repetir" vuelve al inicio; "Pausar/Reanudar" funcionan.
- [ ] El bucle no tiene saltos visibles.
- [ ] Los textos del video IA son legibles y fieles al póster (revisar antes en `/recursos/vista-previa/<slug>`).

### Recursos y ciclo de vida
- [ ] "Cerrar" apaga la cámara (el indicador verde/naranja del sistema desaparece).
- [ ] Cambiar de app y volver: muestra "La cámara se interrumpió" con "Reintentar", o sigue funcionando.
- [ ] Bloquear y desbloquear el teléfono durante la RA.
- [ ] Girar el teléfono durante la RA (rotación es un caso límite de MindAR: anotar el comportamiento).
- [ ] Usar la RA 5 minutos seguidos: temperatura, batería y fluidez.
- [ ] Abrir y cerrar la RA varias veces seguidas sin recargar: no se pone lenta.
- [ ] La pantalla no se apaga mientras se apunta (wake lock; puede no estar disponible en todos).

### Capa Canvas (ZonAR) — comparar con `?modo=video`
- [ ] Abrir `/p/zonar/ra?modo=canvas` y `/p/zonar/ra?modo=video`: la etiqueta superior indica el formato.
- [ ] La capa queda alineada con los íconos, las barras del título y la pantalla del teléfono impresos.
- [ ] **Franjas de fondo**: las barras del título y el interior de la brújula, el pin y los reportes
      se repintan con el color del póster digital. Ver si se notan rectángulos de otro tono sobre el
      papel impreso, con la luz real de la sala.
- [ ] Sin parpadeos al detectar, perder y recuperar el póster; sin halos oscuros en los bordes.
- [ ] Fluidez (sin saltos) y temperatura tras 5 minutos, comparado con el modo video.
- [ ] Repetir, pausar y reanudar funcionan igual que con el video.

### Vista sin RA
- [ ] El video se reproduce inline (no a pantalla completa forzada en iPhone).
- [ ] Queda claro que no es realidad aumentada.

## Registro sugerido

| Dispositivo | SO / navegador | Tiempo de detección | Alineación | Seguimiento | Video | Cierre de cámara | Notas |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
