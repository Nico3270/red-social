# Acceso y continuidad para negocios

Base publicada: `da9e4480998b795c2889371ae54dae228ce59022`. Trabajo aislado en `feat/public-business-entry`, worktree `/home/nico/worktrees/myckeo-business-entry-20261125`. El árbol original `/home/nico/red-social` se conserva.

## Cambio

“Tengo un negocio” aparece en la navegación pública bajo la fila de marca/búsqueda/ciudad. Comparte componente y estilos en móvil y escritorio, con área táctil de 44 px. No sustituye búsqueda, ubicación, carrito, favoritos, perfil ni gestión. Los offsets de cabecera reservan la altura adicional, también en páginas con cabecera fija.

No se añade landing, formulario, plan ni modelo de cuenta. Se reutilizan registro, acceso, edición de usuario, creación de negocio y dashboard. El registro identifica Cuenta Negocio desde el primer encabezado, ofrece ingresar con una cuenta existente al principio y permite volver al selector personal/negocio.

| Estado | Destino |
| --- | --- |
| Sin sesión | `/auth/new-account?tipo=negocio`, con el formulario de negocio seleccionado. “Inicia sesión” conserva la intención; el acceso permite regresar a ese registro. |
| Cuenta completa sin negocio | `/crear_negocio/{id de la sesión}`, sin volver a registrarse. |
| Datos personales incompletos | `/dashboard/editar-usuario?negocio=1`; al guardar, se vuelve al coordinador y después a crear el negocio. |
| Propietario existente | `/dashboard`; la gestión conserva sus restricciones vigentes. Un negocio no operativo no conduce a crear otro. |
| Configuración posterior a crear | Se mantiene el destino existente `/dashboard/editar-perfil`. |
| Placeholder o administración | Se conservan sus destinos existentes de configuración/gestión; no se concede acceso nuevo por el indicador de negocio. |

La intención usa `tipo=negocio` en autenticación y `negocio=1` en el coordinador existente `/config/completePerfil`. No acepta un ID ni un destino arbitrario. Las acciones continúan tomando el usuario de `auth()` y manteniendo la relación única usuario/negocio. No se modifica `auth.config.ts`, el esquema ni los permisos. Los callbacks generales conservan rutas internas y URLs absolutas del mismo origen; rechazan otros orígenes y formas ambiguas.

## Autenticación y ajustes acotados

Credenciales registra al usuario y autentica mediante los mecanismos actuales; la continuación vuelve al servidor con la sesión real. Google utiliza el mismo destino fijo de continuación y deja que NextAuth gestione la redirección, en lugar de enviar al visitante al destino general antes de completar OAuth. Su botón ya no exige completar el formulario de contraseña para comenzar OAuth.

Se asocian las etiquetas de acceso a sus campos y se usan botones `type=button` con `aria-pressed` en categorías/secciones del formulario de negocio existente. No se modifica su validación ni la escritura de negocio. La vuelta desde edición de usuario solo cambia cuando está presente la intención explícita; el uso normal sigue regresando al dashboard.

Google se revisa por código y por la continuidad tras autenticar una cuenta con perfil incompleto; **no se ejecuta ni se certifica OAuth completo con una cuenta Google real**.

## Validación

Las ejecuciones y capturas de este lote se documentan en `business-entry-evidence/`. Los scripts reproducibles están en [scripts/business-entry-audit](../../scripts/business-entry-audit/README.md). Usan Prisma real y PostgreSQL desechable, sin datos remotos ni adaptador en memoria; bloquean HTTP externo tanto desde servidor como desde navegador. El build usa esa misma base aislada.

La primera ejecución de navegador creó la cuenta, pero intentó seleccionar una categoría antes de la hidratación y no completó el negocio; se conserva como antecedente, no como prueba aprobada. Se ajustó la espera del recorrido. También se corrigieron las etiquetas no asociadas del acceso. La preparación de fixtures se limitó a campos Prisma y una sección requerida; las propiedades de navegación y los slugs duplicados de la configuración de UI no se insertan como si fueran un seed de producción.

Resultado final de esta ejecución:

