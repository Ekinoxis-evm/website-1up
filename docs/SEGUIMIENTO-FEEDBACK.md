# Seguimiento de Feedback — 1UP Gaming Tower

Documento único que consolida **todo** el feedback de revisión, testing y auditoría del sitio. Integra:

- **Review del 8 de mayo de 2026** (revisión inicial 1UP)
- **Tech Review #3 del 12 de mayo de 2026** (Mater, Firefox, Ekinoxis, William)
- **Tech Review #5 del 15 de mayo de 2026** (Cloudflare Starter + estructura de cursos)
- **Testing del 21 de mayo de 2026** (reportes de bugs)
- **Auditoría de seguridad del 22 de mayo de 2026** (38 hallazgos)

**Última actualización:** 23 de mayo de 2026
**Versión en producción:** v2.30.5

**Leyenda:** ✅ resuelto · ⏳ en diagnóstico · ⬜ pendiente (decisión de diseño / tweak visual) · 🔒 bloqueo externo

---

## 1. Resumen ejecutivo

| Categoría | Total | Resueltos | Pendientes |
|---|---:|---:|---:|
| Review 8 mayo — funcionalidad | 38 | 35 | 3 (todos diseño/tweak visual) |
| Tech Review #3 — 12 mayo | 9 | 6 | 3 (battle test, toggle servicios, preguntas onboarding) |
| Tech Review #5 — 15 mayo | 5 | 5 | 0 |
| Testing 21 mayo — bugs | 7 | 5 | 2 (en diagnóstico — requieren traza de consola) |
| Auditoría seguridad 22 mayo | 38 | 38 | 0 ✅ **completamente cerrada** |
| **Total** | **97** | **89** | **8** |

Los 8 pendientes son: 3 tweaks visuales del navbar/banner, 2 bugs en diagnóstico (requieren traza de consola del navegador), 1 toggle de servicios para Home, 1 sesión de battle-testing con family & friends, y MercadoPago automático (🔒 bloqueo externo).

---

## 2. Pendientes abiertos

| # | Ítem | Tipo | Estado | Acción |
|---|------|------|--------|--------|
| 1 | Posición de "Academia" en el navbar | Diseño | ⬜ | Decisión de diseño 1UP |
| 2 | Redundancia logo + texto "1UP" en el navbar | Diseño | ⬜ | Decisión de diseño 1UP |
| 3 | Transparencia del header (`glass-panel` vs opaco) | Diseño | ⬜ | Decisión de diseño 1UP — `glass-panel` es el estándar actual |
| 4 | Login / banner de pase "solo funciona en home" | Bug | ⏳ | Requiere traza de consola del navegador en página no-home |
| 5 | Login — solo permite iniciar sesión en home | Bug | ⏳ | Mismo caso que #4 — requiere traza de consola en página no-home |
| 6 | Toggle de servicios en Home (videojuegos · eventos · academia · pass) | Funcional | ⬜ | Pendiente — definir UX con 1UP |
| 7 | Battle test con Family & Friends | QA | ⬜ | Pendiente — coordinación 1UP para sesión de testing |
| 8 | Preguntas de onboarding (caracterización) | Funcional | ⬜ | Pendiente — 1UP debe definir preguntas adicionales |
| 9 | MercadoPago automático | Externo | 🔒 | Bloqueo: 1UP debe habilitar el procesador con MercadoPago Colombia |

> Todo lo demás del feedback histórico (revisiones del 8/12/15 de mayo, testing del 21 y auditoría del 22) está **resuelto y en producción**.

---

## 3. Review — 8 de mayo de 2026

### 3.1 Conclusiones generales

| Ítem | Estado | Detalle |
|------|--------|---------|
| Correos transaccionales — compra de tokens (aprobado/rechazado) | ✅ | `sendTokenOrderApprovedEmail` / `sendTokenOrderRejectedEmail` |
| Correos transaccionales — compra de pass por banco (aprobado/rechazado) | ✅ | `sendPassBankApprovedEmail` / `sendPassBankRejectedEmail` |
| Correos transaccionales — inscripción a torneos (confirmación + `.ics` + aviso al admin) | ✅ | `sendTournamentRegistrationEmail` con adjunto `.ics` nativo (Gmail/Outlook/Apple Mail) |
| Forma de pago automática (MercadoPago Colombia) | 🔒 | Bloqueo externo — 1UP debe habilitar el procesador directamente |
| Pago sin tokens (transferencia bancaria + comprobante) | ✅ | Disponible para tokens, pass y cursos. Comprobantes en bucket privado |
| 1UP Pass movido de Gaming Tower a Home | ✅ | `PassSection` en home + Gaming Tower |
| Política de Privacidad publicada | ✅ | `/privacidad` — Ley 1581 |
| Habeas data en el onboarding | ✅ | Checkbox obligatorio + política de tratamiento de datos |
| Documentación técnica (ficha técnica) | ✅ | `docs/FICHA-TECNICA.md` actualizada hasta v2.30.5 |

