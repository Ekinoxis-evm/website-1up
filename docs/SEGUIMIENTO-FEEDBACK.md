# Seguimiento de Feedback — 1UP Gaming Tower

Documento único que consolida el feedback de testing y revisión del sitio.
Integra el **Review del 8 de mayo de 2026** y el **Testing del 21 de mayo de 2026**.

**Última actualización:** 21 de mayo de 2026
**Versión en producción:** v2.29.0

Leyenda: ✅ resuelto · ⏳ en diagnóstico · ⬜ pendiente (decisión de diseño / tweak visual)

---

## 1. Resumen de pendientes abiertos

Solo quedan ítems menores de diseño visual y dos bugs en diagnóstico:

| Ítem | Tipo | Estado |
|------|------|--------|
| Login / banner de pase "solo funciona en home" | Bug | ⏳ Requiere traza de consola del navegador en página no-home |
| Posición de "Academia" en el navbar | Diseño | ⬜ Pendiente |
| Redundancia logo + texto "1UP" en el navbar | Diseño | ⬜ Pendiente |
| Transparencia del header (`glass-panel`) | Diseño | ⬜ Decisión de diseño |
| Fondo blanco del banner de marcas | Diseño | ⬜ Decisión de diseño |
| Tamaño de logos (80px) en la marquee | Diseño | ⬜ Tweak visual |
| Unificar texto del 1UP Pass + nombre más grande | Diseño | ⬜ Pendiente |
| Quitar números de la sección "Sobre Nosotros" | Diseño | ⬜ Pendiente |
| Agregar Marketplace al navbar | Diseño | ⬜ Pendiente |
| MercadoPago automático | Externo | ⬜ Bloqueo externo — 1UP debe habilitar el procesador |

Todo lo demás del feedback histórico está **resuelto y en producción**.

---

## 2. Review — 8 de mayo de 2026

### 2.1 Conclusiones generales

- ✅ Correos transaccionales: compra de tokens (aprobado/rechazado), compra de pass por banco (aprobado/rechazado), inscripción a torneos (confirmación + `.ics` + aviso al admin)
- ⬜ Forma de pago automática — **bloqueo externo**: MercadoPago Colombia requiere que 1UP habilite el procesador
- ✅ Pago sin tokens: transferencia bancaria + comprobante para tokens, pass y cursos
- ✅ 1UP Pass movido de Gaming Tower a Home
- ✅ Política de Privacidad publicada (`/privacidad`) + habeas data en el onboarding
- ✅ Documentación técnica (`FICHA-TECNICA.md`)

### 2.2 Navbar

- ⬜ Ajustar posición de "Academia" — más cerca de "Home"
- ⬜ Reducir redundancia logo 1UP + texto 1UP
- ⬜ Quitar/ajustar transparencia del header (`glass-panel` es el estándar de diseño actual)

### 2.3 Home

- ✅ Banner animado unificado (marcas, patrocinadores y aliados en una sola marquee) — gestionado desde Admin → Aliados
- ⬜ Fondo blanco del banner — decisión de diseño
- ✅ Carga de logos `.png` / `.svg` (hasta 5 MB)
- ⬜ Tamaño 80px de los logos en la marquee
- ✅ Sección 1UP Pass en el Home (beneficios visibles sin ir a Gaming Tower)
- ✅ 1UP Pass también en Gaming Tower
- ⬜ Unificar el texto del Pass + nombre más grande
- ✅ Torneos con página propia `/torneos` (ya no redirige a "Team")
- ⬜ Quitar los números de la sección "Sobre Nosotros"
- ✅ Links de redirección corregidos (Recreativo, Academia, Torneos; "Training" eliminado)
- ✅ Sección Marketplace en el Home (features + CTA)

### 2.4 Torneos

- ✅ Página dedicada `/torneos`
- ✅ CRUD de torneos: imagen, fecha/hora, lugar, slug, categoría/juego, premios por posición, puntaje Hall of Fame, sponsor
- ✅ Cards con imagen, nombre, fecha, estado, badges
- ✅ Detalle `/torneos/[slug]` con premios, descripción y registro
- ✅ Calendario: Google Calendar + `.ics` por email
- ✅ Inscripción con confirmación por email + modal de calendario
- ✅ Filtros por mes y por juego/categoría
- ✅ Entrega de premios on-chain ($1UP) y COP desde el admin
- ✅ Torneos internacionales (organizador, país, ciudad, link)
- ✅ Hall of Fame 1UP + Hall of Fame del equipo

