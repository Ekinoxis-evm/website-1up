# FICHA TÉCNICA DE PLATAFORMA TECNOLÓGICA
## 1UP Gaming Tower — Sistema de Gestión y Comunidad Esports

---

| | |
|---|---|
| **Documento** | Ficha Técnica de Plataforma Tecnológica |
| **Versión** | 2.29 |
| **Fecha de emisión** | Mayo de 2026 |
| **Última actualización** | 23 de junio de 2026 |
| **Versión en producción** | v2.54.1 |
| **Clasificación** | Público / Para presentación institucional |
| **Elaborado por** | Ekinoxis |
| **Revisado por** | Equipo técnico 1UP Gaming Tower |

---

## RESUMEN EJECUTIVO

**1UP Gaming Tower** es la plataforma tecnológica que soporta la operación del primer hub profesional de esports en Colombia. El sistema fue construido íntegramente por **Ekinoxis** como software a medida (sin CMS ni plantillas) y se encuentra en producción activa en `1upesports.org`.

La plataforma comprende tres frentes de cara al usuario — portal público, panel de usuario y consola de administración — todos servidos desde una única base de código en **Next.js 16** sobre infraestructura serverless de **Vercel**. La persistencia de datos corre en **Supabase (PostgreSQL)** con Row-Level Security habilitado y el **esquema completo versionado en el repositorio** (migración baseline de 1097 líneas idempotente + 3 migraciones incrementales). La autenticación es gestionada por **Privy** con verificación de `appId` y JWT firmado server-side. Los pagos se procesan a través de **MercadoPago** con verificación HMAC-SHA256 canónica (`id;request-id;ts`) + ventana ±10 min de freshness + idempotencia por `mp_payment_id`. Los endpoints abusables están protegidos por **Upstash Ratelimit** (live en producción desde 23/05/2026, verificado con smoke test 429). El streaming de video usa **Cloudflare Stream** con tokens RS256 atados al IP del caller via `accessRules`.

A partir de la **v2.31.0** (mayo 24, 2026) se completó la **suite de gestión de torneos**: avatares de usuario en todas las superficies (Hall of Fame, brackets, admin), **cockpit unificado** (`/admin/torneos/[slug]/manage`) que reemplaza tres páginas admin separadas, **vista TV de pantalla completa** (`/torneos/[slug]/tv`) con polling de 15s para casting en pantalla del venue, **entrega on-chain de premios** vía Privy gas-sponsored desde el panel, **algoritmo de seeding correcto** (mirror-recursive doubling), **round play-in** para single-elim con conteos no-pow2, y **bye-cascading** en double-elim que evita slots fantasma atorados en losers.

Entre **mayo y junio de 2026** (v2.41.0 → v2.54.1) se sumaron: **inscripción paga a torneos** ($1UP on-chain o transferencia bancaria), la **capa de pagos unificada** (token · transferencia · efectivo · tarjeta) operando idéntica sobre los cuatro servicios, con **tarjeta/Stripe desplegada en 1UP Pass, cursos, compra de $1UP e inscripción a torneos** (v2.52.0, detrás del flag `PAYMENTS_CARD_LIVE`), el **wizard de creación de torneos** de 5 pasos, **premios físicos + sponsor + categoría + cuenta bancaria** por torneo (v2.51.0), **pan/zoom del bracket** en móvil/TV/admin (v2.53.0), la **vista TV que sigue automáticamente el match en vivo** (v2.54.0) y un **fix de carrera de concurrencia en el cupo de inscripción** (v2.54.1). La suite de tests creció a **359 tests**.

Adicionalmente, la plataforma cuenta con una **capa blockchain construida y lista para integración**: contratos Solidity en Base (L2), Foundry, suite de tests completa. La capa no está activa en producción a la fecha por decisión presupuestal — representa capacidad técnica instalada disponible para activación.

---

## 1. IDENTIFICACIÓN DEL PROYECTO

| Campo | Detalle |
|-------|---------|
| **Nombre del proyecto** | 1UP Gaming Tower |
| **Nombre comercial** | 1UP Esports Hub |
| **URL de producción** | https://1upesports.org |
| **Naturaleza** | Plataforma web de gestión de comunidad esports, academia digital y ecosistema de economía tokenizada |
| **Alcance geográfico** | Colombia (expansión regional planificada) |
| **Desarrollador tecnológico** | Ekinoxis |
| **Estado** | Producción activa — auditoría integral de seguridad cerrada al 100% |
| **Repositorio** | Privado — organización Ekinoxis-evm |

---

## 2. DESCRIPCIÓN FUNCIONAL

1UP Gaming Tower es una plataforma tecnológica integral que soporta la operación del primer hub profesional de esports en Colombia. El sistema ofrece cuatro capas funcionales:

### 2.1 Portal público (`1upesports.org`)
Presentación institucional del hub: programas académicos, equipos profesionales, torneos, oferta recreativa y catálogo de juegos por piso. Incluye flujo completo de registro a torneos con confirmación por email y archivo `.ics` de calendario. Las páginas de detalle de torneo muestran el **bracket visual** (eliminación simple o doble) cuando existe uno publicado, renderizado en tiempo real con el estado actual de los matches. Cada curso de la Academia cuenta con una **página pública de preview** (`/academia/[courseId]`) con video de presentación reproducible (Cloudflare Stream con token firmado), información del master, precio, y temario completo con candados para no-inscritos.

Todas las páginas públicas usan **ISR (`revalidate`)** para servir desde edge cache cuando el contenido no ha cambiado, y las imágenes pasan por **`next/image`** con conversión automática a AVIF/WebP. Las imágenes de Open Graph (Twitter/LinkedIn/Discord cards) se generan dinámicamente a **1200×630** vía `next/og` por cada sección.

### 2.2 Panel de usuario (`app.1upesports.org`)
Espacio personal para miembros registrados: gestión de identidad digital, wallet de tokens $1UP, inscripción y seguimiento de torneos, adquisición del **1UP Pass** (membresía), historial de compras y ajustes de cuenta. Requiere autenticación Privy (email o Google).

### 2.3 Panel administrativo (`admin.1upesports.org`)
Consola de gestión interna: control de contenido, usuarios, inscripciones, pagos, órdenes OTC, gestión de torneos y resultados, configuración de pass, códigos de referido, brackets, logos de marca. Incluye el **editor de cursos por módulos y sesiones** (wizard de dos pestañas: Información + Contenido) con DnD para reordenar módulos y sesiones, upload directo a Cloudflare Stream y bucket privado para documentos. Incluye el **motor de brackets** completo (single + double elimination) con generación automática, registro de resultados y visualización en tiempo real. Sistema de notificaciones unificado vía `AdminToastProvider` (sin más `alert()` ni fallos silenciosos). Requiere Privy JWT + rol admin verificado.

### 2.4 Capa blockchain (`gaming-tower-scs` — construida, pendiente de integración)
Contratos Solidity en Base (L2 sobre Ethereum) que habilitarán: identidad on-chain renovable, retos competitivos con escrow tokenizado y certificación de cursos como NFT. La integración con el sitio web es **hoja de ruta técnica** — capa construida y testeada, activación bajo decisión de negocio.

---

## 3. ARQUITECTURA GENERAL DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                       CAPA DE PRESENTACIÓN                      │
│                                                                 │
│  1upesports.org     app.1upesports.org    admin.1upesports.org  │
│  (Portal público)   (Panel de usuario)   (Panel admin)         │
└──────────────────────────┬──────────────────────────────────────┘
                           │  subdomain routing vía proxy.ts
