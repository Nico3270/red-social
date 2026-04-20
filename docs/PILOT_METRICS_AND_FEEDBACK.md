# Pilot Metrics And Feedback

## Objetivo

Definir que mirar de verdad durante los primeros pilotos y como recoger feedback sin inventar dashboards ni procesos pesados.

## Realidad actual de medicion

### Lo que ya existe

- la app ya emite eventos tipados para guia, grupos, productos, carrito, WhatsApp y menu restaurante
- los warnings operativos ya salen por `area` y `event`
- los smoke tests cubren la superficie publica critica

### Lo que NO existe por defecto

- sin `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, no hay provider real activo y la capa queda en fallback seguro
- la persistencia automática de métricas depende de habilitar GA4 en el entorno del piloto
- `visitas al perfil` y navegación entre perfil/detalle aparecen como `page_view` cuando GA4 está habilitado

Conclusion operativa:

- para pilotos ya se puede operar con QA, logs operativos y feedback del negocio incluso sin provider
- para métricas finas de uso, habilita GA4 y valida eventos en Realtime o DebugView

## Integración disponible para piloto

- provider inicial soportado: Google Analytics 4
- activación: definir `NEXT_PUBLIC_GA4_MEASUREMENT_ID` en el entorno del piloto
- debug opcional: definir `NEXT_PUBLIC_ANALYTICS_DEBUG=true` para facilitar validación en DebugView
- fallback: si la variable falta, los eventos custom no rompen la app y siguen loggeando en desarrollo

## Eventos instrumentados relevantes para piloto

Eventos utiles ya disponibles en codigo:

- `guide_preset_clicked`
- `guide_result_clicked`
- `guide_navigation_to_products`
- `products_tab_opened`
- `catalog_group_preview_clicked`
- `catalog_group_changed`
- `catalog_group_invalid_url_fallback`
- `restaurant_menu_group_selected`
- `restaurant_menu_item_clicked`
- `restaurant_menu_featured_clicked`
- `product_card_clicked`
- `product_detail_viewed`
- `product_whatsapp_clicked`
- `product_add_to_cart_clicked`
- `group_deep_link_opened`

## Metricas minimas a observar

## 1. Salud tecnica del piloto

### Metrica

Warnings o errores operativos repetidos por negocio

### Fuente

Logs operativos por `area` y `event`

### Interpretacion

- bajo volumen y con fallback seguro: ruido tolerable
- repeticion por el mismo slug: riesgo real

### Que hacer si sale mal

- pausar apertura de nuevos negocios
- corregir data, links, grupos o CTA del negocio afectado

## 2. Apertura del camino principal

### Metrica

`products_tab_opened`

### Fuente

Eventos custom si hay provider conectado

### Interpretacion

- alto: el visitante entra a explorar producto real
- bajo con trafico al perfil: el hero o CTA principal no esta guiando bien

### Sin provider

Usar validacion manual con el negocio y revisar si comparte directamente el perfil o links a grupos/productos.

## 3. Uso de grupos y menu

### Metrica

- `catalog_group_changed`
- `restaurant_menu_group_selected`
- `group_deep_link_opened`

### Fuente

Eventos custom si hay provider conectado

### Interpretacion

- uso moderado: exploracion sana
- uso muy alto con poca conversion: exceso de navegacion o estructura confusa
- fallback invalido repetido: links mal compartidos o grupo roto

## 4. Uso de la guia

### Metrica

- `guide_preset_clicked`
- `guide_result_clicked`
- `guide_navigation_to_products`

### Fuente

Eventos custom si hay provider conectado

### Interpretacion

- preset click alto + navigation alto: la guia esta ayudando
- preset click alto + result click bajo: las sugerencias no convencen
- preset click bajo: la guia no se entiende o no resalta suficiente

## 5. Descubrimiento de producto

### Metrica

- `product_card_clicked`
- `product_detail_viewed`

### Fuente

Eventos custom si hay provider conectado

### Interpretacion

- mucha card click y poca vista de detalle: revisar modal o transicion
- pocas aperturas de detalle: revisar merchandising, primer fold o grupos

## 6. Conversion suave

### Metrica

- `product_whatsapp_clicked`
- `product_add_to_cart_clicked`

### Fuente

Eventos custom si hay provider conectado

### Interpretacion

- WhatsApp alto y carrito bajo puede ser sano en restaurante o negocio asesorado
- carrito alto es senal fuerte de catalogo claro
- ambos bajos con trafico real: problema de propuesta, precios, copy o contenido

## 7. Visitas al perfil

### Metrica

Visitas o pageviews del perfil publico

### Fuente

- GA4 `page_view` si `NEXT_PUBLIC_GA4_MEASUREMENT_ID` está activo
- herramienta del hosting si ya existe
- sin provider activo, no sale del layer custom por si sola

### Interpretacion

No usar esta metrica como unica senal. Sin CTA o detalle no dice si el piloto esta funcionando.

## Senales tempranas que SI importan

Priorizar estas preguntas por encima de vanity metrics:

1. El negocio comparte y usa su perfil?
2. El visitante llega a productos o grupos utiles?
3. Existe al menos una accion real a WhatsApp o carrito?
4. La guia ayuda o estorba?
5. El negocio entiende que cambiar para vender mejor?

## Senales tempranas que NO deben sobredimensionarse

- una caida puntual de geolocalizacion externa con fallback seguro
- pocos clics en redes sociales
- bajo uso de tabs secundarias si el CTA principal esta funcionando
- una semana con poco trafico si el negocio aun no ha compartido el perfil

## Lectura recomendada por dia

### Dia 1

Mirar:

- salud tecnica
- apertura de `Productos`
- primer CTA real
- feedback inicial del negocio

### Dia 3

Mirar:

- uso de grupos o menu
- uso de guia si aplica
- detalle de producto
- friccion reportada por el negocio

### Dia 7

Mirar:

- si hubo uso real del CTA principal
- si el negocio entiende y sigue usando su catalogo
- si los problemas son menores o estructurales
- si el negocio seguiria con Myckeo una semana mas

## Criterio practico de exito por negocio

Un negocio va bien si al dia 7 cumple la mayoria de estas condiciones:

- no tuvo blocker tecnico repetido
- tuvo al menos una accion real sobre su CTA principal
- el negocio pudo compartir su perfil sin acompanamiento constante
- entiende donde estan sus productos, grupos o menu
- el feedback pide mejoras puntuales, no rescate del flujo completo

## Criterio practico de fracaso o pausa

Pausar o corregir antes de expandir si se cumple alguna:

- el CTA principal no funciona o no se entiende
- hay errores operativos repetidos por el mismo slug
- el negocio no logra explicar su recorrido principal despues del onboarding
- el catalogo visible no representa lo que realmente vende
- el negocio no quiere seguir usandolo por confusion, no por falta de trafico

## Plantilla de feedback del negocio

Usar este formato en llamada, chat o formulario simple:

```md
# Feedback de negocio piloto

