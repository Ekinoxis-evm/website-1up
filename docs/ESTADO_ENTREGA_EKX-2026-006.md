# ESTADO DE ENTREGA — EKX-2026-006
## 1UP Gaming Tower × Ekinoxis Labs

**Fecha de corte:** 19 de mayo de 2026  
**Versión en producción:** v2.26.0  
**Referencia contractual:** EKX-2026-005

---

## RESUMEN EJECUTIVO

| | |
|--|--|
| **Scope original entregado** | 100% — todas las páginas y módulos del contrato EKX-2026-005 están funcionando en producción |
| **Funcionalidades adicionales** | ~350h de desarrollo fuera del scope original, implementadas y en producción |
| **Estado del proyecto** | Activo — una integración pendiente por gestión externa (MercadoPago automático) |
| **Cloudflare Stream** | ✅ Activo — videos de academia protegidos por JWT, cargados desde el admin, reproducción gated por inscripción |
| **Total facturado adiciones** | $52.500.000 COP (~350h × $150.000/h) |
| **Total proyecto** | **$72.500.000 COP** |

---

## 1. PLATAFORMA WEB — 1upesports.org

### 1.1 Páginas públicas — Estado actual

| Página | Contenido actual | Estado |
|--------|-----------------|--------|
| `/` — Inicio | Hero · Banner de marcas animado · 1UP Pass (beneficios) · Sección Academia · Sección Torneos · CommunitySection (Discord/WhatsApp) · Marketplace (coming soon) · "Sobre Nosotros" · Formulario de reclutamiento | ✅ |
| `/gaming-tower` | Hero · 1UP Pass (beneficios) · Equipamiento · 6 plantas · Juegos por categoría · Mapa | ✅ |
| `/torneos` | Hall of Fame leaderboard · Torneos nacionales (filtros por mes y juego) · Torneos internacionales · Formulario de reclutamiento | ✅ |
| `/torneos/[slug]` | Detalle de torneo: imagen, badges, podio de premios, strip de sponsor, REGISTRARME. Slug en URL; ID numérico como fallback para QR históricos | ✅ |
| `/torneos/[slug]/checkin` | Check-in por QR — login inline, valida inscripción, marca asistencia | ✅ |
| `/academia` | Catálogo de cursos · Perfiles de masters · CommunitySection · Checkout por token o banco | ✅ |
| `/recreativo` | Jornadas corporativas y recreativas | ✅ |
| `/privacidad` | Política de Privacidad — Ley 1581 | ✅ |
| `/team` | Redirige a `/` | ✅ |
| `/juegos` | Redirige a `/gaming-tower` | ✅ |
| `/perfil` | Redirige a `app.1upesports.org` | ✅ |

### 1.2 Características transversales

| Característica | Estado |
|---------------|--------|
| SEO completo — título, descripción, OG, Twitter Card, canonical | ✅ |
| Datos estructurados JSON-LD (Google rich results) | ✅ |
| Sitemap (`/sitemap.xml`) y robots.txt | ✅ |
| PWA — instalable en celular, ícono, modo offline | ✅ |
| Navegación móvil (MobileBottomNav) — 5 tabs | ✅ |
| TopAppBar glass-panel — nav principal en desktop | ✅ |
| Footer con redes sociales dinámicas desde admin | ✅ |

---

## 2. PANEL DE ADMINISTRACIÓN — admin.1upesports.org

### 2.1 Módulos del scope original

| Módulo | Función | Estado |
|--------|---------|--------|
| Dashboard | KPIs y accesos rápidos | ✅ |
| Juegos y Categorías | CRUD con imágenes | ✅ |
| Gaming Tower | 6 plantas + imágenes | ✅ |
| Equipo (Players) | Roster + fotos + redes sociales | ✅ |
| Competencias | Historial de torneos ganados | ✅ |
| Masters | Perfiles, categorías, redes, cursos asignados | ✅ |
| Cursos | CRUD de cursos + jerarquía Módulos/Sesiones + video CF Stream | ✅ |
| 1UP Pass — Config | Precio, wallet destino, duración, toggle activo/inactivo | ✅ |
| 1UP Pass — Beneficios | CRUD de beneficios del pass | ✅ |
| Descuentos | Reglas de descuento por afiliación o promo | ✅ |
| Enrollments | Registro de pagos de academia con filtros y revisión | ✅ |
| Perfiles de usuario | Vista de perfiles registrados con estados | ✅ |
| Redes sociales (footer) | URLs por plataforma | ✅ |
| Aliados | CRUD de partners + banner del home | ✅ |
| Submissions | Formularios de reclutamiento (lectura) | ✅ |
| Usuarios admin | Gestión de accesos al panel | ✅ |

