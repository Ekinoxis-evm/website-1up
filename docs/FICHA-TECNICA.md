# FICHA TÉCNICA DE PLATAFORMA TECNOLÓGICA
## 1UP Gaming Tower — Sistema de Gestión y Comunidad Esports

---

| | |
|---|---|
| **Documento** | Ficha Técnica de Plataforma Tecnológica |
| **Versión** | 2.5 |
| **Fecha de emisión** | Mayo de 2026 |
| **Última actualización** | Mayo 2026 |
| **Clasificación** | Público / Para presentación institucional |
| **Elaborado por** | Ekinoxis |
| **Revisado por** | Equipo técnico 1UP Gaming Tower |

---

## RESUMEN EJECUTIVO

**1UP Gaming Tower** es la plataforma tecnológica que soporta la operación del primer hub profesional de esports en Colombia. El sistema fue construido íntegramente por **Ekinoxis** como software a medida (sin CMS ni plantillas) y se encuentra en producción activa en `1upesports.org`.

La plataforma comprende tres frentes de cara al usuario — portal público, panel de usuario y consola de administración — todos servidos desde una única base de código en **Next.js 16** sobre infraestructura serverless de **Vercel**. La persistencia de datos corre en **Supabase (PostgreSQL)** con Row-Level Security habilitado. La autenticación es gestionada por **Privy** mediante tokens JWT verificados server-side. Los pagos se procesan a través de **MercadoPago** con verificación HMAC-SHA256 en webhook.

Adicionalmente, la plataforma cuenta con una **capa blockchain construida y lista para integración**: un conjunto de contratos inteligentes en Solidity sobre la red Base (L2 de Ethereum), desarrollados con Foundry y cubiertos por suite de tests completa. Esta capa no está activa en producción a la fecha por decisión presupuestal, pero representa capacidad técnica instalada disponible para activación.

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
| **Estado** | Producción activa |
| **Repositorio** | Privado — organización Ekinoxis |

---

## 2. DESCRIPCIÓN FUNCIONAL

1UP Gaming Tower es una plataforma tecnológica integral que soporta la operación del primer hub profesional de esports en Colombia. El sistema ofrece cuatro capas funcionales:

### 2.1 Portal público (`1upesports.org`)
Presentación institucional del hub: programas académicos, equipos profesionales, torneos, oferta recreativa y catálogo de juegos por piso. Incluye flujo completo de registro a torneos con confirmación por email y archivo `.ics` de calendario. Las páginas de detalle de torneo muestran el **bracket visual** (eliminación simple o doble) cuando existe uno publicado, renderizado en tiempo real con el estado actual de los matches.

### 2.2 Panel de usuario (`app.1upesports.org`)
Espacio personal para miembros registrados: gestión de identidad digital, wallet de tokens $1UP, inscripción y seguimiento de torneos, adquisición del **1UP Pass** (membresía), historial de compras y ajustes de cuenta. Requiere autenticación mediante Privy.

### 2.3 Panel administrativo (`admin.1upesports.org`)
Consola de gestión interna para el equipo operativo de 1UP: control de contenido, usuarios, inscripciones, pagos, órdenes OTC, gestión de torneos y resultados, configuración de pass, códigos de referido y logos de marca. Incluye el **editor de cursos por módulos y sesiones** — wizard de dos pestañas (Información + Contenido) para construir la jerarquía completa de cada curso: módulos ordenables por drag-and-drop, sesiones con video en Cloudflare Stream, documentos descargables y links de apoyo. Incluye el módulo de **gestión de brackets** — selección de torneo, generación automática del bracket desde los participantes registrados (con distribución de BYEs a las mejores semillas), registro de resultados match a match con avance automático de ganadores y perdedores, soporte para eliminación doble y simple. Requiere autenticación Privy + rol de administrador verificado.

### 2.4 Capa blockchain (`gaming-tower-scs` — construida, pendiente de integración)
Conjunto de contratos inteligentes en Solidity desplegados en Base (L2 sobre Ethereum) que habilitarán: identidad on-chain renovable, retos competitivos con escrow tokenizado y certificación de cursos como NFT. La integración con el sitio web es parte de la **hoja de ruta técnica** — la capa está construida y testeada, su activación depende de decisión de negocio.

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
│   Turbopack (dev) · Node.js 24 LTS (producción en Vercel)       │
└──────────┬──────────────┬────────────────┬──────────────────────┘
           │              │                │
┌──────────▼──┐  ┌────────▼───────┐  ┌────▼─────────────────────┐
│  Supabase   │  │     Privy      │  │  Servicios de terceros    │
│             │  │                │  │                           │
│ PostgreSQL  │  │ Auth (JWT)     │  │  MercadoPago (pagos)      │
│ + Storage   │  │ Embedded       │  │  Resend (email)           │
│ + RLS       │  │ Wallets (TEE)  │  │  Blockscout API v2        │
│             │  │ EIP-7702 gas   │  │  Base L2 RPC              │
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
- **Sin servidor separado.** No existe un backend independiente. Toda la lógica de negocio reside en Next.js API Routes y Server Components, ejecutados como funciones serverless en Vercel (Fluid Compute).
- **Subdomain routing.** Un único repositorio sirve los tres subdominios a través de `src/proxy.ts` (fichero de proxy nativo de Next.js 16).
- **Seguridad por capas.** RLS en Supabase como primera línea; verificación JWT + isAdmin en cada ruta de API como segunda línea.
- **Sin estado en servidor.** Toda la sesión de usuario viaja en el token JWT de Privy — no hay sesiones en memoria ni cookies de servidor.

---

## 4. PREGUNTAS DE EVALUACIÓN TÉCNICA

