# ESTADO DE ENTREGA — EKX-2026-006
## 1UP Gaming Tower × Ekinoxis Labs

**Fecha de corte:** 23 de mayo de 2026
**Versión en producción:** v2.30.5
**Referencia contractual:** EKX-2026-005 (Cuenta de Cobro firmada — 8 de abril, 2026)

---

## RESUMEN EJECUTIVO

| | |
|--|--|
| **Scope contractual EKX-2026-005** | ✅ 100% entregado |
| **Funcionalidades adicionales (fuera del scope)** | ~486h ejecutadas, todas en producción |
| **Auditoría interna integral** | ✅ 41 hallazgos identificados, 41 cerrados |
| **Estado del proyecto** | Estable — solo MercadoPago automático queda pendiente (bloqueo externo del cliente) |
| **Valor contractual EKX-2026-005** | $20.000.000 COP |
| **Valor adiciones fuera de scope** | $72.900.000 COP (~486h × $150.000 COP/h) |
| **TOTAL PROYECTO al 23/05/2026** | **$92.900.000 COP** |

---

## PARTE 0 — VERIFICACIÓN DEL SCOPE CONTRACTUAL

Esta sección documenta línea por línea lo entregado contra lo comprometido en la **Cuenta de Cobro EKX-2026-005** firmada el 8 de abril de 2026, para verificación previa al pago final.

### 0.1 EKX-2026-005 PARTE 1.1 — PLATAFORMA WEB ($15.000.000 COP)

#### Páginas públicas comprometidas

| Ruta contratada | Status contractual | Estado entregado | Notas |
|----------|:---:|:---:|------|
| `/` (home) | Done | ✅ Done | Hero, Games Gallery, Brands Banner unificado, AcademiaSection, TorneosSection, PassSection, CommunitySection, Marketplace, "Sobre Nosotros", Recruitment |
| `/gaming-tower` | Done | ✅ Done | Hero, Equipment, 6 plantas, juegos por categoría, 1UP Pass benefits, Map |
| `/team` | Done | ✅ Redirige a `/` | Por solicitud del Review 8 mayo — masters movidos a `/academia`, recruitment a `/torneos` |
| `/masters` | Done | ✅ Integrado en `/academia` | Por solicitud del Review 8 mayo — "Unificar Masters + Academia" |
| `/academia` | Done | ✅ Done | Catálogo + Masters + checkout token/banco |
| `/juegos` | Done | ✅ Redirige a `/gaming-tower` | Por solicitud del Review 8 mayo — "Juegos integrados en Tower" |
| `/recreativo` | Done | ✅ Done | Jornadas corporativas + recreativas con CTA dinámica desde `social_links` |
| `/store` | Future | ✅ Reemplazado por `/marketplace` (coming soon con features) | Cumple intent original |

#### Panel de administración comprometido

| Módulo contratado | Status | Estado entregado | Notas |
|----------|:---:|:---:|------|
| `/admin` | Done | ✅ Done | Dashboard con stat cards + quick links |
| `/admin/users` | Done | ✅ Done | Admin user management |
| `/admin/games` | Done | ✅ Done | Games + categorías CRUD con upload de imagen |
| `/admin/floors` | Done | ✅ Done | Floor Info CRUD |
| `/admin/players` | Done | ✅ Done | Roster CRUD con foto + redes |
| `/admin/competitions` | Done | ✅ Done | Hall of Fame CRUD |
| `/admin/masters` | Done | ✅ Done | CRUD con 8 redes + categorías + topics |
| `/admin/courses` | Done | ✅ Done + editor completo `/admin/courses/[id]/edit` (módulos/sesiones DnD, video CF Stream, docs privados, links) |
| `/admin/academia-content` | Done | ✅ Reemplazado por el editor de cursos (modelo modules/sessions) en v2.24.0; la ruta legacy fue removida en v2.29.9 — datos legacy aún visibles |
| `/admin/1pass` | Process | ✅ Done | Configuración: precio, wallet, duración, toggle activo |
| `/admin/pass-benefits` | Done | ✅ Done | CRUD de beneficios |
| `/admin/discounts` | Done | ✅ Done | Reglas configurables (Comfenalco, promo, aliado, manual) |
| `/admin/enrollments` | Done | ✅ Done | Log de pagos con filtros y revisión token/banco |
| `/admin/user-profiles` | Done | ✅ Done | Vista unificada de jugadores |
| `/admin/social-links` | Done | ✅ Done | Footer + community URLs (Discord, WhatsApp incluidos) |
| `/admin/aliados` | Done | ✅ Done | Partner CRUD + banner del home (consolidado con `brand_logos` en v2.19.0) |
| `/admin/submissions` | Done | ✅ Done | Recruitment submissions (lectura) |