### 2.2 Módulos adicionales (fuera del scope original)

| Módulo | Función | Estado |
|--------|---------|--------|
| Órdenes de tokens ($1UP) | Lista, aprobación, rechazo, envío on-chain con gas sponsorship | ✅ |
| Cuentas bancarias | CRUD de cuentas destino + wallet del tesoro | ✅ |
| Órdenes de Pass | Tabs token / banco / admin-grant · aprobación / rechazo · grant con fecha retroactiva | ✅ |
| Códigos de referido | CRUD con límite de usos | ✅ |
| Torneos nacionales | CRUD completo: imagen, juego, fecha, premios (1°/2°/3°), capacidad, estado, sponsor, slug | ✅ |
| Torneos internacionales | Organizador, país, ciudad, enlace externo | ✅ |
| Inscripciones a torneos | Lista de inscritos, marcar asistencia / no asistió | ✅ |
| Resultados + Entrega de premios | Asignar podio → genera Hall of Fame; entregar $1UP on-chain o COP con comprobante | ✅ |
| Imágenes del sitio | Equipamiento y ruta de aprendizaje | ✅ |
| Editor de cursos (jerarquía) | `/admin/courses/[id]/edit` — módulos, sesiones, DnD, video CF Stream, documentos privados | ✅ |
| Sistema de brackets | Generación automática del bracket desde inscritos, registro de resultados match a match, eliminación simple y doble, visualización pública en `/torneos/[slug]` | ✅ |

---

## 3. APLICACIÓN DE USUARIO — app.1upesports.org

| Módulo | Función | Estado |
|--------|---------|--------|
| Login | Email o Google (Privy); redirige al torneo u otra página post-auth | ✅ |
| Onboarding | Wizard: datos personales, documento, juegos, código referido, habeas data Ley 1581 | ✅ |
| Wallet | Balance $1UP, enviar (QR), recibir (QR), historial paginado, órdenes de compra | ✅ |
| Mis Torneos | Inscripciones del usuario con estado y acceso al detalle | ✅ |
| Beneficios | Verificación de afiliación a aliados para descuentos | ✅ |
| 1UP Pass | Estado (activo/expirado/sin pass) · calendario de cobertura · compra por token o banco | ✅ |
| Academia | Mis cursos inscritos + currículum por curso: video intro, módulos, sesiones, documentos | ✅ |
| Ajustes | Identidad (edición de perfil) + Seguridad (cuentas vinculadas) | ✅ |

---

## 4. FUNCIONALIDADES ADICIONALES — Detalle y Valoración

Todas las funcionalidades listadas a continuación fueron implementadas **fuera del scope del contrato EKX-2026-005** a tarifa de $150.000 COP/hora.

### 4.1 Compra de tokens $1UP (flujo OTC)
Sistema que permite al usuario comprar $1UP mediante transferencia bancaria. El administrador aprueba o rechaza la orden y al aprobar los tokens se envían on-chain automáticamente con gas sponsorship. Usuario y admin reciben emails en cada etapa.

**20h → $3.000.000 COP**

---

### 4.2 Compra del 1UP Pass por transferencia bancaria
Camino alternativo sin tokens. El usuario sube el comprobante, el admin aprueba y el pass se activa con fecha de vencimiento calculada y apilamiento automático sobre passes activos.

**16h → $2.400.000 COP**

---

### 4.3 Onboarding + Sistema de Referidos
Wizard obligatorio de primera vez: nombre completo, @username, documento (obligatorio), barrio, fecha de nacimiento (≥14 años), juegos favoritos, código de referido y aceptación habeas data Ley 1581. Gestión de códigos desde admin con límite de usos.

**18h → $2.700.000 COP**

---

