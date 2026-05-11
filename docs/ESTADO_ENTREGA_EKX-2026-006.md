# ESTADO DE ENTREGA & ADICIONES AL SCOPE
## Referencia: EKX-2026-005 → EKX-2026-006

**Cliente:** 1UP Gaming Tower  
**Fecha de corte:** 10 de mayo de 2026 — versión final v2.10.0  
**Preparado por:** Ekinoxis Labs

---

## PARTE 1 — ESTADO ACTUAL vs. CUENTA DE COBRO EKX-2026-005

### 1.1 Plataforma Web: 1upesports.org

| Ruta | Descripción original | Estado EKX-005 | Estado actual | Nota |
|------|---------------------|----------------|---------------|------|
| `/` (home) | Hero, Games Gallery, Recruitment | Done | ✅ Entregado + mejorado (v2.4.0–v2.5.0) | — |
| `/gaming-tower` | 6-floor breakdown, 1UP Pass, Map | Done | ✅ Entregado | — |
| `/team` | Pro roster + Hall of Fame | Done | ✅ Entregado | — |
| `/masters` | Masters showcase + 8 social links | Done | ✅ Eliminado — integrado en `/academia` (v2.10.0) | — |
| `/academia` | Course catalog + Masters + MercadoPago checkout | Done | ✅ Entregado + mejorado (v2.7.0, v2.10.0) | **⊕ Masters integrados** |
| `/juegos` | Games showcase by category | Done | ✅ Entregado | — |
| `/recreativo` | Casual gaming section | Done | ✅ Entregado | — |
| `/store` | Buy merchandise | Future | ⏳ Pendiente (fuera de scope actual) | — |
| `/torneos` | Torneos públicos con filtros + premios | ❌ No contemplado | ✅ Entregado (v2.6.0–v2.7.1) | **⊕ Adición** |
| `/privacidad` | Política de Privacidad (Ley 1581) | ❌ No contemplado | ✅ Entregado (v2.3.0) | **⊕ Adición** |

### 1.2 Panel de Administración: admin.1upesports.org

| Módulo | Estado EKX-005 | Estado actual | Nota |
|--------|----------------|---------------|------|
| `/admin` Dashboard | Done | ✅ Entregado | — |
| `/admin/users` | Done | ✅ Entregado | — |
| `/admin/games` | Done | ✅ Entregado | — |
| `/admin/floors` | Done | ✅ Entregado | — |
| `/admin/players` | Done | ✅ Entregado | — |
| `/admin/competitions` | Done | ✅ Entregado | — |
| `/admin/masters` | Done | ✅ Entregado | — |
| `/admin/courses` | Done | ✅ Entregado | — |
| `/admin/academia-content` | Done | ✅ Entregado | — |
| `/admin/1pass` (config) | Process | ✅ Entregado | — |
| `/admin/pass-benefits` | Done | ✅ Entregado | — |
| `/admin/discounts` | Done | ✅ Entregado | — |
| `/admin/enrollments` | Done | ✅ Entregado | — |
| `/admin/user-profiles` | Done | ✅ Entregado | — |
| `/admin/social-links` | Done | ✅ Entregado | — |
| `/admin/aliados` | Done | ✅ Entregado | — |
| `/admin/submissions` | Done | ✅ Entregado | — |
| `/admin/token-orders` | ❌ No contemplado | ✅ Entregado | **⊕ Adición** |
| `/admin/bank-accounts` | ❌ No contemplado | ✅ Entregado | **⊕ Adición** |
| `/admin/pass-orders` (banco) | ❌ No contemplado | ✅ Entregado | **⊕ Adición** |
| `/admin/referral-codes` | ❌ No contemplado | ✅ Entregado | **⊕ Adición** |
| `/admin/brand-logos` | ❌ No contemplado | ✅ Entregado | **⊕ Adición** |
| `/admin/torneos` | ❌ No contemplado | ✅ Entregado | **⊕ Adición** |

### 1.3 Aplicación: app.1upesports.org

| Módulo | Estado EKX-005 | Estado actual | Nota |
|--------|----------------|---------------|------|
| `/app/login` | Done | ✅ Entregado | — |
| `/app` (Wallet — balance, send QR, receive QR) | Process | ✅ Entregado | — |
| `/app/identidad` (verificación documento) | Process | ✅ Entregado | — |
| `/app/pass` (status + compra) | Process | ✅ Entregado | — |
| `/app/academia` (mis cursos + contenido) | Process | ✅ Entregado | — |
| `/app/settings` (cuentas vinculadas) | Done | ✅ Entregado | — |
| `/app/onboarding` (wizard + referidos) | ❌ No contemplado | ✅ Entregado | **⊕ Adición** |
| `/app/beneficios` (verificación aliados) | ❌ No contemplado | ✅ Entregado | **⊕ Adición** |