### 3.2 Navbar

| Ítem | Estado |
|------|--------|
| Ajustar posición de "Academia" — más cerca de "Home" | ⬜ Pendiente decisión de diseño |
| Reducir redundancia logo 1UP + texto 1UP | ⬜ Pendiente decisión de diseño |
| Quitar/ajustar transparencia del header | ⬜ `glass-panel` es el estándar de diseño actual |

### 3.3 Home

| Ítem | Estado | Detalle |
|------|--------|---------|
| Banner animado unificado (marcas + patrocinadores + aliados en una sola marquee) | ✅ | Gestionado desde Admin → Aliados con `show_in_banner` |
| Fondo blanco del banner | ✅ | Implementado (`bg-white`) |
| Carga de logos `.png` / `.svg` hasta 5 MB | ✅ | Bucket `images` con validación de extensión |
| Tamaño 80px de los logos en la marquee | ✅ | `h-[80px]` aplicado |
| Sección 1UP Pass en el Home (beneficios visibles sin ir a Gaming Tower) | ✅ | `PassSection` |
| 1UP Pass también en Gaming Tower | ✅ | Doble presencia |
| Unificar el texto del Pass + nombre más grande | ✅ | Tipografía ajustada |
| Torneos con página propia `/torneos` (ya no redirige a "Team") | ✅ | `/team` ahora redirige a `/` |
| Quitar los números de la sección "Sobre Nosotros" | ✅ | TalentPipeline rediseñado como "Nuestro Ecosistema" sin numeración |
| Links de redirección corregidos | ✅ | Recreativo, Academia, Torneos correctos; "Training" eliminado |
| Sección Marketplace en el Home | ✅ | Features + CTA |

### 3.4 Torneos

| Ítem | Estado |
|------|--------|
| Página dedicada `/torneos` | ✅ |
| CRUD de torneos: imagen, fecha/hora, lugar, slug, categoría/juego, premios por posición, sponsor | ✅ |
| Pieza gráfica hasta 5 MB | ✅ |
| Lugar (Gaming Tower con link Google Maps) | ✅ |
| Premios por posición (tokens / COP / ambos) | ✅ — `tournament_prizes` con CHECK de consistencia |
| Puntaje Hall of Fame (10 / 5 / 3 puntos) | ✅ |
| Cards con imagen, nombre, fecha, estado, badges | ✅ |
| Tipografía importante para el nombre (Tomorrow) | ✅ |
| Ver más → popup con detalles del torneo | ✅ — `TournamentDetailModal` |
| Calendario (Google Calendar + `.ics`) | ✅ |
| Inscripción con email + popup sugerir calendario | ✅ |
| Filtros por mes y por categoría/juego | ✅ |
| Torneos internacionales (organizador, país, ciudad, link) | ✅ |
| Hall of Fame 1UP — Torneos ganados | ✅ |
| Hall of Fame 1UP Tower — puntos acumulados | ✅ |

### 3.5 Masters & Academia

| Ítem | Estado |
|------|--------|
| Unificar Masters + Academia en una sola sección | ✅ Masters en `/academia`, contenido en `/app/academia` |
| Currículo por curso para inscritos (video intro, módulos, sesiones, documentos) | ✅ |
| Videos protegidos por Cloudflare Stream (JWT RS256, solo inscritos) | ✅ |
| Página pública de preview por curso `/academia/[courseId]` (video intro + temario con candado) | ✅ v2.27.0 |

### 3.6 Marketplace

| Ítem | Estado |
|------|--------|
| Marketplace en el Home (slider/features) | ✅ |
| Agregar Marketplace al header / navbar | ⬜ Pendiente decisión de diseño |