Respuestas directas a las preguntas estándar de due diligence tecnológico.

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Cuál es el stack principal? | **Frontend:** Next.js 16 App Router + React 19 + TypeScript 5 + Tailwind CSS 3. **Backend:** Next.js API Routes (REST) sobre Node.js 24 — sin servidor separado. |
| 2 | ¿Framework o vanilla? | **Framework.** React 19 vía Next.js 16 App Router. Todo el código es TypeScript con tipado estricto. No hay HTML/CSS/JS vanilla. |
| 3 | ¿Qué base de datos usa? | **PostgreSQL** gestionado en la nube por **Supabase** (región us-east-1). Row-Level Security habilitado por tabla. |
| 4 | ¿Dónde está hosteada? | Aplicación: **Vercel** (serverless, producción + preview deploys automáticos). Base de datos y archivos: **Supabase** (cloud managed). |
| 5 | ¿CMS o custom code? | **100% custom code.** Sin WordPress, Drupal ni ningún CMS. El panel de administración es una consola propia construida en Next.js. |
| 6 | ¿Qué lenguaje backend usa? | **TypeScript + Node.js 24 LTS** (runtime gestionado por Vercel). Sin servidor backend independiente. |
| 7 | ¿Tiene API propia o integra APIs de terceros? | **Ambas.** API REST interna vía Next.js API Routes. Integraciones activas: Privy, Supabase, MercadoPago, Resend, Blockscout API v2, Base L2 RPC, **Cloudflare Stream** (video streaming gated). |
| 8 | ¿Usa autenticación? ¿Cómo? | **Sí — Privy como IdP.** JWT Bearer Token verificado server-side. Proveedores: email, Google OAuth, Discord OAuth. Tres niveles de acceso: público, usuario registrado, administrador. |
| 9 | ¿Es responsive? ¿Con qué CSS? | **Sí — mobile-first.** Tailwind CSS v3 con breakpoints estándar. Bottom nav en móvil; top bar o sidebar en desktop. |
| 10 | ¿Hay tests automatizados? | App web: **Vitest activo — 52 tests** en `src/__tests__/lib/` (utils, discount, admin, privy, mercadopago, comfenalco, torneos). Smart contracts: **suite completa con Foundry (Forge)** — tests unitarios, coverage y gas report activos. |

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
| Interacción blockchain | viem | 2.47.x |
| Generación de QR | qrcode.react | latest |
| Lectura de QR | html5-qrcode | latest |
| Visualización de brackets | @g-loot/react-tournament-brackets | 1.0.31-rc |

### 5.2 Backend / Capa de API

| Componente | Tecnología | Detalle |
|-----------|-----------|---------|
| Runtime | Node.js 24 LTS | Gestionado por Vercel (Fluid Compute) |
| Framework | Next.js API Routes | REST — sin servidor independiente |
| Lenguaje | TypeScript 5 | Modo strict habilitado |
| Cliente de base de datos | Supabase JS | v2.100.x |
| Autenticación server-side | Privy Server Auth | latest |
| Pagos | MercadoPago SDK | v2.12.x |
| Email transaccional | Resend SDK | v6.12.x |
| Video educativo | Cloudflare Stream | REST API + JWT RS256 (`jose`) — tokens firmados, `requireSignedURLs: true` |
| Subdomain routing | `src/proxy.ts` | Proxy nativo Next.js 16 (reemplaza middleware.ts) |

> El backend no es un servidor independiente. Toda la lógica de negocio reside en rutas de API y Server Components ejecutados como funciones serverless en la infraestructura de Vercel.

### 5.3 Base de datos y almacenamiento

| Componente | Proveedor | Detalles |
|-----------|---------|---------|
| Base de datos relacional | **Supabase (PostgreSQL)** | Managed cloud — Región: us-east-1 |
| Row-Level Security (RLS) | Supabase | Habilitado en las 30 tablas del esquema público — primera línea de seguridad |
| Almacenamiento — imágenes | **Supabase Storage** (`images`) | Bucket público — fotos, portadas, logos. Máx. 5 MB por archivo |
| Almacenamiento — comprobantes | **Supabase Storage** (`comprobantes`) | Bucket **privado** — comprobantes de pago (token, pass, cursos). Sin URL permanente; acceso exclusivo vía URLs firmadas de 1 hora generadas server-side |
| Almacenamiento — documentos de cursos | **Supabase Storage** (`course-docs`) | Bucket **privado** — documentos descargables de sesiones de academia (PDF, ZIP, DOCX, PPTX, XLSX, imágenes). Máx. 25 MB por archivo. URLs firmadas de 1 hora, solo tras verificar inscripción activa |
| Tipos de archivos | Imágenes / documentos | JPG, PNG, WEBP, GIF, AVIF (imágenes) · JPG, PNG, WEBP, PDF (comprobantes) · PDF, ZIP, DOCX, PPTX, XLSX, PNG, JPEG, TXT, MD (documentos de cursos) |
| ORM / cliente | Supabase JS v2 | Sin Drizzle/Prisma — cliente nativo |

### 5.4 Smart Contracts (capa blockchain — construida, pendiente de integración)

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Lenguaje | Solidity | 0.8.27 |
| Framework de desarrollo y tests | Foundry | latest stable |
| Librería de contratos base | OpenZeppelin | v5 |
| Red objetivo | Base L2 (Ethereum) | Mainnet chain ID 8453 · Sepolia testnet 84532 |

> Los contratos inteligentes residen en un repositorio separado (`gaming-tower-scs`) y no forman parte del despliegue web actual. Están construidos, probados y disponibles para integración cuando el negocio lo requiera. Ver Sección 12 para detalle completo.

---

## 6. INFRAESTRUCTURA Y HOSPEDAJE

### 6.1 Plataforma de despliegue

