# Pilot Execution Plan

## Objetivo

Dejar una forma operativa, concreta y repetible de abrir pilotos reales de Myckeo con 3 a 5 negocios sin improvisar cambios grandes de producto.

## Punto de partida

Estado tecnico validado antes de esta fase:

- `pnpm run typecheck`: OK
- `pnpm run build`: OK
- `pnpm run smoke:ci`: OK
- cobertura smoke publica actual: 7/7
- guia del perfil cubierta por smoke
- warnings de geolocalizacion externa endurecidos como ruido transitorio no critico

Condicion real de entorno antes de abrir pilotos:

- `SITE_URL` configurada correctamente en el entorno publico

## Regla general del piloto

No abrir el piloto para aprender "de todo con todos". Abrirlo para aprender:

1. si el negocio entiende su perfil publico
2. si el visitante encuentra rapido el camino principal de conversion
3. si el negocio comparte y usa activamente su catalogo
4. si Myckeo resiste la primera semana sin friccion operativa grave

## Cohorte recomendada de 3 a 5 negocios

### Ola 1: abrir 3 negocios

Abrir primero estos tres modos ya validados tecnicamente:

1. Un negocio tradicional sin CatalogGroups
2. Un negocio con CatalogGroups no-restaurante
3. Un restaurante premium con menu y al menos un producto simple mas un producto con variantes

### Ola 2: abrir 2 negocios adicionales solo si las primeras 72 horas salen estables

Agregar maximo dos mas:

4. Un segundo restaurante para comparar patron de uso de menu y CTA
5. Un retail especializado de baja complejidad operativa

Buenas opciones para ese quinto negocio:

- moda con 2 a 4 grupos claros
- regalos o flores con CTA fuerte a WhatsApp
- tecnologia simple con pocos grupos y catalogo limpio

Evitar en esta fase:

- negocios con catalogo desordenado o incompleto
- negocios que dependan de reservas complejas no probadas por el equipo
- negocios sin responsable disponible para feedback durante 7 dias
- negocios que pidan integraciones, automatizaciones o reportes avanzados desde el dia 1

## Como elegir los negocios

Un negocio entra a la cohorte solo si cumple estas condiciones:

- tiene duenio o encargado disponible para responder durante la primera semana
- tiene un objetivo principal claro
- tiene al menos un CTA util hoy
- tiene catalogo visible, no solo placeholders
- puede compartir su perfil a clientes reales en los primeros 3 dias
- puede dar feedback puntual en dia 1, dia 3 y dia 7

### Criterio simple de seleccion

Priorizar negocios que marquen "si" en al menos 6 de 8 puntos:

- perfil visualmente presentable
- telefono o WhatsApp probado
- al menos 8 productos visibles o 2 grupos utiles
- producto destacado claro
- portada y avatar correctos
- redes o sitio web validos si el negocio los usara
- responsable comercial asignado
- capacidad real de conseguir trafico en la primera semana

## Vertical a priorizar primero

La prioridad recomendada no es una sola vertical. Es una cohorte mixta controlada:

1. restaurante premium
2. retail tradicional
3. CatalogGroups no-restaurante

Razon:

- cubre los tres modos publicos ya validados
- reduce el riesgo de sacar conclusiones sesgadas por una sola vertical
- permite comparar dos patrones de conversion
  - descubrimiento guiado y menu para restaurante
  - navegacion de productos, grupos y CTA para retail

Si hubiera que priorizar una sola para aprender mas rapido, la mejor primera opcion es restaurante con WhatsApp fuerte y menu bien curado, porque combina:

- decision rapida
- mas frecuencia de uso
- feedback mas inmediato del negocio

## Checklist exacta de despliegue antes de abrir pilotos

### Checklist de entorno