┌──────────────────────────▼──────────────────────────────────────┐
│                      CAPA DE APLICACIÓN                         │
│                                                                 │
│   Next.js 16 App Router — TypeScript 5 (strict)                 │
│   React Server Components + Client Components                   │
│   Next.js API Routes (REST) — sin servidor separado             │
│   ISR + next/image + next/og                                    │
│   Turbopack (dev) · Node.js 24 LTS (producción en Vercel)       │
└──────────┬──────────────┬────────────────┬──────────────────────┘
           │              │                │
┌──────────▼──┐  ┌────────▼───────┐  ┌────▼─────────────────────┐
│  Supabase   │  │     Privy      │  │  Servicios de terceros    │
│             │  │                │  │                           │
│ PostgreSQL  │  │ Auth (JWT)     │  │  MercadoPago (pagos)      │
│ + Storage   │  │ Embedded       │  │  Resend (email)           │
│ + RLS       │  │ Wallets (TEE)  │  │  Blockscout API v2        │
│ schema      │  │ EIP-7702 gas   │  │  Base L2 RPC              │
│ versionado  │  │ appId asserted │  │  Cloudflare Stream        │
│             │  │                │  │  Upstash Redis            │
│             │  │                │  │  (rate limit, live)       │
└─────────────┘  └────────────────┘  └──────────────────────────┘
                                               │
                           ┌───────────────────▼──────────────────┐
                           │  BASE L2 (Ethereum) — Capa blockchain │
                           │  Smart Contracts (Foundry / Solidity) │
                           │  IdentityNFT · CourseNFT              │
                           │  ChallengeVault · VaultFactory        │
                           │  [ CONSTRUIDA — pendiente integración ]│
                           └──────────────────────────────────────┘
```

**Principios de arquitectura:**
- **Sin servidor separado.** Toda la lógica de negocio reside en Next.js API Routes y Server Components ejecutados como funciones serverless en Vercel (Fluid Compute).
- **Subdomain routing.** Un único repositorio sirve los tres subdominios a través de `src/proxy.ts` (proxy nativo Next.js 16).
- **Seguridad por capas.** RLS en Supabase + verificación JWT + `isAdmin` + `appId` assertion + rate limiting Upstash + magic-byte sniffing en uploads + path namespace pinning + idempotency map en webhooks.
- **Sin estado en servidor.** Toda sesión viaja en el JWT de Privy.
- **Schema versionado.** El esquema completo del DB está en `supabase/migrations/00000000000000_baseline.sql` — la BD es reproducible desde el repo.
- **ISR + edge cache.** Páginas públicas se sirven desde edge con `revalidate` configurado por contenido (300s home, 60s torneos live, 3600s tower).

---

## 4. PREGUNTAS DE EVALUACIÓN TÉCNICA

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Cuál es el stack principal? | **Frontend:** Next.js 16 App Router + React 19 + TypeScript 5 (strict) + Tailwind CSS 3. **Backend:** Next.js API Routes (REST) sobre Node.js 24 — sin servidor separado. |
| 2 | ¿Framework o vanilla? | **Framework.** React 19 vía Next.js 16 App Router. Todo TypeScript con tipado estricto. |
| 3 | ¿Qué base de datos usa? | **PostgreSQL** gestionado por **Supabase** (us-east-1). Row-Level Security habilitado por tabla. **Schema completo versionado en el repo** (migración baseline idempotente). |
| 4 | ¿Dónde está hosteada? | Aplicación: **Vercel** (serverless + preview deploys). BD y archivos: **Supabase** (cloud managed). Rate limiting: **Upstash Redis** (Vercel Marketplace). |
| 5 | ¿CMS o custom code? | **100% custom code.** El panel admin es una consola propia en Next.js. |
| 6 | ¿Qué lenguaje backend usa? | **TypeScript + Node.js 24 LTS** (runtime Vercel Fluid Compute). |
| 7 | ¿APIs propias o de terceros? | **Ambas.** Next.js API Routes interna + integraciones: Privy, Supabase, MercadoPago, Resend, Blockscout v2, Base L2 RPC, **Cloudflare Stream**, **Upstash Redis**. |
| 8 | ¿Usa autenticación? ¿Cómo? | **Sí — Privy como IdP.** JWT Bearer verificado server-side. Email + Google. Tres niveles: público / usuario registrado / administrador. Adicionalmente se valida el claim `appId` para prevenir tokens cross-tenant. |
| 9 | ¿Es responsive? | **Sí — mobile-first.** Tailwind CSS v3 con breakpoints estándar. Bottom nav móvil; top bar / sidebar desktop. |
| 10 | ¿Hay tests automatizados? | App web: **Vitest activo — 359 tests** en `src/__tests__/lib/` (utils, discount, admin, privy, mercadopago, comfenalco, torneos, verifiedWallet, mpWebhookDecision, rateLimit, passVerifier, tokenTransferVerifier, **bracketSeeding, playInSeeding, podium, sniffAvatarMime**). Smart contracts: **suite completa con Foundry**. |
| 11 | ¿Schema versionado en el repo? | **Sí.** `supabase/migrations/00000000000000_baseline.sql` (1097 líneas, idempotente) + 3 migraciones incrementales (avatar_url, hall_of_fame view, audit closure) — toda la DB reproducible desde el código. |
| 12 | ¿Rate limiting? | **Sí — live en producción.** Upstash Ratelimit + sliding window. 5 endpoints protegidos (recruitment, course-intro-token, referral-validate, pass-orders, course-orders). Verificado con smoke test 429 el 23/05/2026. |

---

## 5. STACK TECNOLÓGICO

### 5.1 Frontend

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework principal | Next.js (App Router) | 16.2.x |
| Librería de interfaz | React | 19.0.x |
| Lenguaje | TypeScript | 5.x (strict mode) |
| Estilos | Tailwind CSS | 3.4.x |
| Bundler desarrollo | Turbopack | incluido en Next.js 16 |
| Imágenes | next/image | nativo Next.js 16 — AVIF/WebP automático |
| Open Graph dinámico | next/og | nativo Next.js 16 — 1200×630 por sección |
| Interacción blockchain | viem | 2.47.x |
| Generación de QR | qrcode.react | latest |
| Lectura de QR | html5-qrcode | latest |
| Visualización de brackets | @g-loot/react-tournament-brackets | 1.0.31-rc |

### 5.2 Backend / Capa de API

| Componente | Tecnología | Detalle |
|-----------|-----------|---------|
| Runtime | Node.js 24 LTS | Gestionado por Vercel (Fluid Compute) |
| Framework | Next.js API Routes | REST — sin servidor independiente |
| Lenguaje | TypeScript 5 | Strict mode |
| Cliente de base de datos | Supabase JS | v2.100.x |
| Autenticación server-side | @privy-io/server-auth | **1.32.5** (exact pin) — `appId` asserted en cada verify |
| Auth cliente | @privy-io/react-auth | **3.18.0** (exact pin) |
| Pagos | MercadoPago SDK | v2.12.x — manifiesto HMAC canónico `id;request-id;ts` + ventana ±10 min + dedupe `mp_payment_id` |
| Email transaccional | Resend SDK | v6.12.x |
| Video educativo | Cloudflare Stream | REST API + JWT RS256 (`jose`) atado al IP del caller via `accessRules` |
| Rate limiting | @upstash/ratelimit + @upstash/redis | **2.0.8 / 1.38.0** (exact pin) — sliding window, fallback safe-by-default |
| Subdomain routing | `src/proxy.ts` | Proxy nativo Next.js 16 |

> El backend no es un servidor independiente. Toda la lógica vive en API routes + Server Components ejecutados como funciones serverless en Vercel.

### 5.3 Base de datos y almacenamiento

| Componente | Proveedor | Detalles |
|-----------|---------|---------|
| Base de datos relacional | **Supabase (PostgreSQL)** | Managed cloud — us-east-1 |
| Schema versionado en repo | `supabase/migrations/` | Baseline 1097-líneas idempotente + 2 migraciones incrementales |
| Row-Level Security | Supabase | Habilitado en las 34 tablas del schema público |
| Storage — imágenes | `images` bucket | Público — fotos, portadas, logos. Máx 5 MB |
| Storage — comprobantes | `comprobantes` bucket | **Privado** — magic-byte sniffing (JPEG/PNG/WebP/PDF), path namespace pinning (caller `md5(privyUserId)[:8]`), signed URLs 1h |
| Storage — documentos de cursos | `course-docs` bucket | **Privado** — PDF/ZIP/DOCX/PPTX/XLSX/imágenes hasta 25 MB. Signed URLs 1h con verificación de inscripción |
| ORM / cliente | Supabase JS v2 | Sin Drizzle/Prisma — cliente nativo |
| Cache distribuida (rate limit) | Upstash Redis | Sliding window, env vars vía Vercel Marketplace |

### 5.4 Smart Contracts (capa blockchain — construida, pendiente de integración)

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Lenguaje | Solidity | 0.8.27 |
| Framework de desarrollo y tests | Foundry | latest stable |
| Librería de contratos base | OpenZeppelin | v5 |
| Red objetivo | Base L2 (Ethereum) | Mainnet 8453 · Sepolia testnet 84532 |

> Los contratos residen en `gaming-tower-scs` (repo separado). Construidos, testeados y disponibles para integración. Ver Sección 12.

---

## 6. INFRAESTRUCTURA Y HOSPEDAJE

### 6.1 Plataforma de despliegue

| Servicio | Proveedor | Rol | Estado |
|---------|---------|-----|--------|
| Alojamiento web | **Vercel** | Producción + preview deploys | Activo |
| Base de datos | **Supabase** | PostgreSQL managed + schema versionado | Activo |
| Almacenamiento de archivos | **Supabase Storage** | 3 buckets (images público, comprobantes privado, course-docs privado) | Activo |
| Correo transaccional | **Resend** | Confirmaciones y notificaciones | Activo |
| Auth y wallets | **Privy** | IdP + Embedded Wallets (TEE) | Activo |
| Pagos con tarjeta | **MercadoPago** | Pasarela Colombia | SDK activo (procesador del cliente pendiente de habilitación) |
| Indexación blockchain | **Blockscout API v2** | Historial de transacciones | Activo |
| Video educativo | **Cloudflare Stream** | Tokens RS256 atados a IP, direct upload | **Activo** |
| Rate limiting | **Upstash Redis** | Sliding window, Vercel Marketplace | **Activo** — live desde 23/05/2026 |
| Verificación afiliación | **Comfenalco API** | Validación de afiliados (descuentos) | Stub — esperando credenciales |

### 6.2 Dominios de producción

| URL | Propósito | Audiencia |
|-----|----------|----------|
| `https://1upesports.org` | Portal institucional público | Visitantes generales |
| `https://app.1upesports.org` | Panel personal de usuario | Miembros registrados |
| `https://admin.1upesports.org` | Consola de administración | Equipo operativo interno |