| Servicio | Proveedor | Rol | Estado |
|---------|---------|-----|--------|
| Alojamiento de aplicación web | **Vercel** | Producción y preview deploys | Activo |
| Base de datos | **Supabase** | Cloud managed PostgreSQL | Activo |
| Almacenamiento de archivos | **Supabase Storage** | Bucket `images` (público) + `comprobantes` + `course-docs` (privados, URLs firmadas) | Activo |
| Correo transaccional | **Resend** | Notificaciones y confirmaciones | Activo |
| Autenticación y wallets | **Privy** | IdP + infraestructura de wallets embebidas (TEE) | Activo |
| Pagos con tarjeta | **MercadoPago** | Pasarela de pagos (Colombia) | Activo |
| Indexación blockchain | **Blockscout API v2** | Historial de transacciones on-chain | Activo |
| Video educativo | **Cloudflare Stream** | Streaming gated de sesiones de academia — tokens RS256 firmados server-side, subida directa desde admin (direct upload), reproducción vía iframe firmado | **Activo** |
| Verificación afiliación | **Comfenalco API** | Validación afiliados para descuentos | Pendiente (credenciales por recibir) |

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
| Push a cualquier otra rama | Build + deploy en Vercel | Preview URL efímera para revisión |
| Build fallido | Deploy bloqueado | Producción no se afecta |

- No requiere intervención manual en condiciones normales.
- Las variables de entorno de producción están aisladas de las de preview.
- Las migraciones de base de datos se aplican via Supabase MCP antes de cada deploy que las requiera.

---

## 7. AUTENTICACIÓN Y CONTROL DE ACCESO

### 7.1 Mecanismo de autenticación

El sistema utiliza **Privy** como proveedor de identidad único. Privy emite tokens JWT firmados que son verificados server-side mediante `verifyToken()` en cada solicitud protegida.

| Aspecto | Implementación |
|---------|---------------|
| Protocolo | JWT Bearer Token (verificación server-side en cada request) |
| Proveedores de login | Correo electrónico, Google (OAuth) — Discord deshabilitado |
| Wallet embebida | Privy Embedded Wallet — infraestructura TEE (Trusted Execution Environment) |
| Patrocinio de gas | EIP-7702 vía paymaster de Privy en Base Mainnet |
| Sesión | Sin estado en servidor — toda la sesión viaja en el JWT |

### 7.2 Niveles de acceso

| Nivel | Mecanismo | Acceso habilitado |
|-------|-----------|------------------|
| **Público** | Sin autenticación | Portal informativo, precios, catálogo, torneos |
| **Usuario registrado** | JWT de Privy válido + onboarding completado | Panel personal, compras, academia, wallet, mis-torneos |
| **Administrador** | JWT válido + email verificado en lista de admins | Consola de administración completa |

### 7.3 Seguridad de rutas de API

Toda ruta bajo `/api/admin/*` ejecuta obligatoriamente, en este orden:
1. Verificación del token JWT con `verifyToken()` (Privy server-side).
2. Resolución del email del usuario con `resolveUserEmail()` — soporta Google/Discord OAuth donde `claims.user.email` está vacío.
3. Verificación del rol administrador con `isAdmin()` — lista de emails en variable de entorno + tabla `admin_users` en BD.
4. Acceso a base de datos exclusivamente con clave de service role (bypasa RLS).

Las rutas de usuario (`/api/user/*`) solo ejecutan el paso 1.

---

## 8. API INTERNA — RESUMEN DE ENDPOINTS

La plataforma expone una API REST interna (consumida por sus propios frontends) implementada en Next.js API Routes. No es una API pública documentada para terceros — su propósito es exclusivamente el funcionamiento de los tres subdominios de la plataforma.