### 4.4 Gas Sponsorship
Los usuarios envían tokens $1UP desde su wallet embebida sin pagar comisiones. Privy patrocina el gas en Base mainnet para envíos, compra de pass y aprobación OTC desde admin.

**6h → $900.000 COP**

---

### 4.5 Verificación de afiliación a aliados
Sistema de verificación de afiliación a organizaciones aliadas (Comfenalco, Comfandi, universidades) para descuentos automáticos en academia. Integración técnica activa al proveer credenciales de API.

**8h → $1.200.000 COP**

---

### 4.6 Sistema completo de torneos (v2.6.0 – v2.13.0)
Módulo de torneos construido desde cero.

| Funcionalidad | Detalle |
|---------------|---------|
| Página `/torneos` | Cards con imagen, fecha, juego, premios, estado |
| Admin CRUD nacional | Premios por posición (tokens o COP), capacidad, tipo de lugar |
| Torneos internacionales | Sección separada con enlace externo |
| Inscripción | Confirmación por email + sugerencia de calendario |
| Filtros | Por mes y juego |
| Detalle `/torneos/[id]` | Imagen, premios, descripción, CTA |
| Hall of Fame | Ranking automático por puntos (10/5/3) |
| Historial del equipo | Competencias externas del 1UP Team |
| Check-in por QR | Confirmación de asistencia sin salir del sitio |

**78h → $11.700.000 COP**

---

### 4.7 Auditoría de seguridad (v2.x)
Revisión completa de endpoints y flujos de pago. Se corrigieron tres vulnerabilidades antes del primer despliegue a producción.

**4h → $600.000 COP**

---

### 4.8 Mejoras post-entrega — PWA + SEO + navegación (v2.10.1 – v2.12.0)

| Entregable | Descripción |
|-----------|-------------|
| Torneos en navegación | Sección visible en menú principal y móvil |
| Marketplace (coming soon) | Presentación con features y CTA |
| PWA | Instalable como app, con ícono y modo offline |
| Admin móvil | Menú deslizable optimizado para teléfonos |
| SEO completo | Metadata, OG, JSON-LD, sitemap y robots |

**20h → $3.000.000 COP**

---

### 4.9 Mejoras de la app (v2.13.0)

| Entregable | Descripción |
|-----------|-------------|
| Mis Torneos | Inscripciones del usuario con estado y detalle |
| Ajustes unificados | Identidad y Seguridad en una sola página con pestañas |

**6h → $900.000 COP**

---

### 4.10 Restructura de navegación y UX (v2.14.0)

| Entregable | Descripción |
|-----------|-------------|
| Home enriquecido | AcademiaSection y TorneosSection con propuesta de valor y CTA |
| "Sobre Nosotros" | TalentPipeline → "Nuestro Ecosistema" (Recreativo · Academia · Torneos) |
| Juegos en Tower | `/juegos` → `/gaming-tower`; URL antigua redirige sin 404 |
| Reclutamiento en Torneos | Formulario al final de `/torneos` |
| Consolidación `/team` | Masters en `/academia`, reclutamiento en `/torneos`; redirige sin 404 |
| 1UP Pass en Tower | PassSection añadida a `/gaming-tower` |
| Fix inscripción torneos | Login modal inline, auto-registro, manejo de errores |
| Redes sociales en Marketplace | Íconos dinámicos desde BD |
| Tab PERFIL siempre visible | 5° tab del menú móvil independiente de autenticación |
| Logout admin sidebar | Botón de cierre de sesión en el panel |

**18h → $2.700.000 COP**

---

### 4.11 Infraestructura y seguridad base
Arquitectura multi-subdominio, sistema de autenticación de administradores, invalidación automática de caché, política de privacidad Ley 1581, configuración de dominio canónico.

**8h → $1.200.000 COP**

---

### 4.12 Inscripciones con calendario (.ics + modal) — v2.14.2
Email de confirmación de torneo enriquecido con adjunto `.ics` nativo (Gmail, Outlook, Apple Mail). Modal post-inscripción con CTA "AÑADIR A GOOGLE CALENDAR".

**4h → $600.000 COP**

---