### 6.3 Pipeline de despliegue

| Evento | Acción automática | Resultado |
|--------|------------------|-----------|
| Push a rama `main` | Build + deploy en Vercel | Producción actualizada en ~60 segundos |
| Push a cualquier otra rama | Build + deploy en Vercel | Preview URL efímera |
| Build fallido | Deploy bloqueado | Producción no se afecta |
| Cambio de env var en Vercel | Sin auto-deploy — los env vars se materializan en el próximo build | (Por eso v2.30.4 fue el deploy que activó el rate limiting tras añadir Upstash) |

---

## 7. AUTENTICACIÓN Y CONTROL DE ACCESO

### 7.1 Mecanismo de autenticación

**Privy** como proveedor de identidad único. Tokens JWT firmados verificados server-side mediante `verifyToken()` en cada solicitud protegida.

| Aspecto | Implementación |
|---------|---------------|
| Protocolo | JWT Bearer Token (verificación server-side en cada request) |
| Proveedores | Correo electrónico, Google (OAuth) — Discord deshabilitado |
| Wallet embebida | Privy Embedded Wallet — TEE |
| Patrocinio de gas | EIP-7702 vía paymaster de Privy en Base Mainnet |
| Sesión | Sin estado en servidor — toda la sesión viaja en el JWT |
| **Validación `appId`** | Cada verify (`verifyToken` + `verifyCookieToken`) exige que `claims.appId === process.env.NEXT_PUBLIC_PRIVY_APP_ID` — defensa contra tokens cross-tenant aunque la firma valide |
| **Pin de versión** | `@privy-io/react-auth 3.18.0` y `@privy-io/server-auth 1.32.5` (sin `"latest"` — protección supply-chain) |

### 7.2 Niveles de acceso

| Nivel | Mecanismo | Acceso |
|-------|-----------|--------|
| **Público** | Sin autenticación | Portal informativo, precios, catálogo, torneos |
| **Usuario registrado** | JWT Privy + `appId` válido + onboarding completado | Panel personal, compras, academia, wallet, mis-torneos |
| **Administrador** | JWT válido + email verificado en lista de admins | Consola admin completa |

### 7.3 Seguridad de rutas de API

Toda ruta bajo `/api/admin/*` ejecuta obligatoriamente:
1. Verificación JWT con `verifyToken()` (Privy server-side) + assertion de `appId`.
2. Resolución de email con `resolveUserEmail()` (soporta Google OAuth con `claims.user.email` vacío).
3. Verificación de rol con `isAdmin()` (env var + tabla `admin_users`).
4. Acceso a BD exclusivamente con clave service role (bypassa RLS).

Las rutas `/api/user/*` solo ejecutan el paso 1.

---

## 8. API INTERNA — RESUMEN DE ENDPOINTS

### 8.1 Endpoints públicos (sin autenticación)

| Endpoint | Método | Propósito | Rate limit |
|----------|--------|-----------|------------|
| `/api/recruitment` | POST | Envío de formulario de reclutamiento | 5/min/IP |
| `/api/public/course-intro-token` | POST | Token CF Stream para preview público | 5/min/IP |
| `/api/user/pass-config` | GET | Precio, recipient, duración del Pass | — |
| `/api/user/referral-codes/validate` | GET | Validar código de referido | 30/min/IP |
| `/api/admin/tournaments` | GET | Torneos activos (consumido por torneos pública) | — |

### 8.2 Endpoints de usuario (requieren JWT)