### 8.1 Endpoints públicos (sin autenticación)

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/recruitment` | POST | Envío de formulario de reclutamiento |
| `/api/user/pass-config` | GET | Precio, dirección receptora y duración del 1UP Pass |
| `/api/user/referral-codes/validate` | GET | Validar un código de referido |
| `/api/admin/brand-logos` | GET | Logos de marca activos (marquee del home) |
| `/api/admin/tournaments` | GET | Torneos activos con nombre de juego |

### 8.2 Endpoints de usuario (requieren JWT de Privy)

| Endpoint | Métodos | Propósito |
|----------|---------|-----------|
| `/api/user/profile` | GET, PUT | Perfil propio — lectura y actualización |
| `/api/user/onboarding` | POST | Completar onboarding inicial |
| `/api/user/comfenalco/verify` | POST | Verificación de afiliación Comfenalco |
| `/api/user/aliado/verify` | POST | Verificación de afiliación aliado genérico |
| `/api/checkout` | POST | Crear preferencia MercadoPago + inscripción pendiente |
| `/api/user/upload-comprobante` | POST | Subir comprobante de pago (Storage) |
| `/api/user/token-orders` | GET, POST | Órdenes OTC propias / crear nueva orden |
| `/api/user/token-orders/cancel` | POST | Cancelar orden propia pendiente |
| `/api/bank-accounts` | GET | Cuentas bancarias activas (modal de compra) |
| `/api/user/pass-orders` | GET, POST | Órdenes de pass propias / crear tras tx confirmada |
| `/api/user/tournament-registrations` | GET, POST, DELETE | Inscripciones a torneos propias |
| `/api/user/tournament-checkin` | POST | Check-in QR en torneo live |
| `/api/user/stream-token` | POST | Token CF Stream firmado (RS256, 1h) para contenido legacy de `academia_content.stream_uid` — requiere inscripción activa |
| `/api/user/course-intro-token` | POST | Token CF Stream firmado para video intro del curso (`courses.intro_video_uid`) — no requiere inscripción |
| `/api/user/stream-token-v2` | POST | Token CF Stream firmado para sesión de módulo (`course_sessions.video_uid`) — requiere inscripción activa + sesión publicada |
| `/api/user/course-session` | GET | Datos de sesión (links + metadatos de documentos) para usuario inscrito (`?sessionId=N`) |
| `/api/user/course-document` | GET | URL firmada de 1h para descarga de documento de sesión (`?id=N`) — requiere inscripción activa |

### 8.3 Endpoints de administración (requieren JWT + isAdmin)

| Endpoint | Métodos | Propósito |
|----------|---------|-----------|
| `/api/admin/courses` | POST, PUT, DELETE | CRUD de cursos (incluye `introVideoUid`, `introDescription`, `sessionDurationMin`) |
| `/api/admin/course-modules` | POST, PUT, DELETE | CRUD de módulos — título, descripción, is_published, sort_order |
| `/api/admin/course-modules/reorder` | POST | Actualización masiva de sort_order para módulos de un curso |
| `/api/admin/course-sessions` | POST, PUT, DELETE | CRUD de sesiones — acepta `pendingDocs[]` (mueve de pending a final), `links[]`, `removedDocIds[]`; DELETE limpia Storage |
| `/api/admin/course-sessions/reorder` | POST | Actualización masiva de sort_order para sesiones de un módulo |
| `/api/admin/course-session-links` | POST, PUT, DELETE | CRUD de links de apoyo por sesión |
| `/api/admin/course-doc-upload` | POST | Subida multipart de documento a bucket `course-docs` (ruta pending). Devuelve `{ path, mimeType, sizeBytes, label }` |
| `/api/admin/course-session-documents` | POST, DELETE | Insertar registro DB para doc ya subido / eliminar doc (Storage + fila) |
| `/api/admin/stream-upload-url` | POST | URL de subida directa CF Stream + video UID para PUT desde el navegador admin |
| `/api/admin/masters` | POST, PUT, DELETE | CRUD de instructores |
| `/api/admin/discounts` | POST, PUT, DELETE | CRUD de reglas de descuento |
| `/api/admin/aliados` | POST, PUT, DELETE | CRUD de aliados |
| `/api/admin/academia-content` | POST, PUT, DELETE | CRUD de contenido académico |
| `/api/admin/social-links` | PUT | Actualizar links de redes sociales del footer |
| `/api/admin/enrollments` | GET | Listado de inscripciones |
| `/api/admin/users` | GET, POST, DELETE | Gestión de usuarios administradores |
| `/api/admin/upload` | POST | Subida de imágenes a Supabase Storage |
| `/api/admin/token-orders` | GET, PATCH | Listado de órdenes OTC / aprobar o rechazar |
| `/api/admin/bank-accounts` | POST, PUT, DELETE | CRUD de cuentas bancarias |
| `/api/admin/pass-config` | GET, PUT | Configuración del 1UP Pass |
| `/api/admin/pass-orders` | GET, PATCH | Listado de órdenes de pass / aprobar o rechazar |
| `/api/admin/referral-codes` | GET, POST, PUT | CRUD de códigos de referido |
| `/api/admin/brand-logos` | GET, POST, PUT, DELETE | CRUD de logos de marca |
| `/api/admin/tournaments` | GET, POST, PUT, DELETE | CRUD de torneos |
| `/api/admin/tournament-registrations` | GET, PATCH | Listado de inscripciones / actualizar estado |
| `/api/admin/tournament-results` | GET, POST, PATCH, DELETE | Gestión de podio (posiciones 1–3) + entrega de premios (prize_status, tx_hash, comprobante) |
| `/api/admin/brackets` | GET, POST, PATCH, DELETE | Brackets: GET fetch bracket+participantes+matches; POST genera bracket desde inscripciones (2-fase: insertar matches → cablear next_match_id); PATCH registra resultado + avanza ganador/perdedor; DELETE resetea bracket (CASCADE) |
| `/api/admin/international-tournaments` | GET, POST, PUT, DELETE | CRUD de torneos internacionales |

### 8.4 Webhooks entrantes

| Endpoint | Emisor | Seguridad |
|----------|--------|-----------|
| `/api/webhooks/mercadopago` | MercadoPago | Verificación HMAC-SHA256 del header `x-signature` — rechaza si firma no coincide |

---

## 9. MODELO DE DATOS — TABLAS PRINCIPALES

Base de datos PostgreSQL en Supabase. Tipado completo en `src/types/database.types.ts`.

| Tabla | Propósito |
|-------|-----------|
| `user_profiles` | Perfil completo del usuario: nombre, documento, teléfono, juegos, barrio, fecha de nacimiento, onboarding, referido |
| `courses` | Catálogo: nombre, categoría, precio (COP + $1UP), duración total, duración por sesión, instructor, cover, intro video (CF Stream UID), intro_description, is_active |
| `course_modules` | Módulos por curso — título, descripción, sort_order, is_published (CASCADE con courses) |
| `course_sessions` | Sesiones por módulo — título, descripción, video_uid (CF Stream), duration_minutes, sort_order, is_published (CASCADE con course_modules) |
| `course_session_links` | Links de apoyo por sesión — label, url, sort_order (CASCADE con course_sessions) |
| `course_session_documents` | Documentos descargables — label, storage_path (bucket `course-docs`), mime_type, size_bytes, sort_order (CASCADE) |
| `masters` | Instructores: nombre, especialidad, bio, redes sociales, categorías, temas |
| `enrollments` | Inscripciones a cursos: usuario, curso, precio final, estado de pago, ID MercadoPago |
| `tournaments` | Torneos: nombre, juego, fecha, premios, capacidad, estado, tipo de ubicación |
| `tournament_prizes` | Premios por posición (1–3): tipo (tokens/COP/ambos), montos |
| `tournament_registrations` | Inscripciones a torneos: usuario, torneo, estado (registered/cancelled/attended/no_show) |
| `tournament_results` | Resultados de podio: usuario, torneo, posición, puntos |
| `brackets` | Bracket por torneo (UNIQUE): formato (single/double), estado (draft/published/in_progress/completed), conteo de participantes, rondas ganadores/perdedores |
| `bracket_participants` | Participantes del bracket: seed, display_name, user_profile_id (nullable para BYEs), eliminado |
| `bracket_matches` | Matches del bracket: lado (winners/losers/grand_final), ronda, número, p1/p2/winner/loser IDs, scores, estado, next_match_id (donde va el ganador), next_loser_match_id (donde va el perdedor en DE) |
| `hall_of_fame` | Vista PostgreSQL (SECURITY INVOKER): ranking por puntos totales — oro, plata, bronce. Solo expone perfiles con resultado de podio — demás perfiles permanecen privados |
| `pass_config` | Configuración del 1UP Pass: precio, wallet receptora, duración |
| `pass_orders` | Órdenes de pass: usuario, método de pago, tx_hash, fechas, estado |
| `token_purchase_orders` | Órdenes OTC de $1UP: usuario, montos, comprobante, estado, aprobación admin |
| `bank_accounts` | Cuentas bancarias para pagos OTC — mostradas en modal de compra |
| `discount_rules` | Reglas de descuento: tipo de trigger, porcentaje, aplicación, aliado FK, vigencia |
| `aliados` | Partners: API de verificación para descuentos + logos del marquee. Columnas `api_key` y `api_url` revocadas a nivel de columna para roles anon/authenticated |
| `referral_codes` | Códigos de referido: código único, usos máximos, contador, estado |
| `international_tournaments` | Torneos internacionales de referencia (sin registro ni capacidad) |
| `social_links` | Links de redes sociales del footer — editables desde admin |
| `game_categories` | Categorías de juego: nombre, slug, imagen |
| `games` | Juegos: nombre, categoría, imagen |
| `floor_info` | Información por piso de la torre: etiqueta, título, descripción, color, imagen |
| `admin_users` | Emails con acceso administrativo gestionados desde panel |

---

## 10. INTEGRACIONES CON SERVICIOS EXTERNOS

| Servicio | Proveedor | Propósito | Estado |
|---------|---------|----------|--------|
| Pagos tarjeta débito/crédito | MercadoPago | Checkout de cursos + webhook HMAC-SHA256 | Activo |
| Autenticación e identidad | Privy | Login, embedded wallets, gas sponsorship EIP-7702 | Activo |
| Base de datos y archivos | Supabase | PostgreSQL + Storage CDN | Activo |
| Correo transaccional | Resend | Notificaciones de compra, confirmación de torneo + adjunto .ics | Activo |
| Historial blockchain | Blockscout API v2 | Consulta de transferencias del token $1UP | Activo |
| Nodo blockchain | Base RPC | Envío de transacciones y consulta de contratos | Activo |
| Video educativo | Cloudflare Stream | Videos de sesiones de academia — subida directa desde admin, reproducción gated con tokens RS256 de 1h | **Activo** |
| Verificación afiliación | Comfenalco API | Validación de afiliados para descuentos | Pendiente (credenciales por recibir) |

---

## 11. PASARELA DE PAGOS Y FLUJO ECONÓMICO

### 11.1 Medios de pago soportados

| Medio | Canal | Confirmación |
|-------|-------|--------------|
| Tarjeta débito / crédito | MercadoPago | Automática — webhook firmado HMAC-SHA256 |
| Transferencia bancaria OTC | Manual + panel admin | Comprobante subido por usuario; aprobación manual por admin |
| Token $1UP (ERC-20) | Base L2 — viem | Transacción on-chain verificada vía hash + block number |

### 11.2 Token $1UP

| Campo | Detalle |
|-------|---------|
| Nombre | 1UP Token |
| Estándar | ERC-20 |
| Red | Base Mainnet (chain ID 8453) |
| Dirección del contrato | `0xF6813C71e620c654Ff6049a485E38D9494eFABdf` |
| Equivalencia de referencia | 1 $1UP = 1.000 COP (convención de plataforma) |
| Explorer | https://basescan.org/token/0xF6813C71e620c654Ff6049a485E38D9494eFABdf |

### 11.3 Reglas de seguridad en pagos

- Los precios nunca están codificados en el frontend — se leen desde la base de datos en tiempo de checkout.
- Los descuentos son calculados exclusivamente en el servidor.
- El webhook de MercadoPago verifica firma HMAC-SHA256 antes de modificar cualquier registro.
- Los estados de pago siguen un ciclo de vida estricto: `pending → approved | rejected | cancelled`. Los registros nunca se eliminan.
- Los precios de token al momento de compra se congelan en la orden (`exchange_rate_cop`) — no retroactivos.

---

## 12. CAPA BLOCKCHAIN — CONTRATOS INTELIGENTES

### 12.1 Estado actual

Los contratos inteligentes constituyen la capa descentralizada de la plataforma y residen en el repositorio `gaming-tower-scs` (separado del repositorio web). Están escritos en Solidity, desarrollados con Foundry y cubiertos por una suite de tests completa.

**Su integración con el sitio web no está activa en producción a la fecha de este documento por decisión presupuestal.** La capacidad técnica está instalada y lista — la activación requiere únicamente la implementación del frontend de integración (estimado de bajo esfuerzo dado que el cliente `viem` ya está presente en el proyecto web).

### 12.2 Contratos principales

| Contrato | Estándar | Descripción | Medio de pago |
|---------|---------|-------------|---------------|
| `IdentityNFTFactory` | — | Fábrica de colecciones de identidad por ciudad | — |
| `IdentityNFT` | ERC-1155 (multi-token) | Tarjeta de suscripción digital renovable mensual/anualmente | ERC-20 (1UP, USDC, EURC) |
| `ChallengeVault` | EIP-4626 | Contrato de escrow para retos entre dos jugadores | ERC-20 en lista blanca |
| `VaultFactory` | — | Despliega y rastrea ChallengeVaults — requiere IdentityNFT activo | — |
| `CourseNFT` | ERC-721 + ERC-2981 | NFT de curso con contenido privado y regalías en reventa | ETH |
| `CourseFactory` | — | Despliega y rastrea CourseNFTs | — |

### 12.3 Redes de despliegue

| Red | Chain ID | RPC | Explorer |
|-----|---------|-----|---------|
| Base Mainnet | 8453 | https://mainnet.base.org | https://basescan.org |
| Base Sepolia (testnet) | 84532 | https://sepolia.base.org | https://sepolia.basescan.org |

### 12.4 Prácticas de seguridad en contratos

- `ReentrancyGuard` en todas las funciones de pago.
- `Pausable` en todos los mint, renovaciones y despliegues de fábrica.
- `SafeERC20` para todas las transferencias de tokens.
- Acceso a `IdentityNFTFactory.deployCollection()` restringido al propietario.
- Errores personalizados en lugar de `require` con strings — menor gas, mejor DX.
- Opción de configuración soulbound en `IdentityNFT` (token no transferible por dirección).

> **Nota de auditoría:** Los contratos no han sido sometidos a auditoría de seguridad profesional externa. Se recomienda auditoría formal antes de escalar el volumen de activos gestionados on-chain.

### 12.5 Capacidades que habilitan los contratos

| Funcionalidad | Contrato | Estado |
|--------------|---------|--------|
| Identidad on-chain renovable (1UP Pass descentralizado) | `IdentityNFT` | Construido — no integrado |
| Retos competitivos con apuesta en escrow | `ChallengeVault` | Construido — no integrado |
| Certificación de cursos como NFT transferible | `CourseNFT` | Construido — no integrado |
| Gas patrocinado para transacciones de usuario | EIP-7702 vía Privy | **Activo en producción** (solo para token $1UP) |

---

## 13. DISEÑO Y EXPERIENCIA DE USUARIO

### 13.1 Diseño responsive

| Aspecto | Implementación |
|---------|---------------|
| Estrategia | Mobile-first — Tailwind CSS con breakpoints `sm / md / lg / xl` |
| Navegación móvil — portal público | `MobileBottomNav` — barra inferior fija |
| Navegación móvil — panel de usuario | `AppBottomNav` — barra inferior fija |
| Navegación desktop — portal | `TopAppBar` con efecto vidrio (`glass-panel`) |
| Navegación desktop — panel de usuario | `AppSidebar` colapsable |
| Imágenes | Optimizadas por `next/image` — lazy load, WebP automático, hostnames whitelisted |

### 13.2 Sistema de diseño

La plataforma implementa un sistema de diseño neo-brutalista personalizado, con las siguientes reglas no negociables:

| Regla | Especificación |
|-------|---------------|
| Border radius | 0px en todos los elementos (excepto `rounded-full` para avatares y pills) |
| Separación de secciones | Por cambio de color de fondo — sin bordes de 1px ni `<hr>` |
| Componentes públicos | Tailwind puro — sin shadcn/ui en páginas públicas |
| Patrón de skew | Elemento exterior: `skew-fix` / texto interior: `block skew-content` |
| Barra de navegación | Siempre `glass-panel` — nunca opaca |

---

## 14. PRUEBAS Y CONTROL DE CALIDAD

### 14.1 Aplicación web

| Tipo | Herramienta | Estado |
|------|-----------|--------|
| Tipado estático | TypeScript 5 (modo strict) | Activo — cero errores requerido para deploy |
| Linting | ESLint (config Next.js) | Activo |
| Verificación de build | `next build` | Ejecutado antes de cada entrega |
| Tests unitarios / integración | Vitest | **Activo** — 52 tests en `src/__tests__/lib/` (utils, tournamentPoints, discount, admin, mercadopago, comfenalco, privy) |
| Tests end-to-end | Playwright (propuesta) | Pendiente de definición |
| QA manual | Checklist por release | Activo |

### 14.2 Smart Contracts

| Tipo | Herramienta | Estado |
|------|-----------|--------|
| Tests unitarios y de integración | Forge (Foundry) | Activo — suite completa |
| Reporte de cobertura | `forge coverage` | Disponible |
| Reporte de gas | `forge test --gas-report` | Disponible |
| Auditoría de seguridad externa | — | Pendiente |

### 14.3 Flujo de QA antes de cada release

```
[ ] npm run test:run      — cero tests fallidos (52 tests)
[ ] npm run build         — cero errores de compilación
[ ] npx tsc --noEmit      — cero errores TypeScript
[ ] npm run lint          — cero advertencias ESLint
[ ] Smoke test manual:
      ✓ Home público carga y muestra torneos activos
      ✓ Registro de usuario completo (onboarding)
      ✓ Inscripción a torneo + email de confirmación recibido
      ✓ Admin login → dashboard → CRUD completo en al menos una entidad
      ✓ Páginas públicas reflejan cambios tras mutación admin