### 4.13 1UP Pass — calendar UI, estado DB y cron nocturno — v2.15.0
Rediseño completo del panel de pass del usuario: calendario de 12 meses con cobertura coloreada por día, barra de estado (ACTIVO / EXPIRADO / SIN PASS) con días restantes y fecha exacta, CTA adaptativo (RENOVAR / REACTIVAR / ACTIVAR). Columna `pass_status` en `user_profiles` con trigger automático en cada INSERT/UPDATE de `pass_orders`. Cron job nocturno (04:00 UTC) que cambia `active → expired` para passes vencidos.

**12h → $1.800.000 COP**

---

### 4.14 Entrega de premios de torneos + cancelación + confirmación de eliminación — v2.16.0
Panel de entrega de premios por torneo: para cada podio el admin ve el premio configurado (tokens/COP/ambos), wallet del ganador, estado de entrega y botones de acción. Envío $1UP on-chain directo desde el admin (useSendTransaction + gas sponsorship) con espera de confirmación de bloque. Comprobante para premios en COP. Flujo de cancelación de torneo con bulk-update de inscripciones a `cancelled`. Modal de confirmación antes de eliminar con conteo de inscritos activos.

**16h → $2.400.000 COP**

---

### 4.15 CommunitySection Discord / WhatsApp — v2.17.0
Nueva sección "Únete a nuestra comunidad" en home y academia. Renders dinámico desde `social_links` filtrando `discord` y `whatsapp`. Gestionado desde el panel Admin → Redes Sociales existente. Filtrado automático del footer (no duplica en barra de íconos).

**4h → $600.000 COP**

---

### 4.16 Admin sidebar colapsible + consolidación aliados / banner — v2.19.0
Sidebar con 5 grupos colapsibles (Sitio Web, Competiciones, Academia, 1UP Pass & Tokens, Sistema). Scroll vertical completo. Consolidación de `brand_logos` en `aliados` (migración de datos, tabla eliminada): columnas `show_in_banner`, `website_url`, `sort_order`. Tab Banner y tab API en AdminAliadosClient. BrandsBanner ahora lee desde aliados.

**8h → $1.200.000 COP**

---

### 4.17 Ocho plantillas de email transaccional — v2.20.0
Diseño e implementación de 8 funciones de email en `src/lib/email.ts`:
- `sendTokenOrderApprovedEmail` / `sendTokenOrderRejectedEmail`
- `sendPassBankApprovedEmail` / `sendPassBankRejectedEmail`
- `sendCourseOrderPlacedEmail` / `sendCourseOrderConfirmedEmail`
- `sendCourseOrderApprovedEmail` / `sendCourseOrderRejectedEmail`

Conectadas a los endpoints de admin (token orders, pass orders, enrollments PATCH).

**12h → $1.800.000 COP**

---

### 4.18 Checkout de cursos (token + banco) — v2.20.0
`CourseCheckoutWizard`: modal de 3 métodos para inscripción a cursos (token on-chain · banco con comprobante). Lifecycle completo: método → send/upload → confirmar → success/error. API `POST /api/user/course-orders` con lógica de descuentos. Admin `PATCH /api/admin/enrollments` para revisión de pendientes token/banco.

**12h → $1.800.000 COP**

---

### 4.19 Slugs de torneos, sponsors y wallet del tesoro — v2.21.0
URLs descriptivas `/torneos/copa-valorant` con fallback por ID para QR históricos. UNIQUE constraint con dedup automático. Campos `sponsor_name`, `sponsor_website_url`, `sponsor_logo_url` por torneo. Strip de sponsor en cards y detalle. Wallet del tesoro (`pass_config.recipient_address`) centralizada en `/admin/bank-accounts` con copy y BaseScan.

**8h → $1.200.000 COP**

---

### 4.20 Suite de pruebas automatizadas Vitest — v2.22.0
52 tests en 7 archivos cubriendo: `formatCop`, `cn`, puntos por posición, selección de mejor descuento, guards `isEnvAdmin`/`isAdmin`, verificación HMAC-SHA256 de webhooks MercadoPago, errores de configuración de Comfenalco, y `verifyToken` de Privy (null, sin Bearer, válido, expirado). Extracción de `selectBestDiscount` para testabilidad independiente.

**12h → $1.800.000 COP**

---