**Resultado EKX-005: 100% del scope entregado.** Las secciones marcadas como "Process" en el contrato original están funcionando en producción. Los módulos marcados con **⊕ Adición** fueron implementados fuera del scope original.

---

## PARTE 2 — ENTREGABLES REVIEW 8 MAYO 2026

Estado de cada punto solicitado en el documento de revisión.

### Navbar
| Tarea | Estado |
|-------|--------|
| Academia → posición 2 (junto a Home) | ✅ Entregado v2.4.0 |
| Eliminar duplicación logo 1UP + texto | ✅ Entregado v2.4.0 |
| Corregir transparencia del header | ✅ Entregado v2.4.0 (opacidad 0.85) |
| JOIN NOW: eliminar hold-on-click, hover azul | ✅ Entregado v2.4.0 |
| Marketplace en el header | ✅ Entregado v2.5.0 |

### Home
| Tarea | Estado |
|-------|--------|
| Banner animado de marcas/aliados/patrocinadores | ✅ Entregado v2.5.0 (marquee infinito, admin CRUD) |
| 1UP Pass sección en home (visibilidad) | ✅ Entregado v2.4.0 |
| 1UP Pass: heading más grande + unificado | ✅ Entregado v2.4.0 |
| Talent Pipeline: eliminar números | ✅ Entregado v2.4.0 |
| Talent Pipeline: eliminar Training card | ✅ Entregado v2.4.0 |
| Talent Pipeline: Torneos → ruta propia | ✅ Entregado v2.4.0 + v2.6.0 |
| Crear Layout Marketplace en home | ✅ Entregado v2.5.0 |

### Torneos
| Tarea | Estado |
|-------|--------|
| Página dedicada /torneos | ✅ Entregado v2.6.0 |
| BD torneos (imagen, fecha, lugar, nombre, juego, premios) | ✅ Entregado v2.6.0 (schema base) |
| Cards: imagen, nombre, fecha | ✅ Entregado v2.6.0 |
| Admin CRUD torneos | ✅ Entregado v2.6.0 |
| CTA Inscribirse | ✅ Entregado v2.6.0 (botón funcional) |
| Premio: estructura primer/segundo/tercer puesto + tipo | ✅ Entregado v2.7.1 (tabla `tournament_prizes`, editor en admin, badge + podium) |
| Filtros: mes del año + juego | ✅ Entregado v2.7.1 (selects dinámicos, botón limpiar) |
| Popup "Ver más" con detalles del torneo | ✅ Entregado v2.7.1 (`TournamentDetailModal` con podium completo) |
| Hall of Fame: puntos por posición (10/5/3) | ✅ Entregado v2.9.0 (`tournament_results` + `hall_of_fame` VIEW) |
| Torneos Internacionales (sección separada) | ✅ Entregado v2.9.0 (tabla `international_tournaments`, admin CRUD, sección pública) |
| Inscribirse → enviar email + sugerir calendario | ✅ Entregado v2.8.0 (Resend + CalendarPromptModal + .ics) |
| Inscripción: email de confirmación | ✅ Entregado v2.8.0 (email con detalles + CTA Google Calendar) |

### Masters & Academia
| Tarea | Estado |
|-------|--------|
| Unificar Masters + Academia en sección clara | ✅ Entregado v2.10.0 (Masters integrados en /academia con perfiles completos; /masters redirige) |

### Generales
| Tarea | Estado |
|-------|--------|
| Popup sugerencia 1UP Pass | ✅ Entregado v2.7.0 (sticky banner, 3s delay, dismissable) |
| Habilitar pago por transferencia bancaria (pass) | ✅ Entregado v2.3.0 |
| Política de Privacidad (/privacidad) | ✅ Entregado v2.3.0 |
| Habeas data al crear cuenta | ✅ Entregado (onboarding wizard) |
| Emails por compra de tokens / pass | ✅ Entregado v2.3.0 (Resend) |
| Emails por inscripción torneos | ✅ Entregado v2.8.0 (Resend, email con detalles + CTA Google Calendar) |
| MercadoPago automático | ⏳ Pendiente (bloqueado — 1UP debe habilitar procesador) |

---

## PARTE 3 — ADICIONES FUERA DEL SCOPE EKX-2026-005

Funcionalidades implementadas que **no estaban contempladas** en el contrato original. Valoradas a la tarifa de desarrollo adicional: **$150.000 COP/hora**.

### 3.1 Flujo OTC — Compra de tokens $1UP