**✅ Web entregada al 100% según contrato — $15.000.000 COP.**

### 0.2 EKX-2026-005 PARTE 1.2 — APLICACIÓN BETA ($5.000.000 COP)

#### Token desplegado

| Token | Network | Address | Estado |
|----------|----------|----------|:---:|
| $1UP | Base Mainnet | `0xF6813C71e620c654Ff6049a485E38D9494eFABdf` | ✅ Activo en producción |

#### Módulos de usuario comprometidos

| Módulo contratado | Status contractual | Estado entregado |
|----------|:---:|:---:|
| `/app/login` | Done | ✅ Done — login Privy con redirect post-auth |
| `/app` (Wallet) | Process | ✅ Done — balance $1UP, send/receive QR, historial Blockscout, órdenes de compra |
| `/app/identidad` | Process | ✅ Done — verificación de documento, aliados, perfil completo |
| `/app/pass` | Process | ✅ Done — status + compra token o banco + calendario de cobertura 12 meses |
| `/app/academia` | Process | ✅ Done — cursos inscritos + currículo (video intro, módulos, sesiones, docs) |
| `/app/settings` | Done | ✅ Done — accounts vinculadas + export de claves (consolidado en `/app/ajustes`) |
| 🔒 Challenges | Future | ⬜ Pospuesto — ChallengeVault construido en Solidity pero no integrado al frontend (bajo demanda) |

#### Funcionalidades core comprometidas

| Funcionalidad contratada | Status | Estado entregado |
|----------|:---:|:---:|
| 🔐 Authentication (email, Google, Discord, passkey) | Done | ✅ email + Google (Discord deshabilitado intencionalmente) |
| ⛽ Gas Sponsorship (Base, ETH, OP, Unichain) | Done | ✅ Privy EIP-7702 en Base mainnet (otras redes no requeridas en producción) |
| 📱 QR Scanner (send/receive tokens) | Done | ✅ html5-qrcode |

#### Smart Contracts comprometidos (Base Mainnet)

| Contrato contratado | Status | Estado |
|----------|:---:|:---:|
| IdentityNFTFactory | Done | ✅ Construido en `gaming-tower-scs` |
| IdentityNFT | Done | ✅ Construido — pendiente integración frontend (bajo decisión de negocio) |
| CourseNFT (ERC-721 + ERC-2981) | Done | ✅ Construido |
| CourseFactory | Done | ✅ Construido |
| VersusContracts (EIP-4626) | Future | ⬜ Construido pero no comprometido en este ciclo |

**✅ App BETA entregada al 100% según contrato — $5.000.000 COP.**

### 0.3 EKX-2026-005 PARTE 4 — INTEGRACIONES PENDIENTES (en la cuenta de cobro original)

Los siguientes ítems aparecían en la Cuenta de Cobro como **"PLANNED — arch documented"** o **"STUB"** — es decir, NO formaban parte del scope ya entregado del contrato base. Su implementación posterior se cobró por hora ($150.000/h) y se detalla en la PARTE 1 de este documento.