### 4.21 Auditoría de seguridad completa RLS + bucket privado — v2.22.1 / v2.22.2
Habilitación de Row Level Security en las 27 tablas del schema público (16 estaban sin RLS). Cierre de escalación de privilegios en `admin_users`. Bloqueo de `user_profiles` contra lectura/escritura cruzada entre usuarios. Protección de `api_key` en `aliados`. RPC `register_for_tournament` y `sync_user_pass_status` revocados de PUBLIC. `search_path` hardened contra inyección. Bucket `comprobantes` convertido a privado con signed URLs de 1h generados en el servidor. `hall_of_fame` view cambiada de SECURITY DEFINER a SECURITY INVOKER con política estrecha.

**20h → $3.000.000 COP**

---

### 4.22 Reconstrucción de tablas admin — v2.22.2
`AdminEnrollmentsClient`, `AdminPrivyUsersClient` y `AdminUserProfilesClient` convertidas de cards con etiquetas por fila a tablas `<table>` con encabezados de columna, filtros independientes y paneles de acción inline.

**6h → $900.000 COP**

---

### 4.23 Cloudflare Stream + jerarquía de cursos (Módulos/Sesiones) — v2.23.0 / v2.24.0
Integración completa de Cloudflare Stream y arquitectura de contenido educativo avanzada:

| Funcionalidad | Detalle |
|---------------|---------|
| CF Stream básico (v2.23.0) | `stream_uid` en `academia_content`; signed JWT RS256 por inscripción; direct-upload desde admin |
| Jerarquía 3 niveles (v2.24.0) | Tablas `course_modules`, `course_sessions`, `course_session_links`, `course_session_documents` |
| Admin editor `/admin/courses/[id]/edit` | Tabs Información + Contenido; DnD reorder módulos/sesiones con `@dnd-kit` |
| Panel de sesión | Upload video CF Stream, descripción, duración, toggle publicado, links de soporte, documentos (bucket privado `course-docs` con ruta pending→final) |
| `/admin/courses/new` | Quick-create con redirección al editor |
| APIs admin | CRUD + reorder: módulos, sesiones, links, documentos; direct-upload URL de CF; multipart upload a `course-docs` |
| APIs usuario | `course-intro-token` (preview), `stream-token-v2` (sesión gated), `course-session` (datos + links + docs), `course-document` (signed URL 1h) |
| `/app/academia/[courseId]` | Página de currículum para usuarios inscritos: video intro, tabs por módulo, acordeón por sesión, reproductor CF Stream lazy, descarga de docs con signed URL |

**52h → $7.800.000 COP**

---

### 4.24 Pass admin grant, started_at, tabla de órdenes — v2.25.0
`started_at` en `pass_orders` (cuándo comienza el periodo del pass — soporta retroactividad). `granted_by` para admin grants. Backfill de registros históricos. Admin puede conceder el pass a cualquier usuario con fecha de inicio personalizada (incluso pasada, para membresías pre-plataforma), duración configurable, buscador inline de usuarios inscritos. Pestaña "Admin Grant" en órdenes. `AdminPassOrdersClient` convertido a tabla profesional con columnas Inicio y Vence. Fix de sincronización de beneficios con home page (`revalidatePath("/")`).

**8h → $1.200.000 COP**

---

### 4.25 Sistema de brackets de torneos — v2.26.0
Motor completo de gestión de brackets para torneos, con soporte para eliminación simple y doble.

| Funcionalidad | Detalle |
|---------------|---------|
| Generación automática | Toma los inscritos con estado `registered`/`attended` y genera el bracket completo con distribución de BYEs a las mejores semillas |
| Algoritmo double elimination | Winners bracket + Losers bracket (dropout y pure rounds alternados) + Grand Final — con cross-pairing correcto de perdedores de WR1 en LR1 |
| Inserción 2-fases | Fase 1: insertar todos los matches para obtener IDs seriales. Fase 2: batch-UPDATE de todos los punteros `next_match_id` / `next_loser_match_id` |
| Avance automático de BYEs | Los matches con BYE se resuelven automáticamente y el ganador avanza al siguiente match |
| Registro de resultados | Admin ingresa score por match; el sistema determina ganador, avanza ganador/perdedor, marca eliminados en losers/grand_final |
| Seguimiento de estado | draft → published → in_progress → completed (actualizado automáticamente al registrar resultados) |
| Visualización pública | Bracket visual en `/torneos/[slug]` — renderizado con `@g-loot/react-tournament-brackets`, solo aparece si el bracket existe y está publicado |
| Panel admin `/admin/tournament-brackets` | Selector de torneo, formulario de seed, tabla de matches agrupada por side/round, formulario de score inline |
| Reset | DELETE elimina bracket completo (CASCADE sobre participants y matches) |