- [ ] `pnpm run env:check:pilot`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run build:with-sitemap`
- [ ] `pnpm run smoke:ci`
- [ ] `SITE_URL` apunta al dominio real del piloto
- [ ] `AUTH_URL` o `NEXTAUTH_URL` apunta al mismo entorno publico
- [ ] `AUTH_SECRET` o `NEXTAUTH_SECRET` configurada
- [ ] `public/sitemap.xml` generado con la URL correcta
- [ ] existe una persona responsable del despliegue
- [ ] se registra fecha, entorno y commit o release usado

### Checklist de validacion publica minima

- [ ] abrir manualmente al menos 1 perfil tradicional
- [ ] abrir manualmente al menos 1 perfil con CatalogGroups
- [ ] abrir manualmente al menos 1 restaurante premium
- [ ] abrir al menos 1 detalle de producto desde cada flujo
- [ ] probar WhatsApp publico
- [ ] probar carrito en al menos 1 producto

## Flujo exacto de activacion por negocio

1. Elegir negocio segun la rubrica de seleccion
2. Ejecutar onboarding usando `PILOT_BUSINESS_ONBOARDING_CHECKLIST.md`
3. Validar GO / NO-GO con la checklist de este documento
4. Compartir al negocio:
   - URL publica
   - CTA principal a probar
   - que esperar durante la primera semana
   - como dar feedback
5. Registrar negocio en una lista interna con:
   - nombre
   - slug
   - vertical
   - responsable comercial
   - responsable tecnico
   - fecha de apertura
   - CTA principal
6. Abrir seguimiento dia 1, dia 3 y dia 7

## CTA y flujo a priorizar segun tipo de negocio

### Negocio tradicional

Priorizar:

1. `Productos`
2. detalle de producto
3. WhatsApp o carrito, segun el negocio

No dispersar la prueba con demasiadas redes o tabs.

### CatalogGroups no-restaurante

Priorizar:

1. entrar a `Productos`
2. cambiar entre grupos
3. abrir un detalle
4. CTA de WhatsApp o carrito

Deep links de grupo son importantes si el negocio comparte enlaces a categorias concretas.

### Restaurante premium

Priorizar:

1. abrir `Productos`
2. navegar entre grupos del menu
3. abrir item destacado
4. agregar producto simple
5. probar producto con variantes
6. WhatsApp y reservas solo si el negocio realmente las usara

### Negocio orientado a servicio

Solo abrirlo si tiene un recorrido claro hoy. Priorizar:

1. perfil y confianza visual
2. CTA de WhatsApp
3. sitio web o reserva si ya esta activo

No usar este tipo de negocio para concluir sobre carrito o navegacion profunda de catalogo.

## Cosas que NO prometer todavia

- dashboard de analytics listo para negocio
- reportes automaticos de visitas y conversion sin provider conectado
- personalizacion profunda de la guia por vertical
- integraciones avanzadas de inventario o ERP
- automatizaciones comerciales complejas
- reservas complejas si el negocio no fue validado en ese flujo
- soporte de carga masiva o operacion multi-sucursal

## Checklist GO / NO-GO por negocio piloto

Responder "si" o "no". Si cualquier punto critico es "no", el negocio no entra a piloto.

### Entorno y visibilidad

- [ ] `SITE_URL` publica correcta
- [ ] perfil abre sin error visible
- [ ] portada y avatar cargan
- [ ] no hay links rotos evidentes

### Catalogo o grupos

- [ ] existe al menos un camino con contenido real
- [ ] si usa CatalogGroups, el grupo inicial tiene contenido util o fallback correcto
- [ ] si es restaurante, el menu abre en una seccion valida
- [ ] existe al menos un producto destacado o facil de probar

### Guia y navegacion

- [ ] la guia aparece si el negocio tiene productos
- [ ] al menos un preset devuelve resultados coherentes
- [ ] "Ver mas opciones" lleva a `Productos`
- [ ] las tabs principales se entienden en movil

### CTA y conversion

- [ ] WhatsApp abre al numero correcto si aplica
- [ ] carrito funciona para al menos un producto si el negocio usara carrito
- [ ] reserva solo esta activa si el negocio la va a operar
- [ ] encuesta solo esta activa si el negocio la va a revisar

### Calidad minima del negocio

- [ ] nombre, slug y descripcion revisados
- [ ] al menos una imagen principal buena por perfil
- [ ] producto destacado real, no placeholder
- [ ] responsable del negocio sabe cual es su CTA principal

### Validacion manual final

- [ ] un miembro del equipo hizo un recorrido completo desde movil
- [ ] el responsable comercial aprobo apertura
- [ ] el responsable tecnico no ve blocker abierto

Resultado final:

- GO: todos los puntos criticos en "si"
- NO-GO: existe al menos un blocker en entorno, catalogo, guia o CTA

## Soporte operativo de la primera semana

### Dia 1

Revisar:

- el negocio abre y comparte la URL correcta
- el CTA principal funciona desde movil
- no hay warnings operativos repetidos para ese slug
- el negocio entiende donde ver sus productos o grupos

Accion si hay friccion:

- corregir links, imagenes o copy
- simplificar el recorrido que se le pide al negocio
- no meter feature nueva salvo bloqueo real

### Dia 3

Revisar:

- si el negocio ya compartio el perfil
- si hubo al menos una accion real sobre el CTA principal
- si la guia o grupos ayudaron o confundieron
- si el negocio sabe editar o destacar lo que mas le importa

Accion si hay friccion:

- ajustar orden de productos o grupos
- cambiar el CTA principal recomendado
- quitar complejidad operativa que no este dando valor

### Dia 7

Revisar:

- si el negocio quiere seguir usando Myckeo
- que flujo le dio mas valor
- que parte no entendio o no pisaria de nuevo
- si el catalogo sigue vivo o quedo abandonado
- si hubo blockers repetidos o solo ruido aislado

Decision:

- continuar piloto
- continuar con correcciones menores
- pausar ese negocio
- expandir a la segunda ola

## Senales de exito tempranas

- el negocio comparte su perfil sin necesitar acompanamiento constante
- al menos un CTA principal recibe uso real
- el negocio entiende como llevar a sus clientes a productos o grupos
- el equipo no ve errores operativos repetidos para ese slug
- el negocio pide mejoras puntuales, no rescates estructurales

## Senales de friccion fuerte

- el negocio no entiende cual es su camino principal de uso
- enlaces, grupos o CTA fallan en la primera semana
- el catalogo visible no coincide con lo que el negocio quiere vender
- el negocio comparte links incorrectos o se pierde navegando
- aparecen errores operativos repetidos para el mismo slug

## Referencias

- [PILOT_RUNBOOK.md](PILOT_RUNBOOK.md)
- [PILOT_BUSINESS_ONBOARDING_CHECKLIST.md](PILOT_BUSINESS_ONBOARDING_CHECKLIST.md)
- [PILOT_METRICS_AND_FEEDBACK.md](PILOT_METRICS_AND_FEEDBACK.md)
- [../PROFILE_QA_AND_DEPLOY_READINESS.md](../PROFILE_QA_AND_DEPLOY_READINESS.md)
- [../SMOKE_TESTS_READINESS.md](../SMOKE_TESTS_READINESS.md)