Sistema completo para que usuarios compren $1UP mediante transferencia bancaria con aprobación manual del administrador.

| Componente | Descripción |
|-----------|-------------|
| `BuyTokensWizard` | Wizard completo: selección banco → monto → upload comprobante → confirmación |
| `MisOrdenes` + `AdminTokenOrdersClient` | Historial órdenes usuario + panel admin (aprobar con envío on-chain / rechazar) |
| `/api/user/token-orders` | API de creación y cancelación de órdenes |
| `/api/admin/token-orders` | API de listado, aprobación (wallet send EIP-7702) y rechazo |
| `/api/user/upload-comprobante` | Upload seguro de comprobante a Supabase Storage |
| `/api/bank-accounts` | Listado de cuentas bancarias para el modal de compra |
| `/admin/bank-accounts` | CRUD completo de cuentas bancarias destino |
| `token_purchase_orders` | Tabla completa con lifecycle: pending → approved/rejected/cancelled |
| Notificaciones Resend | Email al usuario y al admin en cada evento de orden |

**Estimación:** 20 horas → **$3.000.000 COP**

---

### 3.2 Flujo de Compra del 1UP Pass (transferencia bancaria)

Camino alternativo al pago con tokens: el usuario puede adquirir el 1UP Pass mediante transferencia bancaria, con comprobante y aprobación manual.

| Componente | Descripción |
|-----------|-------------|
| `BuyPassWizard` (ruta bancaria) | Selector de método → banco → upload comprobante → confirmación |
| `MisPassOrders` + `AdminPassOrdersClient` | Historial usuario + panel admin con aprobar/rechazar |
| `/api/user/pass-orders` (bank path) | Creación de orden bancaria con comprobante |
| `/api/admin/pass-orders` (approve/reject) | Aprobación activa el pass en DB |
| `/admin/pass-bank-orders` | Vista filtrada de órdenes bancarias pendientes |
| `pass_orders` (bank path) | Extensión del schema con payment_method, bank_account_id, comprobante_url |
| Notificaciones Resend | Email usuario + admin en aprobación/rechazo |

**Estimación:** 16 horas → **$2.400.000 COP**

---

### 3.3 Onboarding Wizard + Sistema de Referidos

Flujo obligatorio de primera vez que recoge datos del perfil, verifica edad, captura consentimiento y procesa códigos de referido.

| Componente | Descripción |
|-----------|-------------|
| `/app/onboarding` | Wizard multi-paso: nombre/apellidos, username, documento, barrio, nacimiento, juegos favoritos, código referido, habeas data |
| Verificación edad 14+ | Validación birth_date en servidor + cliente |
| Habeas data checkbox | Consentimiento explícito vinculado a Política de Privacidad (Ley 1581) |
| `referral_codes` | Tabla + CRUD admin: código único, max_uses, used_count, active |
| `/admin/referral-codes` | Panel admin completo de códigos de referido |
| `/api/user/referral-codes/validate` | Validación pública en tiempo real |
| `/api/user/onboarding` | API que consolida todos los campos del wizard |

**Estimación:** 18 horas → **$2.700.000 COP**

---

### 3.4 Gas Sponsorship (EIP-7702 — Privy Native)

Integración de patrocinio de gas para que los usuarios puedan enviar tokens desde embedded wallets sin pagar gas de su bolsillo.

| Componente | Descripción |
|-----------|-------------|
| Privy EIP-7702 | Upgrade inline de embedded wallet a Kernel smart contract (misma dirección) |
| `useSendTransaction` con `sponsor: true` | Patrón implementado en WalletTab, BuyPassWizard y AdminTokenOrdersClient |
| Privy Dashboard setup | Gas Sponsorship habilitado en Base mainnet + TEE execution confirmado |

**Estimación:** 6 horas → **$900.000 COP**

---

### 3.5 Verificación Comfenalco + Aliados

Sistema de verificación de afiliación a entidades aliadas para desbloquear descuentos automáticos en la academia.

| Componente | Descripción |
|-----------|-------------|
| `/app/beneficios` | UI de verificación por cédula para aliados |
| `/api/user/comfenalco/verify` | Stub funcional con manejo de errores (ComfenalcoConfigError → HTTP 503) |
| `/api/user/aliado/verify` | Verificación genérica por aliado ID |
| `src/lib/comfenalco.ts` | Cliente API preparado — activa con las credenciales |
| Descuento automático en checkout | Sistema discount_rules integrado con estado de afiliación |

**Estimación:** 8 horas → **$1.200.000 COP**

---

### 3.6 Review 8 Mayo 2026 — v2.4.0 a v2.10.0