| Endpoint | Métodos | Propósito | Rate limit |
|----------|---------|-----------|------------|
| `/api/user/profile` | GET, PUT | Perfil propio (PUT enforza min edad 14) | — |
| `/api/user/onboarding` | POST | Completar onboarding inicial | — |
| `/api/user/comfenalco/verify` | POST | Verificación afiliación Comfenalco | — |
| `/api/user/aliado/verify` | POST | Verificación afiliación aliado genérico | — |
| `/api/checkout` | POST | Crear preferencia MercadoPago + enrollment pending | — |
| `/api/user/upload-comprobante` | POST | Upload con magic-byte sniffing y namespace por usuario | — |
| `/api/user/token-orders` | GET, POST | Órdenes OTC propias | — |
| `/api/user/token-orders/cancel` | POST | Cancelar orden propia | — |
| `/api/bank-accounts` | GET | Cuentas bancarias — **lista enmascarada** (last 4) | 20/min/user |
| `/api/bank-accounts/[id]` | GET | Cuenta bancaria completa (post-selección) | 20/min/user |
| `/api/user/pass-orders` | GET, POST | Órdenes de pass propias / crear | 20/min/user (POST) |
| `/api/user/course-orders` | POST | Inscripción a curso (token o banco) | 20/min/user |
| `/api/user/tournament-registrations` | GET, POST, DELETE | Inscripciones a torneos (tournamentId coerced) | — |
| `/api/user/tournament-entry-orders` | GET, POST | v2.41.0 — pago de inscripción a torneo: $1UP verificado on-chain contra la **tesorería propia del torneo** (cupo asignado vía RPC al confirmar; sin tesorería configurada → 503) o transferencia bancaria con comprobante (queda `pending_bank` hasta aprobación admin). Notifica por email a usuario y admin en cada evento. Sin reembolsos automáticos | 20/min/user (POST) |
| `/api/user/tournament-checkin` | POST | Check-in QR en torneo live | — |
| `/api/user/stream-token` | POST | Token CF Stream (legacy `academia_content`) — IP bound | — |
| `/api/user/course-intro-token` | POST | Token CF Stream para video intro autenticado — IP bound | — |
| `/api/user/stream-token-v2` | POST | Token CF Stream para sesión gated — IP bound, enrollment required | — |
| `/api/user/course-session` | GET | Datos de sesión + links + metadata de docs | — |
| `/api/user/course-document` | GET | Signed URL 1h para descarga de doc — enrollment required | — |

### 8.3 Endpoints de administración (requieren JWT + isAdmin)

| Endpoint | Métodos | Propósito |
|----------|---------|-----------|
| `/api/admin/courses` | POST, PUT, DELETE | CRUD de cursos |
| `/api/admin/course-modules` | POST, PUT, DELETE | CRUD de módulos |
| `/api/admin/course-modules/reorder` | POST | Bulk reorder de módulos |
| `/api/admin/course-sessions` | POST, PUT, DELETE | CRUD de sesiones (acepta `pendingDocs[]`, `links[]`) |
| `/api/admin/course-sessions/reorder` | POST | Bulk reorder de sesiones |
| `/api/admin/course-session-links` | POST, PUT, DELETE | Links por sesión |
| `/api/admin/course-doc-upload` | POST | Subida multipart a `course-docs` (pending path) |
| `/api/admin/course-session-documents` | POST, DELETE | Insertar/eliminar docs (Storage + DB) |
| `/api/admin/stream-upload-url` | POST | URL de direct-upload CF Stream + UID |
| `/api/admin/masters` | POST, PUT, DELETE | CRUD de masters |
| `/api/admin/discounts` | POST, PUT, DELETE | CRUD de reglas de descuento |
| `/api/admin/aliados` | POST, PUT, DELETE | CRUD de aliados + banner |
| `/api/admin/social-links` | PUT | Actualizar links sociales del footer |
| `/api/admin/enrollments` | GET | Listado de inscripciones |
| `/api/admin/users` | GET, POST, DELETE | Admins de DB |
| `/api/admin/user-detail` | GET | Ficha completa de un perfil |
| `/api/admin/upload` | POST | Upload de imágenes |
| `/api/admin/token-orders` | GET, PATCH | Listado + aprobar/rechazar (con verificación on-chain) |
| `/api/admin/bank-accounts` | POST, PUT, DELETE | CRUD de cuentas bancarias |
| `/api/admin/pass-config` | GET, PUT | Configuración del 1UP Pass |
| `/api/admin/pass-orders` | GET, POST, PATCH | Listado + crear admin_grant + aprobar/rechazar |
| `/api/admin/referral-codes` | GET, POST, PUT | CRUD de códigos de referido |
| `/api/admin/tournaments` | GET, POST, PUT, DELETE | CRUD de torneos (status derivado del bracket) |
| `/api/admin/tournament-registrations` | GET, PATCH | Listado + cambio de estado |
| `/api/admin/tournament-entry-orders` | GET, PATCH | v2.41.0 — órdenes de pago de inscripción: listado con comprobantes firmados + aprobar (inscribe vía RPC; torneo lleno → 409 con instrucción de reembolso manual) / rechazar con motivo |
| `/api/admin/service-payment-methods` | GET, PATCH | v2.42.0 — lee/actualiza la matriz de métodos habilitados por servicio (`service_payment_methods`); `card` persiste pero queda oculto hasta `PAYMENTS_CARD_LIVE` |
| `/api/admin/payment-events` | POST, PATCH | v2.42.0 — registra un pago **en efectivo** contra una orden vía `apply_payment_event` (nota obligatoria) → fulfillment si `became_paid`; PATCH anula con un evento `cancelled` compensatorio |
| `/api/admin/treasury-wallets` | GET, POST, PUT, DELETE | v2.48.0 — CRUD de wallets de tesorería (`treasury_wallets`); valida label + address EVM |
| `/api/admin/tournament-results` | POST, DELETE | Upsert podio + delete |
| `/api/admin/tournament-results/deliver-pass` | POST | Emite un Pase 1UP **reclamable** al ganador (v2.39.0) — crea fila en `passes` (estado `issued`), idempotente |
| `/api/user/passes` | GET | Lista los pases del usuario (objeto `passes`) con estado |
| `/api/user/passes/activate` | POST | El usuario activa su pase `issued` (claim-later); la duración cuenta desde la activación |
| `/api/admin/passes/revoke` | POST | Admin revoca un pase entregado (v2.40.0) — `state='revoked'` + desvincula para re-entrega |
| `/api/admin/brackets` | GET, POST, PATCH, DELETE | Brackets — generación, start, result, undo |
| `/api/admin/international-tournaments` | GET, POST, PUT, DELETE | CRUD de torneos internacionales |

### 8.4 Webhooks entrantes

| Endpoint | Emisor | Seguridad |
|----------|--------|-----------|
| `/api/webhooks/mercadopago` | MercadoPago | Manifiesto canónico `id;request-id;ts` + verificación HMAC-SHA256 con `timingSafeEqual` + ventana de freshness ±10 min + idempotencia por `mp_payment_id` + transition guard |
| `/api/webhooks/stripe` | Stripe | v2.47.0 — verificación de firma **primero** (`constructStripeEvent`), luego registra el pago `card` vía `apply_payment_event` (idempotente: single-confirmed + `stripe_payment_intent_id` UNIQUE). **Inerte salvo `PAYMENTS_CARD_LIVE` + `STRIPE_WEBHOOK_SECRET`** |

---

## 9. MODELO DE DATOS — TABLAS PRINCIPALES

Base de datos PostgreSQL en Supabase. Tipado completo en `src/types/database.types.ts`. **Schema versionado** en `supabase/migrations/00000000000000_baseline.sql` (34 tablas, 67 constraints, 19 índices, 4 funciones, 5 triggers, 25 políticas RLS, 13 enums, 5 extensiones — toda la BD reproducible desde el repo).