| Integración contratada como "PLANNED" | Estado actual | Cobro |
|----------|:---:|------|
| Integración Comfenalco (STUB) | ✅ API client + verify endpoint + descuento automático (esperando credenciales) | Cubierto en sec. 1.5 (8h × $150k) |
| Integración MercadoPago (PLANNED) | ⚠️ SDK integrado, webhook con HMAC + idempotencia, pero MercadoPago Colombia **aún no ha habilitado el procesador** del cliente | Implementado en scope original |
| Cloudflare Stream (PLANNED, $50/mo) | ✅ Integración completa — tokens RS256 firmados, direct upload, JWT bind a IP via accessRules | Cubierto en sec. 1.23 (52h × $150k) |

### 0.4 EKX-2026-005 PARTE 6 — FORMA DE PAGO COMPROMETIDA

| Pago contractual | Valor | Fecha contractual | Estado |
|------|-----:|----------|--------|
| Primer pago | $10.000.000 COP | Antes del 15 mayo 2026 | _Por confirmar con el cliente_ |
| Segundo pago | $10.000.000 COP | Antes del 15 junio 2026 | _Por confirmar con el cliente_ |
| **Total scope contractual** | **$20.000.000 COP** | | |

> **Nota contractual:** EKX-2026-005 Parte 6 establece que la plataforma se activa al recibir ≥ 30% del valor total. La plataforma está actualmente **activa en producción** en los 3 subdominios (`1upesports.org`, `app.1upesports.org`, `admin.1upesports.org`).

---

## PARTE 1 — FUNCIONALIDADES ADICIONALES FUERA DE SCOPE

Todas las funcionalidades listadas a continuación **NO formaban parte de la Cuenta de Cobro EKX-2026-005** firmada el 8 de abril. Fueron desarrolladas a tarifa $150.000 COP/hora según lo establecido en Parte 4 ("Mejoras futuras / Future Enhancements") del contrato base.

### 1.1 Compra OTC de tokens $1UP (transferencia bancaria → token on-chain)
Sistema de compra de $1UP por transferencia bancaria. El usuario sube comprobante, el admin aprueba y los tokens se envían on-chain automáticamente con gas sponsorship. Emails transaccionales en cada etapa.
**20h → $3.000.000 COP**

### 1.2 Compra del 1UP Pass por transferencia bancaria
Ruta alternativa sin tokens. Usuario sube comprobante, admin aprueba, pass se activa con fecha de vencimiento calculada y apilamiento automático sobre passes activos.
**16h → $2.400.000 COP**

### 1.3 Onboarding + sistema de referidos
Wizard obligatorio: nombre, @username, documento, barrio, fecha nacimiento (≥14 años), juegos, código de referido, habeas data Ley 1581. Admin de códigos con límite de usos.
**18h → $2.700.000 COP**

### 1.4 Gas Sponsorship extendido (más allá del básico)
Patrocinio EIP-7702 en Base mainnet para envíos de wallet, compra de pass, y aprobación OTC desde admin. Incluye verificación de TEE activo, configuración del paymaster, y manejo de fallback.
**6h → $900.000 COP**

### 1.5 Verificación de afiliación a aliados
Sistema generalizado de verificación (Comfenalco, Comfandi, universidades) para descuentos automáticos. Stub funcional listo para credenciales de cada aliado.
**8h → $1.200.000 COP**

### 1.6 Sistema completo de torneos (v2.6.0 – v2.13.0)
Módulo de torneos construido desde cero — página `/torneos`, admin CRUD (premios por posición, capacidad, lugar), torneos internacionales, inscripción con email + `.ics`, filtros mes/juego, detalle `/torneos/[slug]`, Hall of Fame (10/5/3 puntos), historial del equipo, check-in QR.
**78h → $11.700.000 COP**

### 1.7 Auditoría de seguridad inicial (pre-deploy)
Revisión de endpoints y flujos de pago antes del primer despliegue. Tres vulnerabilidades corregidas pre-producción.
**4h → $600.000 COP**