- **71 pruebas unitarias aprobadas**, en cuatro suites: continuidad de negocio/callbacks seguros, sesión, autorización y creación idempotente. [Salida](business-entry-evidence/unit-results.txt).
- **Tres recorridos Playwright aprobados juntos**, contra `next start` del build real conectado a PostgreSQL: alta con credenciales desde la entrada hasta creación y gestión; registro personal e ingreso de una cuenta existente; perfil incompleto, continuación y denegación de otro ID. [Salida](business-entry-evidence/browser-results.txt).
- **Comprobación SQL posterior:** tres usuarios sintéticos del dominio reservado; un solo negocio nuevo, rol `negocio`, teléfono `+573100000000`, categoría `2`, sección `s8`, perfil incompleto actualizado y sin duplicar el registro de las cuentas existentes. [Resultado](business-entry-evidence/database-after-flow.json).
- `pnpm typecheck`, `pnpm lint`, lint de herramientas de prueba y `pnpm build` aprobados. Permanece el aviso previo `_body` sin uso en el test de activación. El build con datos aislados generó 63 páginas; los avisos Upstash corresponden a servicios externos sin configurar que no se usan aquí. No se omitieron controles ni se vaciaron rutas.
- Node 20.20.0, Prisma/client 6.18.0 y PostgreSQL 16.16; dependencias del lockfile sin actualizaciones. La comprobación de bloqueo externo rechaza fetch y HTTPS antes de conectar. [Datos de base](business-entry-evidence/database.json), [bloqueo](business-entry-evidence/outbound-results.txt).

Capturas sintéticas: [entrada móvil, 390 px](business-entry-evidence/entry-390.png), [entrada escritorio, 1440 px](business-entry-evidence/entry-1440.png), [registro de negocio](business-entry-evidence/business-register-390.png), [edición tras crear](business-entry-evidence/business-created-390.png). Se verificó ausencia de desbordamiento en ambos anchos; las capturas finales de entrada esperan las animaciones. No son capturas de producción.

La segunda ejecución parcial pasó los dos recorridos de cuenta existente/perfil incompleto, pero el test esperaba un nombre que el icono duplicaba en los nuevos botones. Se fijaron sus nombres accesibles explícitos y la ejecución final pasó los tres casos. Las salidas inicial e intermedia se conservan como evidencia de desarrollo, sin sumarlas a las pruebas aprobadas.

No se ejecutó OAuth completo ni se enviaron comunicaciones. La continuidad de una cuenta con `perfilCompleto=false` sí se ejecutó por credenciales y la sesión real; no se presenta ese fixture como una autenticación Google real.

## Regresiones conservadas y límites

Geografía, paginación, tarjetas, WhatsApp y las rutas de contacto/categorías conservan el código de la base publicada. Se reutiliza la evidencia anterior de 26 escenarios PostgreSQL, dos recorridos de navegador y 103 pruebas unitarias; esas cifras **no son nuevas ejecuciones de este lote**.

Permanece documentado el límite del cursor eliminado: un recorrido nuevo sin cursor ni IDs vistos recupera los elegibles; no se promete una instantánea frente a cualquier modificación concurrente. La ciudad sigue siendo prioridad, con ampliación posterior por departamento y país.

Public smoke sigue pendiente por su validación de entorno. El fallo del proyecto separado `myckeo-red-social-staging` tiene causa sin confirmar. No se cambian secretos, infraestructura ni controles para obtener un resultado verde. Tampoco se modifica contenido remoto, checkout, reservas ni los 404 pendientes.


## Integración y publicación

El cambio se integra únicamente después de la validación anterior, verificando el remoto y sin incorporar modificaciones desconocidas. La publicación utiliza Git → Vercel, proyecto `red-social`, sin subir el build local con fixtures. El SHA exacto y el deployment efectivo se entregan al concluir la publicación; este informe no intenta registrar su propio SHA dentro del commit.

La comprobación pública posterior se limita a ver la entrada en 390/1440 px y navegar por registro/acceso/selección de cuenta, sin enviar formularios ni crear datos reales. Public smoke y el proyecto separado de staging no se presentan como controles aprobados de este lote.

El servidor y el contenedor PostgreSQL propios se retiraron tras validar. Se conservaron los 2740 archivos y el estado pendiente del original; [comprobación](business-entry-evidence/original-preservation.json).