**16h → $2.400.000 COP**

---

## 5. RESUMEN FINANCIERO

| Concepto | Horas | Valor |
|----------|-------|-------|
| EKX-2026-005 — Scope original | — | $20.000.000 COP |
| 4.1 Compra de tokens $1UP (OTC) | 20h | $3.000.000 COP |
| 4.2 Compra del 1UP Pass (banco) | 16h | $2.400.000 COP |
| 4.3 Onboarding + Sistema de Referidos | 18h | $2.700.000 COP |
| 4.4 Gas Sponsorship | 6h | $900.000 COP |
| 4.5 Verificación de aliados + descuentos | 8h | $1.200.000 COP |
| 4.6 Sistema de Torneos completo (incl. QR check-in) | 78h | $11.700.000 COP |
| 4.7 Auditoría de seguridad inicial | 4h | $600.000 COP |
| 4.8 Mejoras post-entrega (PWA + SEO + nav) | 20h | $3.000.000 COP |
| 4.9 Mejoras de la app (v2.13.0) | 6h | $900.000 COP |
| 4.10 Restructura de navegación y UX (v2.14.0) | 18h | $2.700.000 COP |
| 4.11 Infraestructura y seguridad base | 8h | $1.200.000 COP |
| 4.12 Inscripciones con calendario (.ics + modal) | 4h | $600.000 COP |
| 4.13 Pass calendar UI + estado DB + cron nocturno | 12h | $1.800.000 COP |
| 4.14 Entrega de premios + cancelación + confirmación de eliminación | 16h | $2.400.000 COP |
| 4.15 CommunitySection Discord / WhatsApp | 4h | $600.000 COP |
| 4.16 Admin sidebar colapsible + aliados banner | 8h | $1.200.000 COP |
| 4.17 Ocho plantillas de email transaccional | 12h | $1.800.000 COP |
| 4.18 Checkout de cursos (token + banco) | 12h | $1.800.000 COP |
| 4.19 Slugs, sponsors de torneos, wallet del tesoro | 8h | $1.200.000 COP |
| 4.20 Suite de pruebas Vitest (52 tests) | 12h | $1.800.000 COP |
| 4.21 Auditoría RLS completa + bucket privado + hall_of_fame | 20h | $3.000.000 COP |
| 4.22 Reconstrucción de tablas admin (3 componentes) | 6h | $900.000 COP |
| 4.23 Cloudflare Stream + jerarquía de cursos (módulos/sesiones) | 52h | $7.800.000 COP |
| 4.24 Pass admin grant, started_at, tabla de órdenes | 8h | $1.200.000 COP |
| 4.25 Sistema de brackets de torneos (double/single elimination) | 16h | $2.400.000 COP |
| **Total adiciones fuera del scope** | **~350h** | **$52.500.000 COP** |
| | | |
| **TOTAL PROYECTO** | | **$72.500.000 COP** |

> Tarifa adiciones: $150.000 COP/hora (según EKX-2026-005, Parte 4).

---

## 6. PENDIENTES

| Ítem | Razón del bloqueo | Acción requerida |
|------|------------------|-----------------|
| MercadoPago automático (cobro de academia sin intervención manual) | MercadoPago Colombia requiere que 1UP habilite el procesador directamente en su cuenta | 1UP debe completar el proceso de habilitación con MercadoPago Colombia |

> **Cloudflare Stream** — ✅ integración completa activa desde v2.23.0. Videos protegidos por JWT RS256, reproducción gated por inscripción aprobada, carga directa desde el panel admin.

---

*Preparado por Ekinoxis Labs — 19 de mayo de 2026*  
*Referencia contractual: EKX-2026-005*