```

---

## 15. SEGURIDAD DE LA PLATAFORMA

### 15.1 Capas de defensa

| Capa | Mecanismo | Descripción |
|------|-----------|-------------|
| **Autenticación** | Privy JWT | Token firmado, verificado server-side en cada request protegido |
| **Autorización** | isAdmin() | Email verificado contra env var + tabla DB antes de toda operación admin |
| **Base de datos** | Supabase RLS | Row-Level Security habilitado en las 30 tablas — primera línea de defensa contra acceso directo vía PostgREST con la clave anon pública |
| **Rutas de API** | Service role isolation | Admin API Routes usan `supabaseAdmin` (service role) — nunca el cliente anon |
| **Pagos** | HMAC-SHA256 | Webhooks de MercadoPago verificados por firma antes de modificar cualquier registro |
| **Precios** | Server-side only | Los precios y descuentos se calculan exclusivamente en servidor — nunca se confían valores del frontend |
| **Secretos** | Vercel Env Vars | Ninguna credencial en el repositorio — todo gestionado en Vercel o `.env.local` (gitignored) |
| **Uploads** | Tipo + tamaño + bucket privado | Comprobantes validados por MIME type y tamaño (máx. 5 MB); almacenados en bucket privado sin URL permanente |
| **Wallet** | TEE (Privy) | Las claves privadas de wallets embebidas nunca salen del Trusted Execution Environment de Privy |
| **Gas** | EIP-7702 paymaster | El gas de transacciones on-chain de usuarios es patrocinado por Privy — el usuario nunca necesita ETH |

### 15.2 Auditoría de seguridad completa — Mayo 2026

En mayo de 2026 se realizó una auditoría integral de seguridad sobre la base de datos y el código de la plataforma. Los hallazgos y correcciones aplicadas se documentan a continuación.

#### Supabase RLS — habilitación masiva

| Tabla | Situación previa | Corrección aplicada |
|-------|-----------------|---------------------|
| `admin_users` | Sin RLS — cualquier caller anon podía INSERT su email y obtener acceso admin | RLS habilitado, sin políticas = acceso exclusivo por service role |
| `user_profiles` | Políticas `USING (true)` — cualquier usuario autenticado leía todos los perfiles (PII: teléfono, documento, fecha de nacimiento) y podía actualizar perfiles ajenos | Políticas eliminadas — acceso exclusivo por service role vía API routes |
| `pass_orders` | Sin RLS — wallets, tx hashes y comprobantes expuestos al cliente anon | RLS habilitado, sin políticas = service role only |
| `token_purchase_orders` | Sin RLS — datos financieros y comprobantes expuestos | RLS habilitado, sin políticas = service role only |
| `enrollment` | Sin RLS | RLS habilitado, sin políticas = service role only |
| `recruitment_submissions` | Sin RLS | RLS habilitado, sin políticas = service role only |
| `referral_codes` | Sin RLS | RLS habilitado, sin políticas = service role only |
| 16 tablas de contenido público | Sin RLS — PostgREST permitía INSERT/UPDATE/DELETE directo sin autenticación | RLS habilitado con políticas SELECT-only para anon/authenticated |

#### Escalada de privilegios cerrada

La tabla `admin_users` sin RLS permitía a cualquier actor anónimo insertar su propio email directamente vía la API REST de Supabase (PostgREST + clave anon pública). En el siguiente request, `isAdmin()` —que usa service role y ve todas las filas— le habría concedido acceso total al panel de administración. Cerrado: RLS habilitado sin políticas, la tabla es ahora inaccesible desde el cliente anon.

#### Protección de columnas sensibles

`aliados.api_key` y `aliados.api_url` revocadas a nivel de columna (`REVOKE SELECT (api_key, api_url) FROM anon, authenticated`) — la lectura pública de aliados activos funciona pero estas columnas son invisibles fuera del service role.

#### RPCs endurecidas

| Función | Corrección |
|---------|-----------|
| `register_for_tournament` | `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` — era invocable sin autenticación vía PostgREST |
| `sync_user_pass_status` | `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` — función de trigger no destinada a invocación directa |
| Ambas funciones | `SET search_path = public` — previene ataques de inyección por search_path en funciones SECURITY DEFINER |

#### Documentos financieros privatizados

Los comprobantes de pago (transferencias bancarias OTC) se almacenaban en el bucket público `images`. Migrados a un bucket privado `comprobantes` (sin acceso público). Las rutas de API admin generan URLs firmadas de 1 hora bajo demanda; el frontend nunca recibe ni almacena URLs permanentes. Compatibilidad hacia atrás: registros legacy con `https://` completo pasan directamente.