Iteración completa de mejoras visuales, nuevas secciones y optimizaciones técnicas derivadas del documento de revisión.

| Versión | Entregables principales | Horas est. |
|---------|------------------------|-----------|
| v2.4.0 | Navbar polish, glass opacity, Talent Pipeline redesign, 1UP Pass heading | 6h |
| v2.5.0 | Brands Banner (marquee + admin CRUD + brand_logos), Marketplace section, navbar link | 10h |
| v2.6.0 | /torneos página pública + admin CRUD + tournaments DB | 10h |
| v2.7.0 | 1UP Pass sticky banner | 3h |
| v2.7.1 | Premio por puesto (tournament_prizes), filtros mes+juego, popup detalle | 8h |
| v2.8.0 | Inscripción torneos (RPC atómico, RegisterButton, CalendarPromptModal, email) | 10h |
| v2.9.0 | Torneos Internacionales + Hall of Fame (tournament_results, hall_of_fame VIEW, admin) | 12h |
| v2.10.0 | Masters fusionados en Academia, cédula obligatoria, fix emails pass | 3h |

**Subtotal: 62 horas → $9.300.000 COP**

---

### 3.7 Infraestructura & Seguridad Base

| Componente | Descripción |
|-----------|-------------|
| `src/proxy.ts` | Subdomain routing Next.js 16 nativo (app.* → /app, admin.* → /admin) |
| Logout en app shell | AppSidebar + AppBottomNav con logout + redirect |
| metadataBase | Corrección de dominio canónico (1upesports.org) |
| Política de Privacidad `/privacidad` | Página legal completa conforme Ley 1581 de Colombia |
| Admin auth pattern | verifyToken + resolveUserEmail + isAdmin en cada endpoint |
| revalidatePath | Invalidación de caché correcta en todas las mutaciones |

**Estimación:** 8 horas → **$1.200.000 COP**

---

## RESUMEN DE VALORACIÓN

| Ítem | Horas | Valor COP |
|------|-------|-----------|
| EKX-2026-005 (scope original) | — | $20.000.000 |
| Flujo OTC — Compra tokens $1UP | 20h | $3.000.000 |
| Flujo compra 1UP Pass (banco) | 16h | $2.400.000 |
| Onboarding Wizard + Referidos | 18h | $2.700.000 |
| Gas Sponsorship (EIP-7702) | 6h | $900.000 |
| Verificación Comfenalco + Aliados | 8h | $1.200.000 |
| Review 8 Mayo 2026 (v2.4.0–v2.10.0) | 62h | $9.300.000 |
| Infraestructura & Seguridad base | 8h | $1.200.000 |
| **TOTAL ADICIONES** | **138h** | **$20.700.000** |
| **TOTAL PROYECTO** | | **$40.700.000** |

> Tarifa de referencia adiciones: **$150.000 COP/hora** (según EKX-2026-005, Parte 4).

---

## PARTE 4 — PENDIENTES DE ALTO IMPACTO

Items identificados del Review 8 Mayo. Los entregados en v2.7.1 se marcan ✅.

| Prioridad | Tarea | Complejidad | Valor estimado | Estado |
|-----------|-------|-------------|----------------|--------|
| ✅ | Torneos: estructura de premios (1/2/3 puesto, tokens o COP) | Media | ~8h / $1.200.000 | Entregado v2.7.1 |
| ✅ | Torneos: filtros por mes y categoría | Baja | ~4h / $600.000 | Entregado v2.7.1 |
| ✅ | Torneos: popup "Ver más" con detalles completos | Baja | ~4h / $600.000 | Entregado v2.7.1 |
| ✅ | Torneos: flujo de inscripción (email confirmación + calendario) | Media | ~10h / $1.500.000 | Entregado v2.8.0 |
| ✅ | Torneos Internacionales (sección separada, BD propia) | Media | ~10h / $1.500.000 | Entregado v2.9.0 |
| ✅ | Hall of Fame: sistema de puntos por posición en torneo | Alta | ~16h / $2.400.000 | Entregado v2.9.0 |
| ✅ | Academia + Masters unificados en una sola página | Baja | ~3h / $450.000 | Entregado v2.10.0 |
| 🟢 Baja | MercadoPago automático | Alta | Bloqueado — 1UP debe habilitar procesador | ⏳ Bloqueado |
| 🟢 Baja | Cloudflare Stream (video academia) | Alta | ~20h / $3.000.000 — pendiente credenciales | ⏳ Bloqueado |

---

*Documento preparado por Ekinoxis Labs — 10 de mayo de 2026*  
*Referencia contrato base: EKX-2026-005*