### 2.5 Masters & Academia

- ✅ Masters y Academia unificados — Masters en `/academia`, contenido en `/app/academia`
- ✅ Currículo por curso para inscritos (video intro, módulos, sesiones, documentos)
- ✅ Videos protegidos por Cloudflare Stream (JWT RS256, solo inscritos)
- ✅ **Nuevo (v2.27.0):** página pública de preview por curso `/academia/[courseId]` — video intro reproducible, temario con candado para no-inscritos

### 2.6 Marketplace

- ⬜ Agregar Marketplace al header / navbar
- ✅ Marketplace en el Home (features + CTA)

### 2.7 Generales

- ✅ Popup que sugiere comprar el 1UP Pass — `PassSuggestionBanner` implementado
- ⏳ Interacción hold-on-click → click inmediato con hover azul — verificar en producción
- ✅ Calendario de cobertura del 1UP Pass (`/app/pass`)
- ✅ Compra de cursos (token + banco) sin MercadoPago automático
- ✅ CommunitySection (Discord / WhatsApp) en home y academia
- ✅ Pass admin grant con fecha retroactiva

---

## 3. Testing — 21 de mayo de 2026

| # | Reporte | Estado | Detalle |
|---|---------|--------|---------|
| 1 | Academia — fallo al subir videos (intro y módulos) | ✅ | Faltaban las variables `CF_STREAM_*` en Vercel producción + el navegador subía con `PUT` (Cloudflare exige `POST` multipart). Corregido en v2.27.0 / v2.27.1 |
| 2 | Academia — previsualización del curso bloqueada para no-pagos | ✅ | Nueva página pública `/academia/[courseId]` — video intro reproducible, módulos y sesiones con candado. v2.27.0 |
| 3 | 1UP Pass — "comprar pase" del banner solo funciona en home | ⏳ | El banner está en el layout compartido y debería funcionar en todas las páginas; requiere traza de consola en una página no-home para confirmar la causa raíz |
| 4 | 1UP Pass — error al conceder pass desde el admin | ✅ | La wallet se autocompleta desde `user_profiles.wallet_address` (capturada de Privy) y es opcional para grants admin. v2.28.0 |
| 5 | Login — solo permite iniciar sesión en home | ⏳ | Mismo caso que #3; requiere traza de consola del navegador en una página no-home |
| 6 | Torneos — registro posible sin completar el onboarding | ✅ | La API exige `onboarding_completed_at`; el botón muestra "Completar registro". v2.28.0 |
| 7 | Torneos — el bracket no se visualiza | ✅ | La función de brackets nunca se había desplegado (v2.26.0 fallaba el build por dependencia faltante). Corregido y desplegado; flujo de brackets rediseñado en v2.29.0 |

### Acción requerida para cerrar #3 y #5

Abrir `1upesports.org/torneos` → consola del navegador (DevTools) → intentar iniciar sesión → reportar cualquier error en rojo. Con esa traza se identifica la causa raíz exacta.

---

## 4. Mejoras entregadas tras el último review (v2.27.0 – v2.29.0)

| Versión | Entrega |
|---------|---------|
| v2.27.0 | Páginas públicas de preview de cursos (`/academia/[courseId]`) |
| v2.27.1 | Fix de subida de videos a Cloudflare Stream (variables de entorno + método HTTP) |
| v2.28.0 | Captura de identidad Privy en la base de datos + vista unificada de usuarios con ficha completa de jugador; gate de onboarding para inscripción a torneos |
| v2.28.1 | Fix de firma de tokens de Cloudflare Stream — los videos de academia nunca habían reproducido |
| v2.29.0 | Rediseño del flujo de brackets (borrador → iniciar → en curso) + rediseño de la página de detalle de torneo |
| v2.29.1 | Endurecimiento del ciclo de vida de torneos — al iniciar el bracket se cierran inscripciones automáticamente y se bloquea la estructura (no se puede borrar ni resembrar un bracket ya iniciado); banner de etapa en el admin con enlace cruzado a inscripciones. Tres hallazgos críticos del audit cerrados (IDOR de wallet en órdenes, hijack de transferencia de pase, idempotencia del webhook de MercadoPago). |