#### Vista hall_of_fame endurecida

La vista tenía `SECURITY DEFINER` —ejecutaba como propietario, bypasando RLS— y exponía potencialmente todos los perfiles de usuario. Cambiada a `SECURITY INVOKER`. Se añadió una política RLS estrecha en `user_profiles` que permite lectura anon exclusivamente para los perfiles que tienen al menos un resultado de podio en `tournament_results`. El resto de perfiles permanece completamente privado.

#### Estado final del advisor de Supabase

Tras la auditoría: **0 errores, 0 advertencias**. Solo avisos informativos (`rls_enabled_no_policy`) para tablas que son intencionalmente de acceso exclusivo por service role — comportamiento correcto y deliberado.

---

## 16. VERSIONAMIENTO Y GESTIÓN DE CAMBIOS

| Aspecto | Práctica |
|---------|---------|
| Control de versiones | Git — repositorio privado en organización Ekinoxis |
| Esquema de versiones | MAJOR.MINOR.PATCH (semver) |
| Registro de cambios | `CHANGELOG.md` — actualizado con cada release |
| Ramas de trabajo | Feature branches → `main` (auto-deploy a producción) |
| Migraciones de base de datos | Aplicadas vía Supabase MCP — trazabilidad garantizada, nunca manual |
| Documentación | `CHANGELOG.md`, `README.md` y `FICHA-TECNICA.md` actualizados en cada entrega |