| Tabla | Propósito |
|-------|-----------|
| `user_profiles` | Perfil completo + identidad Privy capturada (wallet_address, auth_provider, linked_accounts) |
| `courses` | Catálogo: precio (COP + $1UP), duración, instructor, cover, intro video (CF Stream UID) |
| `course_modules` | Módulos por curso — CASCADE con `courses` |
| `course_sessions` | Sesiones por módulo — `video_uid` CF Stream — CASCADE con `course_modules` |
| `course_session_links` | Links de apoyo por sesión — CASCADE |
| `course_session_documents` | Docs descargables — `storage_path` en bucket privado, magic-byte sniffed — CASCADE |
| `masters` | Instructores con redes (8 plataformas) |
| `enrollments` | Inscripciones — partial UNIQUE en `lower(tx_hash)` (no duplicación de transferencias on-chain) |
| `tournaments` | Torneos — status derivado del bracket (no editable directamente) + `entry_fee_tokens`/`entry_fee_cop` (null = gratuito, v2.41.0) + `treasury_address` (wallet EVM propia del torneo para el pago en $1UP — obligatoria si hay fee en $1UP, nunca reutiliza la tesorería del Pass, v2.41.0) |
| `tournament_entry_orders` | Pago de inscripción a torneo (v2.41.0, espejo de `pass_orders`) — partial UNIQUE en `lower(tx_hash)` + 1 orden en curso por usuario+torneo; `registration_id` se vincula al asignar el cupo; orden confirmada sin cupo = reembolso manual |
| `tournament_prizes` | Premios por posición 1-3 con CHECK de consistencia type/amount — soporta tokens/COP/ambos/**Pase 1UP** (`includes_pass` + `pass_days`, add-on o premio único) |
| `tournament_registrations` | Inscripciones — UNIQUE (tournament_id, user_profile_id), RPC `register_for_tournament` con check `status = 'upcoming'` |
| `tournament_results` | Podio (1-3) + entrega de premios (tx_hash, comprobante) + `pass_order_id` (Pase 1UP entregado, partial UNIQUE para idempotencia) |
| `brackets` | Bracket por torneo (UNIQUE per tournament): formato (single/double_elimination), status, conteos |
| `bracket_participants` | Participantes — UNIQUE (bracket, seed) + UNIQUE (bracket, user_profile_id) |
| `bracket_matches` | Matches — punteros next_match_id / next_loser_match_id (DE), source pointers |
| `hall_of_fame` (view) | SECURITY INVOKER — ranking por puntos |
| `pass_config` | Singleton (id=1) con CHECK |
| `pass_orders` | Órdenes de pass — partial UNIQUE en `lower(tx_hash)` + 1 pending por usuario + sponsor del admin grant |
| `passes` | Pase 1UP como objeto (v2.38.0) — `id` = futuro tokenId ERC-721, `state` (issued/active/expired/revoked), activación claim-later, columnas NFT nulas hasta minteo en Base. `pass_status` se deriva de aquí |
| `token_purchase_orders` | OTC orders — partial UNIQUE 1 pending por usuario |
| `bank_accounts` | Cuentas para pagos OTC — list response enmascarada |
| `discount_rules` | Trigger types, porcentaje, aplicación, aliado FK, vigencia |
| `aliados` | Partners + banner — columnas `api_key`/`api_url` con explicit column lists en lecturas anon |
| `referral_codes` | Códigos con max_uses + counter |
| `international_tournaments` | Torneos internacionales (sin registration ni capacidad) |
| `social_links` | Links del footer + community (Discord, WhatsApp) |
| `game_categories` / `games` / `floor_info` / `pass_benefits` / `recruitment_submissions` / `admin_users` / `site_content` / `academia_content` (DEPRECATED, read-only) |

---

## 10. INTEGRACIONES CON SERVICIOS EXTERNOS

| Servicio | Proveedor | Propósito | Estado |
|---------|---------|----------|--------|
| Pagos tarjeta | MercadoPago | Checkout + webhook HMAC canónico + idempotencia + replay window | SDK activo (procesador 1UP pendiente) |
| Autenticación e identidad | Privy | Login, embedded wallets, gas EIP-7702, `appId` asserted | **Activo** |
| Base de datos y archivos | Supabase | PostgreSQL + Storage + RLS + schema versionado | Activo |
| Correo transaccional | Resend | 8 plantillas + adjunto `.ics` | Activo |
| Historial blockchain | Blockscout API v2 | Transferencias del token $1UP | Activo |
| Nodo blockchain | Base RPC | Envío + consulta + verificación on-chain de admin approvals | Activo |
| Video educativo | Cloudflare Stream | Tokens RS256 atados a IP del caller via `accessRules` | **Activo** |
| Rate limiting | Upstash Redis | Sliding window, 5 endpoints | **Activo — live desde 23/05/2026** |
| Verificación afiliación | Comfenalco API | Descuentos automáticos | Pendiente credenciales |

---

## 11. PASARELA DE PAGOS Y FLUJO ECONÓMICO

### 11.1 Medios de pago

| Medio | Canal | Confirmación |
|-------|-------|--------------|
| Token $1UP (ERC-20) | Base L2 | Verificación on-chain — exact amount + ≥3 confirmaciones; sender pin-eado a wallet verificada |
| Transferencia bancaria (`wire`) | Manual + admin | Comprobante con magic-byte sniffing, namespace por uploader; aprobación admin |
| Efectivo (`cash`) | En persona + admin | Seleccionado por el usuario, aprobado por el admin con nota obligatoria (sin comprobante — el admin atestigua) — v2.43.0→v2.46.0 |
| Tarjeta / Apple Pay (`card`) | Stripe Checkout (hosted) | Webhook `checkout.session.completed` con verificación de firma; idempotente (`stripe_payment_intent_id` UNIQUE). Construido (v2.47.0), **gated por `PAYMENTS_CARD_LIVE`** |
| Tarjeta débito / crédito | MercadoPago | SDK presente pero **inactivo** — webhook canónico `id;request-id;ts` HMAC-SHA256 + ventana ±10 min + dedupe `mp_payment_id` |

### 11.1.1 Capa de pagos unificada (v2.42.0 → v2.52.0)

A partir de la **v2.42.0** la plataforma cuenta con una **capa de pagos unificada**: un único conjunto de métodos seleccionable por el admin — **`token` (·$1UP on-chain) · `wire` (transferencia) · `cash` (efectivo) · `card` (Stripe)** — que opera de forma idéntica sobre **los cuatro servicios de pago** (inscripción a torneo, cursos de academia, compra de $1UP y 1UP Pass).

| Componente | Detalle |
|-----------|---------|
| **Ledger `payment_events`** | Una fila por pago, ligada polimórficamente a cualquier orden vía `(order_kind, order_id)`. CHECK: COP **xor** tokens; `cash` exige `recorded_by_admin` + `reason`. UNIQUE global `lower(tx_hash)` (replay cross-kind) + UNIQUE `stripe_payment_intent_id`. |
| **RPC `apply_payment_event()`** | Cornerstone atómico — serializa callers concurrentes sobre la misma orden vía advisory lock transaccional, impone el invariante v1 single-confirmed (≤1 evento confirmado por orden) y retorna `became_paid` **true para exactamente un caller** (el fulfillment dispara sólo si `became_paid`). |
| **Config `service_payment_methods`** | Matriz por servicio de métodos habilitados, editable desde la página admin **Métodos de Pago**. `card` permanece oculto al usuario hasta `PAYMENTS_CARD_LIVE`. |
| **Flujo efectivo** | El usuario elige "Efectivo", la orden queda en revisión y el admin la aprueba con una nota obligatoria → el pago se registra en el ledger → se otorga el servicio. |
| **Flujo tarjeta (Stripe)** | Construido end-to-end (`/api/webhooks/stripe`, firma verificada primero); 4 Productos de catálogo creados en la cuenta Stripe. Inerte hasta fijar las claves + `PAYMENTS_CARD_LIVE`. |
| **Endurecimiento RLS** | Se habilitó RLS (deny-all) sobre 4 tablas expuestas — `payment_events`, `service_payment_methods`, `tournament_entry_orders` y `passes` — aplicado en vivo (v2.43.0). Ninguna tabla del schema público queda con RLS deshabilitado. |

### 11.1.2 Reorganización del panel admin (v2.48.0 → v2.51.0)

- **Cuentas y Tesorerías** — nueva tabla `treasury_wallets` (wallets de destino on-chain administradas: label, address EVM, chain_id default 8453/Base, is_active; RLS deny-all). La página de cuentas bancarias se relabeló y movió al grupo **Sistema**, y aloja tanto las cuentas bancarias como las wallets de tesorería. La tesorería por torneo y la del Pass son ahora **dropdowns** que eligen de esa lista (sin pegar direcciones).
- **1UP Pass** — `/admin/1pass` = Configuración + tabla de pases activos; `/admin/pass-orders` = sólo órdenes; **Beneficios Pass** movido al grupo **Sitio Web**.
- **Wizard de creación de torneos (5 pasos)** — `/admin/torneos` reemplaza el quick-create por-nombre con un wizard guiado (Básico → Inscripción → Premios → Presentación → Revisar y crear); las filas del directorio muestran nombre prominente + pill de estado + fecha.

### 11.2 Token $1UP

| Campo | Detalle |
|-------|---------|
| Nombre | 1UP Token |
| Estándar | ERC-20 |
| Red | Base Mainnet (chain ID 8453) |
| Dirección del contrato | `0xF6813C71e620c654Ff6049a485E38D9494eFABdf` |
| Equivalencia | 1 $1UP = 1.000 COP (convención de plataforma) |
| Explorer | https://basescan.org/token/0xF6813C71e620c654Ff6049a485E38D9494eFABdf |

### 11.3 Reglas de seguridad

- Precios nunca en frontend — siempre desde BD al momento del checkout.
- Descuentos calculados exclusivamente server-side.
- Wallet del destinatario de órdenes derivada server-side de `user_profiles.wallet_address` (audit C-1).
- `verifyPassTransfer` y `verifyTokenTransfer` requieren igualdad exacta + 3 confirmaciones (audit H-8).
- Webhook MP rechaza firmas stale (`ts` fuera de ±10 min), fails closed cuando `MERCADOPAGO_WEBHOOK_SECRET` está unset en cualquier entorno (audit H-9).
- Idempotencia: el webhook nunca regresa un enrollment terminal a `pending`; entradas duplicadas con el mismo `mp_payment_id` son no-op (audit C-3).
- Estados estrictos: `pending → approved | rejected | cancelled`. Registros nunca se eliminan.
- Precios de token congelados en la orden (`exchange_rate_cop`) al momento de compra.
- Unique constraints en `lower(tx_hash)` sobre `pass_orders` y `enrollments` cierran TOCTOU race (audit M-A5.1).

---

## 12. CAPA BLOCKCHAIN — CONTRATOS INTELIGENTES

### 12.1 Estado actual

Los contratos residen en `gaming-tower-scs` (repo separado). Escritos en Solidity, desarrollados con Foundry, cubiertos por suite de tests completa. Las tres *factories* (`IdentityNFTFactory`, `VaultFactory`, `CourseFactory`) están **desplegadas y verificables en Base Mainnet** desde febrero de 2026 — direcciones en `deployments/addresses.json` del repo. La **app on-chain nativa** (`gaming-tower-fe`) ya las integra; el website de producción aún no (decisión presupuestal).

**Su integración con el sitio web no está activa en producción a la fecha por decisión presupuestal.** Capacidad técnica instalada — activación requiere implementación del frontend (esfuerzo bajo dado que `viem` ya está presente).

### 12.2 Contratos principales

| Contrato | Estándar | Descripción | Pago |
|---------|---------|-------------|------|
| `IdentityNFTFactory` | — | Fábrica de colecciones por ciudad | — |
| `IdentityNFT` | ERC-1155 | Tarjeta de suscripción renovable | ERC-20 (1UP, USDC, EURC) |
| `ChallengeVault` | EIP-4626 | Escrow para retos 2-jugadores | ERC-20 lista blanca |
| `VaultFactory` | — | Despliega ChallengeVaults — requiere IdentityNFT activo | — |
| `CourseNFT` | ERC-721 + ERC-2981 | NFT de curso + contenido gate + regalías reventa | ETH |
| `CourseFactory` | — | Despliega CourseNFTs | — |

### 12.3 Redes de despliegue

| Red | Chain ID | RPC | Explorer |
|-----|---------|-----|---------|
| Base Mainnet | 8453 | https://mainnet.base.org | https://basescan.org |
| Base Sepolia (testnet) | 84532 | https://sepolia.base.org | https://sepolia.basescan.org |

### 12.4 Prácticas de seguridad

- `ReentrancyGuard` en pago, `Pausable` en mint/renew/factory, `SafeERC20`, errores personalizados, soulbound opcional.
- Acceso restringido al propietario para `deployCollection()`.

> **Auditoría externa:** no realizada. Recomendada antes de escalar volumen on-chain.

---

## 13. DISEÑO Y EXPERIENCIA DE USUARIO

### 13.1 Diseño responsive

| Aspecto | Implementación |
|---------|---------------|
| Estrategia | Mobile-first — Tailwind CSS |
| Nav móvil portal | `MobileBottomNav` fija |
| Nav móvil app | `AppBottomNav` fija |
| Nav desktop portal | `TopAppBar` con `glass-panel` |
| Nav desktop app | `AppSidebar` colapsable |
| Imágenes | **`next/image`** en 12 componentes públicos — AVIF/WebP automático + lazy load + responsive srcset |
| OG cards | **`next/og`** dinámicas 1200×630 por sección |

### 13.2 Sistema de diseño (reglas no negociables)

| Regla | Especificación |
|-------|---------------|
| Border radius | 0px (excepto `rounded-full` para avatares/pills) |
| Separación de secciones | Por cambio de color de fondo — sin bordes 1px |
| Componentes públicos | Tailwind puro — sin shadcn/ui |
| Patrón skew | Exterior `skew-fix` / interior `block skew-content` |
| Barra de navegación | Siempre `glass-panel` |
| Admin failure UX | `AdminToastProvider` + `useAdminToast()` — sin `alert()` ni fallos silenciosos |

---

## 14. PRUEBAS Y CONTROL DE CALIDAD

### 14.1 Aplicación web

| Tipo | Herramienta | Estado |
|------|-----------|--------|
| Tipado estático | TypeScript 5 (strict) | Activo — cero errores requerido |
| Linting | ESLint | Activo |
| Build verification | `next build` | Antes de cada entrega |
| Tests unitarios / integración | **Vitest — 359 tests** | utils, tournamentPoints, discount, admin, mercadopago, comfenalco, privy, verifiedWallet, mpWebhookDecision, rateLimit, passVerifier, tokenTransferVerifier, **bracketSeeding, playInSeeding, podium, sniffAvatarMime** |
| Tests E2E | Playwright | Pendiente |
| QA manual | Checklist por release | Activo |

### 14.2 Smart Contracts

| Tipo | Herramienta | Estado |
|------|-----------|--------|
| Tests unitarios y de integración | Forge (Foundry) | Activo |
| Reporte de cobertura | `forge coverage` | Disponible |
| Reporte de gas | `forge test --gas-report` | Disponible |
| Auditoría externa | — | Pendiente |

### 14.3 Flujo de QA pre-release

```
[ ] npm run test:run      — cero tests fallidos (359 tests)
[ ] npm run build         — cero errores
[ ] npx tsc --noEmit      — cero errores TypeScript
[ ] npm run lint          — cero advertencias
[ ] Smoke test manual:
      ✓ Home + Torneos cargan con caché edge
      ✓ Registro completo (onboarding + foto de perfil)
      ✓ Inscripción torneo + email + .ics
      ✓ Admin cockpit → 4 tabs funcionan, click-to-swap en bracket draft
      ✓ Bracket en vivo escribe ganadores, auto-podium en match final
      ✓ Vista TV /torneos/[slug]/tv refresca cada 15 s
      ✓ Rate limit responde 429 tras 5 reqs
      ✓ Páginas públicas reflejan cambios tras mutación admin
```

---

## 15. SEGURIDAD DE LA PLATAFORMA

### 15.1 Capas de defensa

| Capa | Mecanismo | Descripción |
|------|-----------|-------------|
| **Autenticación** | Privy JWT + `appId` claim | Token firmado + assertion contra `NEXT_PUBLIC_PRIVY_APP_ID` (audit M-A6.4) |
| **Autorización** | `isAdmin()` | Email verificado contra env + tabla DB |
| **Base de datos** | Supabase RLS | RLS habilitado en las 34 tablas |
| **Rutas API** | Service role isolation | Admin routes con `supabaseAdmin` (bypassa RLS), user routes con anon |
| **Pagos webhook** | HMAC-SHA256 canónico | Manifiesto `id;request-id;ts` + replay window + fail-closed (audit H-9) |
| **Pagos on-chain** | Server-side verify | Exact amount + ≥3 confirmaciones + sender pin-eado (audit C-1, C-2, H-3, H-8) |
| **Idempotencia webhook** | Transition map + dedupe | `mp_payment_id` (audit C-3) |
| **Rate limiting** | Upstash sliding window | 5 endpoints — live en producción |
| **Uploads** | Magic-byte sniffing + path namespace | Comprobantes (audit M-A5.2, M-A5.3) |
| **Stream tokens** | CF `accessRules` | JWT atado al IP del caller (audit M-A6.3) |
| **Input validation** | Length caps + regex | Recruitment + tournamentId coercion (audit M-A6.1, M-A6.2) |
| **Bank accounts** | Masked list + per-id rate-limited | Last 4 dígitos en list, completo solo en detail (audit H-6) |
| **Secretos** | Vercel Env Vars | Cero en repo, `.env.local` gitignored |
| **Wallet** | TEE (Privy) | Claves privadas nunca salen del TEE |
| **Gas** | EIP-7702 paymaster | Sponsoring de Privy en Base |
| **Dependencias** | Exact-pin | `@privy-io/*`, `@upstash/*` pinned (audit H-5) |

### 15.1.1 Tournament Management Overhaul — 23-24 de mayo de 2026 (v2.31.0 → v2.36.15)

Tras la auditoría de seguridad, se ejecutó una segunda iteración que dejó la suite de gestión de torneos lista para operación en vivo:

| Pieza | Versión | Detalle |
|---|---|---|
| Avatares de usuario | v2.31.0 / v2.31.1 | Upload en `users/{user_profile_id}/avatar`, magic-byte sniffed. Surfaceado en Hall of Fame, brackets, top app bar, listas admin. Paso opcional en wizard de onboarding. |
| Auto-podio desde bracket | v2.32.0 | `derivePodium(format, matches, participants)` corre cuando el último match completa; respeta overrides manuales (insert-only, never overwrite). |
| Cockpit unificado | v2.33.0 – v2.34.0 | `/admin/torneos/[slug]/manage` con 4 tabs (Info / Inscripciones / Bracket / Premios) reemplaza tres páginas admin separadas. Persistencia de tab en URL hash. |
| Consolidación + entrega on-chain | v2.36.0 – v2.36.3 | Editor de info inline, envío Privy gas-sponsored ($1UP via `useSendTransaction` + `value: BigInt(0)` + `sponsor: true`), share-button. Standalone pages eliminadas. |
| Vista TV | v2.35.0 | `(bare)` route group para `/torneos/[slug]/tv`. Bracket escalado, polling 15s, sponsor strip. |
| Cierre de auditoría DB | v2.36.4 | 4 hallazgos de `get_advisors` cerrados: `hall_of_fame` → `security_invoker`, `set_updated_at` search_path pinned, `report_match_result` dropped, RLS `(SELECT …)` wrap. |
| Algoritmo de seeding correcto | v2.36.10 | Reemplazo del `buildPairings` alternating-step (que sobrescribía seed 1 y dejaba slot 16=0) con mirror-recursive doubling. 45 tests pinning regression. |
| Play-in round (single-elim) | v2.36.13 | Para N no-pow2: pre-round con `excess` matches + bracket principal de `prevPow2`. R1 visualmente "completo", ningún jugador salta más de 1 ronda. 33 tests adicionales. |
| Bye-cascading (double-elim) | v2.36.14 | Slots LB cuyos feeders WB son BYE se marcan `p_source='bye'` (fantasma). `cascadeLbAdvance()` propaga al runtime — non-pow2 DE no se atora más. |
| Roster attended-only + click-to-swap | v2.36.15 | Roster pre-marca solo `attended`. Admin puede intercambiar dos slots del draft con dos clics antes de iniciar. |

**Total piezas:** 13 PRs · 15 versiones · 134 archivos modificados · +5,800 / −1,100 líneas netas.

### 15.2 Auditoría integral de seguridad — 22-23 de mayo de 2026 ✅ CERRADA

Auditoría comisionada internamente sobre las 6 áreas + capas transversales. **41 hallazgos identificados, 41 cerrados.**

| Severidad | Total | Cerrados | Versión |
|---|---:|---:|---|
| 🔴 Critical | 3 | 3 ✅ | v2.29.1 |
| 🟠 High | 13 | 13 ✅ | v2.29.2 → v2.29.6 |
| 🟡 Medium | 22 | 22 ✅ | v2.29.7 → v2.29.11 |
| Follow-ups | 4 | 4 ✅ | v2.30.0 → v2.30.3 |
| Activación rate-limit | 1 | 1 ✅ | v2.30.4 |

Detalle completo en `docs/SEGUIMIENTO-FEEDBACK.md` § 7 y en `AUDIT.md` (raíz del repo).

### 15.3 Estado final del advisor de Supabase

Tras la auditoría: **0 errores, 0 advertencias** nuevas. Solo el aviso informativo pre-existente `rls_enabled_no_policy` en tablas de acceso exclusivo por service role (comportamiento deliberado).

---

## 16. VERSIONAMIENTO Y GESTIÓN DE CAMBIOS

| Aspecto | Práctica |
|---------|---------|
| Control de versiones | Git — repo privado en Ekinoxis-evm |
| Esquema | MAJOR.MINOR.PATCH (semver) |
| Registro | `CHANGELOG.md` actualizado con cada release |
| Ramas | Feature branches → `main` (auto-deploy a producción) |
| Migraciones de DB | Aplicadas vía Supabase MCP — schema versionado en repo |
| Documentación | `CHANGELOG.md`, `README.md`, `CLAUDE.md`, `FICHA-TECNICA.md`, `AUDIT.md` y `SEGUIMIENTO-FEEDBACK.md` actualizados en cada entrega |

---

## 17. VARIABLES DE ENTORNO

Todas las credenciales gestionadas en **Vercel Env Vars** (producción, preview, development) o `.env.local` (gitignored). Cero credenciales en el código fuente.

| Variable | Servicio | Propósito |
|----------|---------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Lectura con RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Bypassa RLS — solo server-side |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy | App ID + asserted en cada JWT verify |
| `PRIVY_APP_SECRET` | Privy | Verificación server-side de JWT |
| `ADMIN_EMAILS` | Interno | Lista de emails admin raíz |
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago | API token |
| `MERCADOPAGO_WEBHOOK_SECRET` | MercadoPago | HMAC del webhook (fail-closed si unset) |
| `RESEND_API_KEY` | Resend | Email transaccional |
| `ADMIN_NOTIFICATION_EMAIL` | Interno | Destino de notificaciones admin |
| `NEXT_PUBLIC_BASE_URL` | Interno | `https://1upesports.org` |
| `NEXT_PUBLIC_APP_URL` | Interno | `https://app.1upesports.org` |
| `NEXT_PUBLIC_ADMIN_URL` | Interno | `https://admin.1upesports.org` |
| `NEXT_PUBLIC_BASE_RPC_URL` | Base L2 | Opcional (default mainnet.base.org) |
| `COMFENALCO_API_URL` / `COMFENALCO_API_KEY` | Comfenalco | Pendiente — credenciales por entregar |
| `CF_STREAM_ACCOUNT_ID` / `CF_STREAM_API_TOKEN` / `CF_STREAM_KEY_ID` / `CF_STREAM_PEM` / `NEXT_PUBLIC_CF_CUSTOMER_CODE` | Cloudflare Stream | Cinco vars — activas |
| `UPSTASH_REDIS_REST_KV_REST_API_URL` / `UPSTASH_REDIS_REST_KV_REST_API_TOKEN` | Upstash Redis | Rate limiting — auto-aprovisionadas por Vercel Marketplace · **activas** |

---

## 18. CUMPLIMIENTO NORMATIVO

| Aspecto | Estado |
|---------|--------|
| Política de privacidad | Publicada en `1upesports.org/privacidad` — Ley 1581 (Colombia) |
| Habeas data | Checkbox obligatorio en onboarding + texto de tratamiento de datos |
| Protección de datos personales | Supabase con RLS, comprobantes en bucket privado, edad mínima 14 enforzada en onboarding **y** en PUT del perfil |
| Firma de webhooks de pago | HMAC-SHA256 canónico con manifiesto `id;request-id;ts` |
| Tokens JWT | Corta duración + `appId` claim verificado en cada request |
| Claves privadas de usuarios | TEE de Privy — nunca accesibles |

---

## 19. HOJA DE RUTA TECNOLÓGICA

### 19.1 Integraciones pendientes (operacionales)

| Integración | Dependencia | Impacto |
|------------|-------------|---------|
| **MercadoPago automático** | 1UP debe habilitar el procesador en su cuenta empresarial con MercadoPago Colombia | Cobro automático de academia (actualmente vía transferencia + admin approval) |
| **Comfenalco API** | Credenciales pendientes de entrega por el aliado | Descuentos automáticos para afiliados Comfenalco |

### 19.2 Capa blockchain (construida — activación a decisión del negocio)

| Funcionalidad | Esfuerzo de integración | Valor |
|--------------|------------------------|-------|
| **IdentityNFT** — 1UP Pass descentralizado | Bajo — `viem` ya presente | Membresía on-chain verificable |
| **ChallengeVault** — retos con escrow | Medio — requiere UI | Monetización de partidas P2P |
| **CourseNFT** — certificado on-chain | Bajo-Medio — integración con flujo existente | Credencial académica verificable |

### 19.3 Mejoras técnicas planificadas

| Mejora | Estado |
|--------|--------|
| Suite de tests automatizados (Vitest) | **Implementado — 359 tests** |
| Tests E2E (Playwright) | Pendiente |
| Auditoría externa de smart contracts | Pendiente |
| Battle test con Family & Friends | Pendiente — coordinación 1UP |
| Preguntas adicionales de caracterización en onboarding | Pendiente — 1UP define |
| Play-in round para double-elim no-pow2 | Pendiente — DE actualmente usa bye-cascading (v2.36.14); play-in DE requiere reescritura del cross-pairing de LB |

---

## 20. GLOSARIO TÉCNICO

| Término | Definición |
|---------|-----------|
| **Next.js App Router** | Arquitectura de Next.js 13+ con Server Components, layouts anidados, rutas API colocadas |
| **React Server Components** | Componentes renderizados en servidor — acceso directo a DB, sin JS cliente |
| **ISR** | Incremental Static Regeneration — caché edge con `revalidate` por página |
| **`next/image`** | Componente de imagen optimizado — AVIF/WebP automático, lazy load, responsive srcset |
| **`next/og`** | Generación de imágenes Open Graph dinámicas (1200×630) en edge runtime |
| **Fluid Compute** | Modelo de Vercel que reutiliza instancias entre requests — reduce cold starts |
| **Supabase** | Plataforma BaaS basada en PostgreSQL |
| **RLS** | Row-Level Security — restricción de acceso por política de rol |
| **Privy** | IdP + wallets embebidas para Web3 |
| **TEE** | Trusted Execution Environment — entorno seguro donde Privy guarda claves privadas |
| **JWT** | JSON Web Token con firma criptográfica |
| **`appId` claim** | Identificador del Privy app en el JWT — asserted server-side contra `NEXT_PUBLIC_PRIVY_APP_ID` |
| **HMAC-SHA256** | Verificación de integridad de mensajes con clave secreta |
| **Upstash Ratelimit** | Sliding window rate limiter sobre Redis serverless |
| **Cloudflare Stream `accessRules`** | Restricciones en JWT — IP source, geo, etc. |
| **Vercel** | Plataforma de despliegue serverless para Next.js |
| **Base** | L2 sobre Ethereum (Coinbase) — rápida y barata |
| **ERC-20 / 721 / 1155** | Estándares de token fungible / NFT / multi-token |
| **EIP-4626** | Estándar de vault tokenizado |
| **EIP-7702** | Mejora que permite a EOAs actuar como smart contracts — habilita gas sponsorship |
| **Foundry** | Framework de desarrollo + tests de Solidity |
| **Soulbound** | Token no transferible, ligado a una dirección |
| **OTC** | Over-The-Counter — transacción directa sin intermediario automatizado |
| **MercadoPago** | Pasarela de pagos líder en Latinoamérica |
| **Blockscout** | Explorer EVM open-source |

---

## 21. INFORMACIÓN DE CONTACTO TÉCNICO

| Rol | Organización |
|-----|-------------|
| Desarrollo y arquitectura tecnológica | **Ekinoxis** — ekinoxis.xyz |
| Plataforma y operación | **1UP Gaming Tower** — 1upesports.org |
| Soporte blockchain y Web3 | **ETH Cali** — ethcali.org |

---

*Documento generado para presentación institucional. La información técnica refleja el estado de la plataforma a la fecha de la última actualización indicada (23 de junio de 2026, versión 2.54.1 en producción). Cualquier modificación sustancial de arquitectura o stack deberá ser reflejada en una nueva versión del documento.*

---

**Versión 2.29 — Junio 2026 — Elaborado por Ekinoxis para 1UP Gaming Tower**