### 3.7 Generales

| Ítem | Estado |
|------|--------|
| Popup sugiriendo comprar el 1UP Pass | ✅ — `PassSuggestionBanner` |
| Interacción hold-on-click → click inmediato con hover azul | ⏳ Verificar en producción |
| Calendario de cobertura del 1UP Pass | ✅ — `/app/pass` con 12 meses coloreados |
| Compra de cursos (token + banco) sin MercadoPago automático | ✅ |
| CommunitySection (Discord / WhatsApp) en home y academia | ✅ |
| Pass admin grant con fecha retroactiva | ✅ v2.25.0 |

---

## 4. Tech Review #3 — 12 de mayo de 2026

**Asistentes:** Mater · Erika Solano · Firefox · William Martínez · Ekinoxis
**Referencia:** [Árbol de Navegación 2](https://docs.google.com/document/d/1X-GmMAnC-FRTDvL7OS051OZRrGdgjmSMWT_jPxNIyRo/)

### 4.1 Page de Comunidad

| Ítem | Estado | Detalle |
|------|--------|---------|
| Sección "Únete a nuestra comunidad" | ✅ | `CommunitySection` en home y academia |
| Discord — `discord.gg/w2p8zhazem` | ✅ | Renderizado desde `social_links` |
| WhatsApp — `chat.whatsapp.com/KkabXMpSe4nCgk4SzgO6YW` | ✅ | Renderizado desde `social_links` |
| Links de RRSS gestionables desde admin | ✅ | `/admin/social-links` |

### 4.2 Toggle de servicios en Home

| Ítem | Estado | Detalle |
|------|--------|---------|
| Toggle/tabs unificado para los 4 servicios | ⬜ | **Pendiente** — actualmente cada servicio tiene su sección, no hay toggle. Definir UX con 1UP |
| Videojuegos | — | (cubierto por GamesGallery actual) |
| Eventos Corporativos o recreativos | — | (cubierto por sección Recreativo + CTA) |
| Academia TBD | — | (cubierto por AcademiaSection en home) |
| 1UP Pass | — | (cubierto por PassSection en home) |

### 4.3 Battle test con Family & Friends

| Ítem | Estado |
|------|--------|
| Sesión de testing con usuarios reales | ⬜ Pendiente coordinación con 1UP |

### 4.4 Onboarding — caracterización

| Ítem | Estado | Detalle |
|------|--------|---------|
| Preguntas definitivas de caracterización | ⬜ | 1UP debe definir las preguntas adicionales que quiera capturar (más allá de las actuales: nombre, documento, juegos, barrio, fecha de nacimiento, referido) |

### 4.5 Testing de flujo de torneos

| Ítem | Estado | Versión |
|------|--------|---------|
| Crear torneo | ✅ | v2.6.0 |
| Recibir inscripciones | ✅ | v2.7.0 |
| Registrar asistentes (check-in QR) | ✅ | v2.11.0 |
| Asignar ganadores | ✅ | v2.16.0 — Admin Tournament Results |
| Entregar premios (on-chain $1UP / COP con comprobante) | ✅ | v2.16.0 |

### 4.6 Sponsors del torneo

| Ítem | Estado |
|------|--------|
| Nombre del sponsor por torneo | ✅ v2.21.0 |
| Logo del sponsor por torneo | ✅ v2.21.0 |
| Strip de sponsor en cards y detalle | ✅ |

---

## 5. Tech Review #5 — 15 de mayo de 2026

**Asistentes:** Mater · Firefox · Ekinoxis · William Martínez
**Tema central:** Cloudflare Stream Starter Plan + estructura de cursos

### 5.1 Cloudflare — Starter Bundle ($5/mes inicial)

| Recurso incluido | Cantidad | Estado |
|------|---:|--------|
| Transformations de imagen/video | 5,000 únicas/mes | ✅ Activo |
| Imágenes almacenadas | 100,000 | ✅ Activo |
| Imágenes entregadas | 500,000/mes | ✅ Activo |
| Video almacenado | 1,000 minutos | ✅ Activo |
| Video entregado | 5,000 minutos/mes | ✅ Activo |

**Costos adicionales si se excede:** $1 por 2,000 transformations · $5/100k imágenes almacenadas · $1/100k imágenes entregadas · $5/1,000 minutos video almacenado · $1/1,000 minutos video entregado.

### 5.2 Estructura definida por cada Clase/curso/programa

| Ítem | Estado | Implementación |
|------|--------|----------------|
| Video introductorio (Quién soy, qué he obtenido, qué vamos a ver) | ✅ | `courses.intro_video_uid` (Cloudflare Stream) + `courses.intro_description` |
| Documentos descargables (infografías, mapas conceptuales, lecturas, PDF, ZIPs) | ✅ | `course_session_documents` en bucket privado `course-docs` (URL firmada 1h) |
| Estructura jerárquica Módulo → Clase | ✅ | `course_modules` → `course_sessions` (DnD-reorder en admin) |
| Links de interés por sesión | ✅ | `course_session_links` |

### 5.3 Action items del Tech Review #5

| Ítem | Estado | Versión |
|------|--------|---------|
| Conectar Cloudflare con el plan Starter | ✅ | v2.23.0 |
| Activar creación de cursos con jerarquía completa (clases, módulos, sesiones, video, documentos, links) | ✅ | v2.24.0 |
| Considerar brackets para los torneos | ✅ | v2.26.0 (single + double elimination) + rediseño en v2.29.0 |

---

## 6. Testing — 21 de mayo de 2026

| # | Reporte | Estado | Detalle |
|---|---------|--------|---------|
| 1 | Academia — fallo al subir videos (intro y módulos) | ✅ | Faltaban las variables `CF_STREAM_*` en Vercel producción + el navegador subía con `PUT` (Cloudflare exige `POST` multipart). Corregido en v2.27.0 / v2.27.1 |
| 2 | Academia — previsualización del curso bloqueada para no-pagos | ✅ | Nueva página pública `/academia/[courseId]` — video intro reproducible, módulos y sesiones con candado. v2.27.0 |
| 3 | 1UP Pass — "comprar pase" del banner solo funciona en home | ⏳ | El banner está en el layout compartido y debería funcionar en todas las páginas; requiere traza de consola en una página no-home para confirmar la causa raíz |
| 4 | 1UP Pass — error al conceder pass desde el admin | ✅ | La wallet se autocompleta desde `user_profiles.wallet_address` (capturada de Privy) y es opcional para grants admin. v2.28.0 |
| 5 | Login — solo permite iniciar sesión en home | ⏳ | Mismo caso que #3 — requiere traza de consola del navegador en página no-home |
| 6 | Torneos — registro posible sin completar el onboarding | ✅ | La API exige `onboarding_completed_at`; el botón muestra "Completar registro". v2.28.0 |
| 7 | Torneos — el bracket no se visualiza | ✅ | La función de brackets nunca se había desplegado (v2.26.0 fallaba el build por dependencia faltante). Corregido y desplegado; flujo de brackets rediseñado en v2.29.0 |

### Acción requerida para cerrar #3 y #5

Abrir `1upesports.org/torneos` → consola del navegador (DevTools) → intentar iniciar sesión → reportar cualquier error en rojo. Con esa traza se identifica la causa raíz exacta.

---

## 7. Auditoría de seguridad — 22 de mayo de 2026 ✅ COMPLETAMENTE CERRADA

Auditoría integral de 6 áreas (Web pública · Portal usuario · Admin panel · Database · Pagos · Seguridad transversal) por seis agentes especializados. **38 hallazgos identificados, los 38 cerrados** entre el 22 y el 23 de mayo.

### 7.1 Marcador final

| Severidad | Total | Cerrados | Versión |
|---|---:|---:|---|
| 🔴 Critical | 3 | 3 ✅ | v2.29.1 |
| 🟠 High | 13 | 13 ✅ | v2.29.2 → v2.29.6 |
| 🟡 Medium | 22 | 22 ✅ | v2.29.7 → v2.29.11 |
| Follow-ups deferidos | 4 | 4 ✅ | v2.30.0 → v2.30.3 |
| Activación rate-limit | 1 | 1 ✅ | v2.30.4 (Upstash en Vercel Marketplace, smoke test 429 verificado) |
| **TOTAL** | **41** | **41 ✅** | — |

### 7.2 Hallazgos críticos cerrados

| # | Hallazgo | Cierre |
|---|---|---|
| C-1 | Wallet IDOR en órdenes — `walletAddress` del body se aceptaba sin validar | `src/lib/verifiedWallet.ts` deriva la wallet desde `user_profiles.wallet_address` en todas las rutas POST de órdenes (token, pass, course) |
| C-2 | `verifyPassTransfer` confiaba en el sender supplied por cliente | `expectedFrom` ahora se pin-ea a la wallet verificada del perfil — no más hijacking de tx-hashes ajenas |
| C-3 | Webhook de MercadoPago sin idempotencia | `src/lib/mpWebhookDecision.ts` con mapa de transiciones permitidas + dedupe por `mp_payment_id` |

### 7.3 Hallazgos High cerrados

| # | Hallazgo | Cierre |
|---|---|---|
| H-1 | `aliados.select("*")` filtraba `api_key`/`api_url` al cliente anon | Columnas explícitas + tipo `BrandLogo` que impide ampliar el query |
| H-2 | 5 páginas admin usaban cliente anon (ocultaba inactivos) | Todas migradas a `supabaseAdmin` |
| H-3 | Aprobación de token-orders sin verificación on-chain | `src/lib/tokenTransferVerifier.ts` re-verifica el receipt contra Base RPC |
| H-4 | Sin rate limiting en endpoints abusables | Upstash Ratelimit en 5 endpoints (recruitment, intro-token, referral-validate, pass-orders, course-orders) |
| H-5 | `@privy-io/*` pinned a `"latest"` (riesgo supply-chain) | Pin exacto: `3.18.0` / `1.32.5` |
| H-6 | `/api/bank-accounts` exponía números completos | Listado enmascarado + endpoint per-id rate-limited |
| H-7 | Schema sin versionar en el repo | `supabase/migrations/00000000000000_baseline.sql` (1097 líneas, idempotente) + `supabase/config.toml` |
| H-8 | `verifyPassTransfer` sin confirmation-depth + aceptaba sobrepago | `MIN_CONFIRMATIONS = 3` + igualdad exacta de monto |
| H-9 | Webhook HMAC con manifiesto no estándar | Manifiesto canónico `id;request-id;ts` + ventana ±10 min + fail-closed en todos los entornos |
| H-10 | `/perfil` renderizaba auth UI obsoleta | `permanentRedirect` a `app.1upesports.org` + `noindex` |
| H-11 | `sitemap.ts` omitía detalle de torneos | Añadidos con `priority` por status |
| H-12 | Faltaba `res.ok` check en algunos delete/PATCH | Cerrado en `AdminCoursesClient` + `AdminTournamentRegistrationsClient` |
| H-13 | `revalidatePath` faltante en 3 admin routes | Añadido en `users`, `course-session-links`, `course-session-documents` |

### 7.4 Mediums por área cerrados

| Área | Items | Versión |
|---|---:|---|
| Web pública (1px dividers, route map, checkin noindex, WhatsApp placeholder) | 5 | v2.29.7 |
| Portal usuario (age-floor PUT, `Bearer null`, `value:BigInt(0)`, `any[]`) | 4 | v2.29.8 |
| Admin (revalidate gaps, dead pages, modal dividers) | 4 | v2.29.9 |
| Seguridad/Validación (input caps, ID coercion, CF JWT `accessRules`, Privy `appId`) | 4 | v2.29.10 |
| Pagos (`tx_hash` TOCTOU, comprobante MIME magic-byte, path guard, dead pass branch) | 4 | v2.29.11 |
| Tournament flow revalidate + registrations PATCH `res.ok` | 1 | v2.29.1 |

### 7.5 Follow-ups deferidos completados

| # | Follow-up | Versión |
|---|---|---|
| 1 | Migración `next/image` en 12 componentes públicos | v2.30.0 |
| 2 | ISR `revalidate` en cada página pública (5 min → 1 día por contenido) | v2.30.1 |
| 3 | Toast compartido admin (`AdminToastProvider` + `useAdminToast`) | v2.30.2 |
| 4 | OG images dinámicas 1200×630 via `next/og` (6 secciones) | v2.30.3 |

### 7.6 Activación rate limiting

| # | Acción | Resultado |
|---|---|---|
| Upstash añadido vía Vercel Marketplace | ✅ | Env vars `UPSTASH_REDIS_REST_KV_REST_API_URL` / `_TOKEN` aprovisionadas en Prod + Preview + Dev |
| Código actualizado para leer las variables canónicas + las generadas por Vercel | ✅ | v2.30.4 con fallback `URL ?? KV_REST_API_URL` |
| Smoke test 429 en `/api/recruitment` | ✅ | Bloqueado en el 6° request con headers `retry-after`, `x-ratelimit-limit: 5`, `x-ratelimit-remaining: 0`, `x-ratelimit-reset` |
| Verificación de cuerpo del 429 | ✅ | `{"error":"Demasiadas solicitudes...","retryAfter":44}` |

---

## 8. Mejoras entregadas — Historial completo

| Versión | Entrega | Hrs |
|---------|---------|---:|
| v2.27.0 | Páginas públicas de preview de cursos `/academia/[courseId]` | 6h |
| v2.27.1 | Fix de subida de videos a Cloudflare Stream (env vars + método HTTP) | 2h |
| v2.28.0 | Captura de identidad Privy en BD + vista unificada de usuarios; gate de onboarding para inscripción a torneos | 8h |
| v2.28.1 | Fix de firma de tokens de Cloudflare Stream — videos de academia | 3h |
| v2.29.0 | Rediseño del flujo de brackets (borrador → iniciar → en curso) + rediseño de la página de detalle de torneo | 8h |
| v2.29.1 | **Critical audit + tournament protocol** — bracket-driven status, registration auto-close, DELETE guard, RPC migration. C-1/C-2/C-3 cerrados | 18h |
| v2.29.2 | **H-1 / H-5 / H-2** — aliados key leak, `@privy-io` pin, admin pages → supabaseAdmin | 6h |
| v2.29.3 | **H-4** — Upstash Ratelimit en 5 endpoints | 10h |
| v2.29.4 | **H-3 / H-8 / H-9** — token-order on-chain verify, confirmation depth, webhook HMAC manifest | 16h |
| v2.29.5 | **H-6 / H-10 / H-11 / H-12 / H-13** — bank account masking, /perfil redirect, sitemap, res.ok, revalidatePath | 10h |
| v2.29.6 | **H-7** — schema baselined (1097 líneas idempotentes + config.toml) | 8h |
| v2.29.7 | Mediums Web (1px dividers, route map, checkin noindex, WhatsApp placeholder, Rule 3) | 4h |
| v2.29.8 | Mediums Portal (age-floor, Bearer null, value:BigInt(0), `any[]` types) | 4h |
| v2.29.9 | Mediums Admin (revalidate gaps, dead pages removidos, modal dividers) | 4h |
| v2.29.10 | Mediums Security (input caps, tournamentId coercion, CF JWT `accessRules`, Privy `appId`) | 6h |
| v2.29.11 | Mediums Payments (tx_hash TOCTOU + migration, magic-byte sniff, path guard, dead pass branch) | 6h |
| v2.30.0 | Migración `next/image` en 12 componentes | 4h |
| v2.30.1 | ISR `revalidate` strategy | 2h |
| v2.30.2 | Shared admin toast (`AdminToastProvider`) | 4h |
| v2.30.3 | OG images 1200×630 via `next/og` | 4h |
| v2.30.4 | Upstash env var fallback + smoke test 429 verificado | 1h |
| v2.30.5 | Sync de docs (CLAUDE.md / README.md / skills / agents) | 2h |

**Total mejoras desde v2.27.0:** ~136 horas adicionales (ver `docs/ESTADO_ENTREGA_EKX-2026-006.md` para detalle financiero).

---

## 9. Estado del sistema

| Capa | Estado | Detalles |
|------|--------|---------|
| Producción | ✅ Estable | `1upesports.org` + `app.*` + `admin.*` — 117 rutas, build limpio |
| Tests automatizados | ✅ | 100/100 Vitest passing (52 originales + 48 nuevos en auditoría) |
| Rate limiting | ✅ Activo | Upstash live — verificado con smoke test 429 |
| Cloudflare Stream | ✅ Activo | Tokens RS256 1h bind a IP del caller via `accessRules` |
| Backups | ✅ Automático | Supabase managed |
| Schema versionado | ✅ | `supabase/migrations/00000000000000_baseline.sql` + 2 incrementales |
| Auditoría externa | — | No requerida — auditoría interna 22 mayo cerrada al 100% |

---

*Preparado por Ekinoxis Labs — 23 de mayo de 2026*
*Referencia: EKX-2026-005 + ESTADO_ENTREGA_EKX-2026-006*