---

## 17. VARIABLES DE ENTORNO Y CONFIGURACIÓN SENSIBLE

Todas las credenciales y variables de entorno sensibles son gestionadas a través de:
- **Vercel Environment Variables** (producción, preview y desarrollo).
- Archivo `.env.local` (desarrollo local — excluido del repositorio mediante `.gitignore`).

Ninguna credencial, clave de API, clave privada de billetera o secreto está almacenado en el código fuente.

| Variable | Servicio | Propósito |
|----------|---------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Clave pública (lectura con RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Clave de servicio (bypasa RLS — solo server-side) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy | App ID para SDK cliente |
| `PRIVY_APP_SECRET` | Privy | Secreto para verificación server-side de JWT |
| `ADMIN_EMAILS` | Interno | Lista de emails raíz administradores |
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago | Credencial de API de pagos |
| `MERCADOPAGO_WEBHOOK_SECRET` | MercadoPago | Secreto para verificar firma HMAC de webhooks |
| `RESEND_API_KEY` | Resend | Clave de API de email transaccional |
| `ADMIN_NOTIFICATION_EMAIL` | Interno | Destino de notificaciones de compra |
| `NEXT_PUBLIC_BASE_URL` | Interno | URL de producción (`https://1upesports.org`) |
| `NEXT_PUBLIC_APP_URL` | Interno | Subdominio app (`https://app.1upesports.org`) |
| `NEXT_PUBLIC_ADMIN_URL` | Interno | Subdominio admin (`https://admin.1upesports.org`) |
| `NEXT_PUBLIC_BASE_RPC_URL` | Base L2 | RPC de la red blockchain (opcional — default: mainnet.base.org) |
| `COMFENALCO_API_URL` | Comfenalco | Endpoint de validación de afiliados (pendiente) |
| `COMFENALCO_API_KEY` | Comfenalco | Clave de API (pendiente) |
| `CF_STREAM_ACCOUNT_ID` | Cloudflare Stream | ID de cuenta (pendiente) |
| `CF_STREAM_API_TOKEN` | Cloudflare Stream | Token de API (pendiente) |

---

## 18. CUMPLIMIENTO NORMATIVO

| Aspecto | Estado |
|---------|--------|
| Política de privacidad | Publicada en `1upesports.org/privacidad` — cumplimiento Ley 1581 de 2012 (Colombia) |
| Protección de datos personales | Datos en Supabase (PostgreSQL) con RLS — acceso restringido por rol |
| Firma de webhooks de pago | HMAC-SHA256 (MercadoPago) — prevención de solicitudes falsificadas |
| Tokens JWT | Corta duración, verificados server-side en cada solicitud protegida |
| Claves privadas de usuarios | Gestionadas en TEE de Privy — nunca accesibles por la plataforma |

---

## 19. HOJA DE RUTA TECNOLÓGICA

### 19.1 Integraciones pendientes (próximas)

| Integración | Dependencia | Impacto |
|------------|-------------|---------|
| **Comfenalco API** | Credenciales pendientes de entrega | Descuentos automáticos para afiliados Comfenalco |
| **Cloudflare Stream** | Credenciales pendientes de entrega | Video educativo en academia — streaming protegido por signed URL |

### 19.2 Capa blockchain (construida — activación a decisión del negocio)

| Funcionalidad | Esfuerzo estimado de integración | Valor |
|--------------|----------------------------------|-------|
| **IdentityNFT** — 1UP Pass descentralizado y renovable | Bajo — `viem` ya presente en el proyecto | Membresía on-chain verificable por terceros |
| **ChallengeVault** — retos con escrow | Medio — requiere UI de creación de reto | Monetización de partidas competitivas P2P |
| **CourseNFT** — certificado de curso como NFT | Bajo-Medio — integración con flujo de inscripción existente | Credencial académica verificable on-chain |

### 19.3 Mejoras técnicas planificadas

| Mejora | Estado |
|--------|--------|
| Suite de tests automatizados (Vitest) | **Implementado** — 52 tests activos en `src/__tests__/lib/` |
| Tests end-to-end (Playwright) | Pendiente de definición |
| Auditoría de seguridad de contratos inteligentes | Pendiente — recomendada antes de escalar volumen on-chain |

---

## 20. GLOSARIO TÉCNICO

| Término | Definición |
|---------|-----------|
| **Next.js App Router** | Arquitectura de enrutamiento de Next.js 13+ que permite Server Components, layouts anidados y rutas de API colocadas junto al frontend |
| **React Server Components** | Componentes React que se renderizan en el servidor — acceso directo a DB, sin JavaScript en el cliente |
| **Fluid Compute** | Modelo de ejecución de Vercel que reutiliza instancias de funciones entre requests concurrentes, reduciendo cold starts |
| **Supabase** | Plataforma BaaS (Backend as a Service) basada en PostgreSQL de código abierto |
| **RLS** | Row-Level Security — mecanismo de PostgreSQL para restringir acceso a filas por política de rol |
| **Privy** | Proveedor de identidad y billeteras embebidas para aplicaciones Web3 |
| **TEE** | Trusted Execution Environment — entorno de ejecución seguro donde las claves privadas de Privy nunca son accesibles externamente |
| **JWT** | JSON Web Token — estándar de autenticación sin estado con firma criptográfica |
| **HMAC-SHA256** | Algoritmo de verificación de integridad de mensajes mediante clave secreta compartida |
| **Vercel** | Plataforma de despliegue serverless especializada en aplicaciones Next.js |
| **Base** | Red de capa 2 (L2) sobre Ethereum, desarrollada por Coinbase — transacciones rápidas y de bajo costo |
| **ERC-20** | Estándar de token fungible en Ethereum/Base |
| **ERC-721** | Estándar de token no fungible (NFT) en Ethereum/Base |
| **ERC-1155** | Estándar multi-token — puede representar fungibles y no fungibles en un mismo contrato |
| **EIP-4626** | Estándar de bóvedas tokenizadas (vault) para contratos DeFi |
| **EIP-7702** | Mejora de Ethereum que permite a cuentas externas (EOA) actuar como contratos inteligentes — habilitador del gas sponsorship |
| **Foundry** | Framework de desarrollo, pruebas y despliegue de smart contracts en Solidity |
| **Soulbound** | Token o NFT no transferible, ligado permanentemente a una dirección blockchain |
| **OTC** | Over-The-Counter — transacción directa entre partes sin intermediario automatizado (ej. transferencia bancaria manual) |
| **MercadoPago** | Pasarela de pagos líder en Latinoamérica, filial de MercadoLibre |
| **Blockscout** | Explorador de bloques de código abierto — indexa transacciones de Base y otras redes EVM |

---

## 21. INFORMACIÓN DE CONTACTO TÉCNICO

| Rol | Organización |
|-----|-------------|
| Desarrollo y arquitectura tecnológica | **Ekinoxis** — ekinoxis.xyz |
| Plataforma y operación | **1UP Gaming Tower** — 1upesports.org |
| Soporte blockchain y Web3 | **ETH Cali** — ethcali.org |

---

*Documento generado para presentación institucional. La información técnica contenida en este documento refleja el estado de la plataforma a la fecha de la última actualización indicada. Cualquier modificación sustancial de arquitectura o stack deberá ser reflejada en una nueva versión del documento.*

---

**Versión 2.3 — Mayo 2026 — Elaborado por Ekinoxis para 1UP Gaming Tower**