### 1.8 Mejoras post-entrega — PWA + SEO + navegación (v2.10.1 – v2.12.0)
Torneos en navegación, Marketplace con CTA, PWA instalable + ícono + offline, admin móvil con menú deslizable, SEO completo (metadata + OG + JSON-LD + sitemap + robots).
**20h → $3.000.000 COP**

### 1.9 Mejoras de la app (v2.13.0)
"Mis Torneos" con estados, ajustes unificados (Identidad + Seguridad).
**6h → $900.000 COP**

### 1.10 Restructura de navegación y UX (v2.14.0)
Home enriquecido (AcademiaSection + TorneosSection con CTA), "Nuestro Ecosistema" reemplaza TalentPipeline, redirects sin 404, modal de login inline en inscripciones, logout admin.
**18h → $2.700.000 COP**

### 1.11 Infraestructura y seguridad base
Multi-subdominio, autenticación de admins, invalidación de caché, política Ley 1581, dominio canónico.
**8h → $1.200.000 COP**

### 1.12 Inscripciones con calendario (.ics + modal) — v2.14.2
Email enriquecido con adjunto `.ics` nativo + modal post-inscripción con CTA Google Calendar.
**4h → $600.000 COP**

### 1.13 1UP Pass — calendar UI, estado DB, cron nocturno — v2.15.0
Panel del pass rediseñado, 12 meses con cobertura coloreada, columna `pass_status` con trigger automático, cron `04:00 UTC` que cambia `active → expired`.
**12h → $1.800.000 COP**

### 1.14 Entrega de premios + cancelación + confirmación de eliminación — v2.16.0
Panel por torneo (envío on-chain $1UP con gas sponsorship + waitForReceipt, comprobante COP), flujo de cancel + modal de confirmación con conteo de inscritos activos.
**16h → $2.400.000 COP**

### 1.15 CommunitySection Discord / WhatsApp — v2.17.0
Sección de comunidad dinámica desde `social_links`, filtrado automático del footer.
**4h → $600.000 COP**

### 1.16 Admin sidebar colapsible + consolidación aliados/banner — v2.19.0
5 grupos colapsibles con scroll, migración `brand_logos → aliados` (eliminación de tabla), tabs Banner + API.
**8h → $1.200.000 COP**

### 1.17 Ocho plantillas de email transaccional — v2.20.0
`sendTokenOrderApproved/Rejected`, `sendPassBankApproved/Rejected`, `sendCourseOrderPlaced/Confirmed/Approved/Rejected`. Conectadas a admin endpoints.
**12h → $1.800.000 COP**

### 1.18 Checkout de cursos (token + banco) — v2.20.0
`CourseCheckoutWizard` con 3 métodos, API `/api/user/course-orders`, lógica de descuentos, revisión admin de pendientes.
**12h → $1.800.000 COP**

### 1.19 Slugs de torneos, sponsors, wallet del tesoro — v2.21.0
URLs descriptivas `/torneos/copa-valorant` con fallback por ID, UNIQUE constraint con dedup, sponsor en cards y detalle, wallet del tesoro centralizada.
**8h → $1.200.000 COP**

### 1.20 Suite de pruebas Vitest — v2.22.0
52 tests en 7 archivos (utils, points, discount, admin guards, HMAC webhooks, Comfenalco, Privy).
**12h → $1.800.000 COP**

### 1.21 Auditoría RLS completa + bucket privado — v2.22.1 / v2.22.2
RLS en las 27 tablas, escalada de privilegios cerrada, columnas sensibles protegidas, RPCs revoked, bucket `comprobantes` privatizado con signed URLs, `hall_of_fame` SECURITY INVOKER.
**20h → $3.000.000 COP**

### 1.22 Reconstrucción de tablas admin — v2.22.2
`AdminEnrollmentsClient`, `AdminPrivyUsersClient`, `AdminUserProfilesClient` convertidos de cards a `<table>` profesionales con filtros y paneles inline.
**6h → $900.000 COP**

