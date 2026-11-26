# Myckeo V2 — comprobación física pendiente

Estado: **NO EJECUTADA en dispositivos físicos**. Este entorno no ofrece dispositivos conectados, ADB, Xcode/xcrun ni idevice_id. Las pruebas Chromium y sus viewports no sustituyen Safari iOS o Chrome Android reales. [Registro](mobile-premium-v2-release-evidence/device-access.json).

Preparación: usar la candidata local con inventario aislado o una preview autorizada posteriormente. Esta tarea no crea una preview ni despliega. Para el harness local:

```bash
cd /home/nico/worktrees/myckeo-mobile-premium-v2-20261126
node e2e/mobile-premium-v2/prepare.cjs
node e2e/mobile-premium-v2/dev-server.cjs
```

Esperar compilación abriendo `http://127.0.0.1:3400/?scenario=balanced` en el ordenador. No copiar secretos ni iniciar sesión con cuentas reales en este servidor de fixtures.

Android con USB y ADB ya configurado: `adb reverse tcp:3400 tcp:3400`; abrir `http://127.0.0.1:3400/?scenario=balanced` en Chrome del teléfono. Para Safari iOS o Android en la misma red privada, se puede reenviar un puerto local al servidor de revisión, sin cambiar configuración de aplicación:

```bash
node -e 'const net=require("node:net");net.createServer(s=>{const t=net.connect(3400,"127.0.0.1");s.pipe(t).pipe(s);s.on("error",()=>t.destroy());t.on("error",()=>s.destroy());s.on("close",()=>t.destroy())}).listen(3401,"0.0.0.0")'
```

Abrir `http://IP_LAN_DEL_ORDENADOR:3401/?scenario=balanced` desde la misma red, con el firewall local permitiendo ese puerto. Este enlace usa HTTP local y no certifica prestaciones que requieran HTTPS. Detener el reenvío con Ctrl+C al acabar; no exponerlo a Internet. Estos comandos son instrucciones pendientes para el operador, no pruebas ya ejecutadas.

Ejecutar la misma lista una vez en Safari iOS y otra en Chrome Android:

1. **Portada:** aceptar/rechazar el consentimiento; comprobar header de 64 px sin franja comercial, seis destinos inferiores, precio/WhatsApp/carrito y seguimiento. Capturar inicio y scroll con las barras del navegador visibles y retraídas.
2. **Búsqueda y teclado:** abrir búsqueda, escribir una consulta, desplazar resultados, cerrar por botón y por gesto del sistema. Capturar teclado abierto; confirmar que campo, resultados y cierre quedan accesibles y que vuelve el foco/scroll esperado.
3. **Ciudad:** para ejercitar datos del coordinador aislado usar `?view=live`; cambiar Tunja → Bogotá, cerrar selector y continuar. Confirmar ciudad nueva, contenido cargado y ningún control bajo la cabecera.
4. **Categorías:** desplegar, llegar al último destino y volver a cerrar, en vertical y horizontal. Confirmar que la barra inferior no tapa enlaces ni bloquea el documento.
5. **Variantes:** desde la portada fija abrir Salchipapas premium, seleccionar opción, cambiar cantidad y cerrar/reabrir. Comprobar último botón accesible con teclado visible. Añadir al carrito local y revisar badge; no iniciar compra ni enviar WhatsApp.
6. **Safe-area:** desplazar hasta el final, abrir/cerrar Perfil, girar el dispositivo. Comprobar separación del indicador Home/notch, ausencia de overflow y de contenido o acciones tapadas. Capturar ventana baja y orientación horizontal.
7. **H.264 real:** abrir una publicación con video, pulsar reproducir, esperar avance ≥5 segundos, pausar, usar pantalla completa y regresar. Registrar fuente, `readyState`, error si existe y captura/grabación breve; verificar sonido solo tras interacción explícita del usuario. Un póster o un reproductor con error no cuentan como reproducción aprobada.
8. **Reseña:** abrir `?scenario=reviews`, comprobar la foto y vínculo Empanadas Boyacenses; abrir/cerrar publicación. Comprobar que texto, valoración y acciones siguen accesibles tras scroll y retorno.

Registrar por plataforma: modelo físico, versión de SO/navegador, URL/commit probado, orientación, resultado por paso, capturas/grabación y cualquier fallo reproducible. Resultado pendiente hasta que exista ese registro. Cerrar el servidor y ejecutar `node e2e/mobile-premium-v2/prepare.cjs --clean` al terminar.