- Negocio:
- Slug:
- Vertical:
- Fecha:
- Responsable del negocio:
- Responsable Myckeo:

## Uso real

- Compartiste ya tu perfil con clientes? Si / No
- Que link compartiste mas?
- Cual era el CTA principal que querias probar?

## Lo que mas valor te dio

- Que te gusto mas del perfil?
- Que parte sentiste mas util para vender?
- Que parte usarias otra vez esta semana?

## Lo que no fue claro

- Que no entendiste al usarlo?
- En que parte sentiste confusion?
- Que no usarias otra vez?

## Friccion o problemas

- Viste algo roto o que cargara mal?
- Algun boton o link no te llevo a donde esperabas?
- Tus clientes te preguntaron algo que la pagina no resolvia?

## Cambios deseados

- Que te gustaria cambiar primero?
- Que te gustaria ocultar o simplificar?
- Que te gustaria destacar mas?

## Continuidad

- Lo seguirias usando la proxima semana? Si / No
- Se lo mostrarias a otros clientes hoy? Si / No
- Que tendria que pasar para que lo uses mas?
```

## Plantilla interna de seguimiento por negocio

```md
# Seguimiento interno piloto

- Negocio:
- Slug:
- Vertical:
- CTA principal:
- Fecha de apertura:
- Dia de revision: D1 / D3 / D7

## Estado tecnico

- Perfil abre: Si / No
- Productos o grupos visibles: Si / No
- CTA principal probado: Si / No
- Warnings repetidos: Si / No

## Senales de uso

- Products tab: Alto / Medio / Bajo / Sin dato
- Guia: Alto / Medio / Bajo / Sin dato
- Detalle producto: Alto / Medio / Bajo / Sin dato
- WhatsApp: Alto / Medio / Bajo / Sin dato
- Carrito: Alto / Medio / Bajo / Sin dato

## Lectura del equipo

- Que esta funcionando:
- Que esta confundiendo:
- Que corregir sin meter feature nueva:
- Recomendacion: Seguir / Ajustar / Pausar / Escalar
```

## Referencias

- [PILOT_EXECUTION_PLAN.md](PILOT_EXECUTION_PLAN.md)
- [PILOT_RUNBOOK.md](PILOT_RUNBOOK.md)
- [PILOT_BUSINESS_ONBOARDING_CHECKLIST.md](PILOT_BUSINESS_ONBOARDING_CHECKLIST.md)
- [../SMOKE_TESTS_READINESS.md](../SMOKE_TESTS_READINESS.md)