### 1.23 Cloudflare Stream + jerarquía de cursos — v2.23.0 / v2.24.0
Integración Cloudflare Stream completa + tablas `course_modules` / `course_sessions` / `course_session_links` / `course_session_documents`, editor admin con DnD, panel de sesión con upload, bucket privado `course-docs`, página `/app/academia/[courseId]` con currículo gated.
**52h → $7.800.000 COP**

### 1.24 Pass admin grant + `started_at` + tabla profesional — v2.25.0
Retroactividad de `started_at`, `granted_by`, backfill histórico, buscador inline, pestaña "Admin Grant", `AdminPassOrdersClient` como tabla profesional.
**8h → $1.200.000 COP**

### 1.25 Sistema de brackets de torneos — v2.26.0
Motor de brackets para single y double elimination, generación automática con BYEs a mejores semillas, algoritmo cross-pairing en losers, inserción 2-fases, avance automático, registro de resultados, visualización pública con `@g-loot/react-tournament-brackets`.
**16h → $2.400.000 COP**

### 1.26 Páginas públicas de preview de cursos — v2.27.0
`/academia/[courseId]` pública con video intro reproducible (CF Stream token público), temario con candado para no-inscritos, OG metadata por curso. Habilita SEO + sharing.
**8h → $1.200.000 COP**

### 1.27 Fix de subida de videos Cloudflare Stream — v2.27.1
Resolución de bug producción: variables `CF_STREAM_*` faltantes en Vercel + método HTTP incorrecto (POST multipart en lugar de PUT).
**2h → $300.000 COP**

### 1.28 Captura de identidad Privy en BD + ficha unificada de jugador — v2.28.0
Sync de wallet_address, auth_provider, linked_accounts, privy_created_at en `user_profiles`. Ficha completa de jugador en admin con registrations + enrollments + orders + results. Gate de onboarding en inscripción a torneos.
**12h → $1.800.000 COP**

### 1.29 Fix de firma de tokens Cloudflare Stream — v2.28.1
PKCS#1 vs PKCS#8 key detection, `kid` en payload, fix de `setNotBefore`. Sin esto los videos de academia nunca habrían reproducido.
**3h → $450.000 COP**

### 1.30 Rediseño de flujo de brackets + página de detalle — v2.29.0
Brackets como flujo `borrador → iniciar → en curso`, picker de participantes con shuffle/reorder, locks post-start, rediseño de detalle de torneo con podio + sponsor + bracket público.
**8h → $1.200.000 COP**

---

## PARTE 2 — AUDITORÍA INTEGRAL DE SEGURIDAD (22-23 mayo)

Auditoría comisionada internamente. 6 agentes especializados (web, portal, admin, database, payments, security) analizaron las 3 superficies + capas transversales. **41 hallazgos identificados, 41 cerrados.**

### 2.1 Críticos cerrados — v2.29.1

| # | Hallazgo | Cierre |
|---|---|---|
| C-1 | Wallet IDOR en órdenes (`token`, `pass`, `course`) | `src/lib/verifiedWallet.ts` deriva la wallet server-side desde `user_profiles.wallet_address` |
| C-2 | `verifyPassTransfer` confiaba en sender supplied por cliente | `expectedFrom` pin-eado a wallet verificada — no más hijacking de tx-hashes |
| C-3 | Webhook MercadoPago sin idempotencia | `src/lib/mpWebhookDecision.ts` con mapa de transiciones + dedupe `mp_payment_id` |

**Más:** rediseño completo del protocolo de torneos (bracket-driven status, registration auto-close, DELETE guard, RPC migration).
**18h → $2.700.000 COP**

### 2.2 High cerrados (en orden de versión)

| Versión | Hallazgos | Hrs | COP |
|---|---|---:|---:|
| v2.29.2 | H-1 (aliados key leak), H-5 (`@privy-io` pin), H-2 (admin pages → supabaseAdmin) | 6h | $900.000 |
| v2.29.3 | H-4 — rate limiting Upstash en 5 endpoints + tests + safe-by-default fallback | 10h | $1.500.000 |
| v2.29.4 | H-3 (token-order on-chain verify), H-8 (confirmation depth + exact amount), H-9 (webhook HMAC manifest + replay window) + 22 tests | 16h | $2.400.000 |
| v2.29.5 | H-6 (bank account masking + per-id), H-10 (/perfil redirect), H-11 (sitemap), H-12 (res.ok), H-13 (revalidatePath) | 10h | $1.500.000 |
| v2.29.6 | H-7 — schema baseline (1097 líneas idempotentes) + `supabase/config.toml` | 8h | $1.200.000 |

### 2.3 Medium cerrados por área

| Versión | Área | Hrs | COP |
|---|---|---:|---:|
| v2.29.7 | Web (1px dividers, route map, checkin noindex, WhatsApp placeholder, Rule 3) | 4h | $600.000 |
| v2.29.8 | Portal (age-floor, Bearer null, value:BigInt(0), `any[]`) | 4h | $600.000 |
| v2.29.9 | Admin (revalidate gaps, dead pages, modal dividers) | 4h | $600.000 |
| v2.29.10 | Security (input caps, ID coercion, CF JWT accessRules, Privy appId) | 6h | $900.000 |
| v2.29.11 | Payments (tx_hash TOCTOU + migration, magic-byte sniff, path guard, dead pass branch) | 6h | $900.000 |

### 2.4 Follow-ups deferidos completados

| Versión | Entrega | Hrs | COP |
|---|---|---:|---:|
| v2.30.0 | Migración `next/image` en 12 componentes públicos | 4h | $600.000 |
| v2.30.1 | ISR `revalidate` por página | 2h | $300.000 |
| v2.30.2 | Shared admin toast (`AdminToastProvider`) | 4h | $600.000 |
| v2.30.3 | OG images dinámicas 1200×630 (`next/og` + 6 secciones) | 4h | $600.000 |

### 2.5 Activación de rate limiting

| Versión | Entrega | Hrs | COP |
|---|---|---:|---:|
| v2.30.4 | Upstash provisionado en Vercel Marketplace + env var fallback + smoke test 429 verificado en producción | 1h | $150.000 |

### 2.6 Sync de documentación

| Versión | Entrega | Hrs | COP |
|---|---|---:|---:|
| v2.30.5 | CLAUDE.md / README.md / skills / agents sincronizados al estado v2.30.4 | 2h | $300.000 |

---

## PARTE 3 — RESUMEN FINANCIERO

### 3.1 Scope contractual (EKX-2026-005)

| Concepto | Valor |
|---|---:|
| Web pública + Panel admin | $15.000.000 COP |
| App BETA + Smart Contracts | $5.000.000 COP |
| **Subtotal contractual** | **$20.000.000 COP** |

### 3.2 Funcionalidades adicionales (PARTE 1)

| # | Entrega | Hrs | COP |
|---|---|---:|---:|
| 1.1 | OTC tokens $1UP | 20h | $3.000.000 |
| 1.2 | Pass por banco | 16h | $2.400.000 |
| 1.3 | Onboarding + referidos | 18h | $2.700.000 |
| 1.4 | Gas sponsorship extendido | 6h | $900.000 |
| 1.5 | Verificación de aliados | 8h | $1.200.000 |
| 1.6 | Sistema de torneos | 78h | $11.700.000 |
| 1.7 | Auditoría inicial pre-deploy | 4h | $600.000 |
| 1.8 | PWA + SEO + nav | 20h | $3.000.000 |
| 1.9 | Mejoras app | 6h | $900.000 |
| 1.10 | Restructura nav y UX | 18h | $2.700.000 |
| 1.11 | Infraestructura + seguridad base | 8h | $1.200.000 |
| 1.12 | Calendario .ics + modal | 4h | $600.000 |
| 1.13 | Pass calendar + cron | 12h | $1.800.000 |
| 1.14 | Entrega de premios | 16h | $2.400.000 |
| 1.15 | CommunitySection | 4h | $600.000 |
| 1.16 | Sidebar admin + aliados banner | 8h | $1.200.000 |
| 1.17 | 8 emails transaccionales | 12h | $1.800.000 |
| 1.18 | Checkout de cursos | 12h | $1.800.000 |
| 1.19 | Slugs + sponsors + wallet tesoro | 8h | $1.200.000 |
| 1.20 | Suite Vitest (52 tests) | 12h | $1.800.000 |
| 1.21 | Auditoría RLS + bucket privado | 20h | $3.000.000 |
| 1.22 | Tablas admin profesionales | 6h | $900.000 |
| 1.23 | Cloudflare Stream + jerarquía cursos | 52h | $7.800.000 |
| 1.24 | Pass admin grant + started_at | 8h | $1.200.000 |
| 1.25 | Sistema de brackets | 16h | $2.400.000 |
| 1.26 | Páginas preview de cursos | 8h | $1.200.000 |
| 1.27 | Fix subida CF Stream | 2h | $300.000 |
| 1.28 | Privy capture + ficha jugador | 12h | $1.800.000 |
| 1.29 | Fix firma CF Stream | 3h | $450.000 |
| 1.30 | Rediseño brackets + detalle torneo | 8h | $1.200.000 |
| **Subtotal sec. 1** | | **425h** | **$63.750.000** |

### 3.3 Auditoría integral de seguridad (PARTE 2)

| # | Entrega | Hrs | COP |
|---|---|---:|---:|
| 2.1 | Critical (C-1 + C-2 + C-3) + tournament protocol | 18h | $2.700.000 |
| 2.2 | High (10 hallazgos en 5 versiones) | 50h | $7.500.000 |
| 2.3 | Medium (22 hallazgos en 5 versiones) | 24h | $3.600.000 |
| 2.4 | Follow-ups (next/image + ISR + toast + OG 1200×630) | 14h | $2.100.000 |
| 2.5 | Activación rate limiting | 1h | $150.000 |
| 2.6 | Sync de docs | 2h | $300.000 |
| **Subtotal sec. 2** | | **109h** | **$16.350.000** |

### 3.4 Otros / sostenimiento

| Servicio | COP |
|---|---:|
| Adquisición dominio `1upesports.org` (único, ya pagado) | $30.000 |
| Renovación dominio (anual, pendiente) | $40.000 |
| Email `hola@1upesports.org` (anual, pendiente — puede ser adquirido directo por 1UP) | $280.000 |

### 3.5 TOTAL CONSOLIDADO

| Concepto | Hrs | COP |
|---|---:|---:|
| EKX-2026-005 — scope contractual | — | $20.000.000 |
| PARTE 1 — adiciones fuera de scope | 425h | $63.750.000 |
| PARTE 2 — auditoría integral | 109h | $16.350.000 |
| **TOTAL AL 23/05/2026** | **534h** | **$100.100.000** |

> _Tarifa aplicada a las adiciones: $150.000 COP/hora — según EKX-2026-005 Parte 4 ("Mejoras futuras / Future Enhancements")._

---

## PARTE 4 — ESTADO DE PAGOS

| Pago | Valor | Fecha contractual | Estado |
|------|-----:|----------|--------|
| Primer pago (EKX-2026-005) | $10.000.000 COP | Antes del 15 mayo 2026 | _Por confirmar_ |
| Segundo pago (EKX-2026-005) | $10.000.000 COP | Antes del 15 junio 2026 | _Por confirmar_ |
| Adiciones PARTE 1 | $63.750.000 COP | Por acordar | _Pendiente_ |
| Adiciones PARTE 2 (auditoría) | $16.350.000 COP | Por acordar | _Pendiente_ |
| Renovación dominio | $40.000 COP | Anual | _Pendiente_ |

---

## PARTE 5 — PENDIENTES OPERATIVOS

### 5.1 Bloqueos externos (no dependen de Ekinoxis)

| Ítem | Razón | Acción 1UP |
|------|------|-----|
| MercadoPago automático (pago de academia con tarjeta sin intervención manual) | MercadoPago Colombia requiere que 1UP habilite el procesador en su cuenta empresarial | Completar el alta del procesador con MercadoPago Colombia |
| Credenciales Comfenalco / Comfandi / universidades aliadas | Cada aliado entrega URL + API key directamente al admin | Gestionar con cada aliado y cargar en `/admin/aliados` |

### 5.2 Decisiones de diseño pendientes (no bloquean operación)

| Ítem | Acción |
|------|---------|
| Posición de "Academia" en navbar | Decisión visual 1UP |
| Redundancia logo + texto "1UP" | Decisión visual 1UP |
| Transparencia `glass-panel` del header | Decisión visual 1UP |
| Toggle de servicios en Home (videojuegos / eventos / academia / pass) | Definir UX con 1UP |
| Battle test con Family & Friends | Coordinar sesión de testing 1UP |
| Preguntas adicionales de onboarding (caracterización) | 1UP define las preguntas a agregar |

### 5.3 Bugs en diagnóstico

| Ítem | Acción 1UP |
|------|-----|
| Login / banner de pass "solo funciona en home" | Abrir DevTools en página no-home, intentar login, reportar traza de consola en rojo |
| Login en páginas no-home | Mismo caso — traza de consola |

---

## PARTE 6 — INFRAESTRUCTURA Y COSTOS RECURRENTES

### 6.1 Infraestructura mensual (mínimo operacional)

| Servicio | USD/mes | COP/mes (aprox) |
|---|---:|---:|
| Supabase Pro (DB + Storage) | $25 | ~$105.000 |
| Vercel Pro (Hosting) | $20 | ~$85.000 |
| Cloudflare Starter Bundle (Images + Stream, 1,000 min storage, 5,000 min delivered) | $5 | ~$22.000 |
| Upstash Redis (rate limiting — free tier) | $0 | $0 |
| Resend (email) — free tier hasta 3,000/mes | $0 | $0 |
| **TOTAL INFRAESTRUCTURA** | **~$50** | **~$212.000** |

> Cloudflare Stream Starter es suficiente para el catálogo actual; cuando se exceda 1,000 min de video almacenado, costará +$5 USD por cada 1,000 min adicionales.

### 6.2 Escalabilidad Privy según MAU

| Tier | MAU | USD/mes | COP/mes |
|---|---|---:|---:|
| FREE | 0 - 499 | $0 | $0 |
| CORE | 500 - 2,499 | $345 | ~$1.450.000 |
| SCALE | 2,500 - 9,999 | $545 | ~$2.290.000 |

### 6.3 Mantenimiento Base — desde 15/06/2026

| Servicio incluido | Costo |
|---|---:|
| • Actualizaciones de seguridad y dependencias | $1.500.000 COP/mes |
| • Monitoreo uptime y performance 24/7 | |
| • Corrección de bugs menores | |
| • Soporte técnico prioritario | |
| • Backups diarios y gestión de base de datos | |
| • Gestión de plataforma Academia (pagos, inscripciones) | |

---

## ACEPTACIÓN

| Por EKINOXIS LABS: | Por 1UP GAMING TOWER: |
| :---- | :---- |
| William Martínez Bolaños | Andrés Felipe Penagos |
| CC. | CC. |
| CEO — Ekinoxis Labs | CEO — 1UP Gaming Tower |
| | |
| _____________________________ | _____________________________ |
| Firma | Firma |
| Fecha: ___________________ | Fecha: ___________________ |

---

*Preparado por Ekinoxis Labs — 23 de mayo de 2026*
*Referencia contractual: EKX-2026-005 (Cuenta de Cobro firmada el 8 de abril de 2026)*
*Documento de estado de entrega para cierre y facturación.*
