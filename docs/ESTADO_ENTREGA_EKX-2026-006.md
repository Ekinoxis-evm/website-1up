# ESTADO DE ENTREGA — EKX-2026-006
## 1UP Gaming Tower × Ekinoxis Labs

**Fecha de corte:** 11 de mayo de 2026  
**Versión en producción:** v2.14.0  
**Referencia contractual:** EKX-2026-005

---

## RESUMEN EJECUTIVO

| | |
|--|--|
| **Scope original entregado** | 100% — todas las páginas y módulos del contrato EKX-2026-005 están funcionando en producción |
| **Funcionalidades adicionales** | ~196 horas de desarrollo fuera del scope original, implementadas y en producción |
| **Estado del proyecto** | Activo — dos integraciones pendientes por credenciales externas (MercadoPago automático, Cloudflare Stream) |
| **Total facturado adiciones** | $29.400.000 COP (~196h × $150.000/h) |
| **Total proyecto** | **$49.400.000 COP** |

---

## 1. PLATAFORMA WEB — 1upesports.org

### 1.1 Páginas públicas — Estado actual

| Página | Contenido actual | Notas de versión |
|--------|-----------------|-----------------|
| `/` — Inicio | Hero · Banner de marcas animado · 1UP Pass (beneficios) · **Sección Academia** · **Sección Torneos** · Marketplace (coming soon) · "Sobre Nosotros" (3 pilares del ecosistema) · Formulario de reclutamiento | v2.14.0: GamesGallery retirada; reemplazada por AcademiaSection y TorneosSection. TalentPipeline renombrado a "Nuestro Ecosistema" |
| `/gaming-tower` | Hero · **1UP Pass (beneficios)** · Equipamiento · 6 plantas · **Juegos por categoría** (imagen de categoría + grid de juegos) · Mapa | v2.14.0: PassSection añadida debajo del hero; JuegosDisplay integrado al final (mismo layout que /juegos tenía). Juegos movidos aquí desde home |
| `/torneos` | Hall of Fame leaderboard · Torneos nacionales (filtros por mes y juego) · Torneos internacionales · Formulario de reclutamiento | v2.14.0: RecruitmentForm añadido al final |
| `/torneos/[id]` | Página de detalle por torneo — imagen, badges de estado/juego/ubicación, podio de premios, botón REGISTRARME | v2.14.0: bug de login cross-subdominio resuelto; botón ya no queda en estado cargando |
| `/torneos/[id]/checkin` | Check-in por QR — login inline (sin redirect), valida inscripción, marca asistencia | — |
| `/academia` | Catálogo de cursos · Perfiles de masters · Checkout MercadoPago | — |
| `/recreativo` | Jornadas corporativas y recreativas | — |
| `/marketplace` | Página coming soon — features, paga con $1UP · **Links de redes sociales dinámicos desde admin** | v2.14.0: redes sociales reales desde BD (antes era texto estático) |
| `/privacidad` | Política de Privacidad y Tratamiento de Datos — Ley 1581 | — |
| `/team` | ~~Roster profesional~~ → **Redirige a `/`** | v2.14.0: página retirada. Masters en `/academia`; reclutamiento en `/torneos`. URL antigua sigue funcionando sin error 404 |
| `/juegos` | ~~Catálogo standalone~~ → **Redirige a `/gaming-tower`** | v2.14.0: página retirada. Juegos integrados en la Tower con el mismo layout por categorías. URL antigua sigue funcionando sin error 404 |
| `/perfil` | → Redirige a `app.1upesports.org` | Ruta legacy preservada |

> **Rutas eliminadas como páginas independientes pero no rotas:** `/team` y `/juegos` ahora redirigen a contenido equivalente. Ningún enlace externo queda en 404.

### 1.2 Características transversales

| Característica | Estado |
|---------------|--------|
| SEO completo — título, descripción, Open Graph, Twitter Card, canonical en todas las páginas | ✅ Entregado |
| Datos estructurados JSON-LD (Google rich results) para el sitio y los torneos | ✅ Entregado |
| Sitemap automático (`/sitemap.xml`) y robots.txt (`/robots.txt`) | ✅ Entregado — `/team` y `/juegos` removidos del sitemap |
| App instalable en celular (PWA) — icono en pantalla de inicio, modo offline | ✅ Entregado |
| Navegación móvil (MobileBottomNav) — 5 tabs fijos: Home · Torneos · Academia · Store · **Perfil** | v2.14.0: tab PERFIL siempre visible; autenticado → app subdomain, no autenticado → login |
| TopAppBar — nav principal en desktop | v2.14.0: ícono de admin removido; solo acceso desde `admin.1upesports.org` |
| Footer — links de redes sociales dinámicos + Privacidad | v2.14.0: link de Admin removido del footer público |

---

## 2. PANEL DE ADMINISTRACIÓN — admin.1upesports.org

### 2.1 Módulos del scope original

| Módulo | Función | Estado |
|--------|---------|--------|
| Dashboard | KPIs y accesos rápidos | ✅ Entregado |
| Juegos y Categorías | CRUD con carga de imágenes | ✅ Entregado |
| Gaming Tower | Edición de las 6 plantas + imágenes | ✅ Entregado |
| Equipo (Players) | Roster + fotos + redes sociales | ✅ Entregado |
| Competencias | Historial de torneos ganados por el equipo | ✅ Entregado |
| Masters | Perfiles completos, categorías, redes, cursos asignados | ✅ Entregado |
| Cursos | CRUD de cursos + gestión de contenido (videos / docs / quiz) | ✅ Entregado |
| 1UP Pass — Config | Precio, wallet destino, duración, toggle activo/inactivo | ✅ Entregado |
| 1UP Pass — Beneficios | CRUD de beneficios del pass | ✅ Entregado |
| Descuentos | Reglas de descuento por afiliación o promo | ✅ Entregado |
| Enrollments | Registro de pagos de academia (solo lectura) | ✅ Entregado |
| Perfiles de usuario | Vista de perfiles registrados en la app | ✅ Entregado |
| Redes sociales (footer) | URLs por plataforma para el footer | ✅ Entregado |
| Aliados | CRUD de organizaciones aliadas | ✅ Entregado |
| Submissions | Formularios de reclutamiento recibidos | ✅ Entregado |
| Usuarios admin | Gestión de accesos al panel | ✅ Entregado |

### 2.2 Módulos adicionales (fuera del scope original)

| Módulo | Función | Estado |
|--------|---------|--------|
| Órdenes de tokens ($1UP) | Lista, aprobación y rechazo de compras OTC con envío on-chain | ✅ Entregado |
| Cuentas bancarias | CRUD de cuentas destino para transferencias | ✅ Entregado |
| Órdenes de Pass (banco) | Aprobación / rechazo de pagos por transferencia | ✅ Entregado |
| Códigos de referido | Crear y gestionar códigos con límite de uso | ✅ Entregado |
| Logos de marcas | Marquee animado en home — CRUD con orden y enlace | ✅ Entregado |
| Torneos nacionales | CRUD completo: imagen, juego, fecha, premios (1°/2°/3°), capacidad, estado | ✅ Entregado |
| Torneos internacionales | CRUD: organizador, país, ciudad, enlace de inscripción externo | ✅ Entregado |
| Inscripciones a torneos | Lista de inscritos por torneo, marcar asistencia / no asistió | ✅ Entregado |
| Resultados (Hall of Fame) | Asignar 1°/2°/3° por torneo → genera la tabla de campeones pública | ✅ Entregado |
| Imágenes del sitio | Sección de equipamiento (Gaming Tower) y ruta de aprendizaje (Academia) | ✅ Entregado |
| **Logout en panel admin** | Botón "Cerrar Sesión" en el sidebar — cierra sesión Privy y redirige a `/admin/login` | ✅ v2.14.0 |

---

## 3. APLICACIÓN DE USUARIO — app.1upesports.org

| Módulo | Función | Estado |
|--------|---------|--------|
| Login | Acceso con email o Google (Privy) — redirige de vuelta al torneo u otra página tras autenticarse | ✅ Entregado |
| Onboarding | Wizard obligatorio al crear cuenta: datos personales, documento, juegos, código referido, habeas data Ley 1581 | ✅ Entregado |
| Wallet | Balance $1UP, enviar (QR), recibir (QR), historial de transacciones, órdenes de compra | ✅ Entregado |
| Mis Torneos | Listado de inscripciones del usuario con estado (inscrito / asistió / cancelado / no asistió) | ✅ Entregado |
| Beneficios | Verificación de afiliación a aliados (Comfenalco, Comfandi, universidades) para descuentos | ✅ Entregado |
| 1UP Pass | Estado del pass activo + compra: tokens on-chain o transferencia bancaria | ✅ Entregado |
| Academia | Mis cursos inscritos + acceso al contenido | ✅ Entregado |
| Ajustes | Dos pestañas: Identidad (edición de perfil, documento) + Seguridad (cuentas vinculadas) | ✅ Entregado |

---

## 4. FUNCIONALIDADES ADICIONALES — Detalle y Valoración

Todas las funcionalidades listadas a continuación fueron implementadas **fuera del scope del contrato EKX-2026-005** a tarifa de $150.000 COP/hora.

### 4.1 Compra de tokens $1UP (flujo OTC)
Sistema que permite al usuario comprar $1UP mediante transferencia bancaria. Selecciona el monto, elige la cuenta bancaria destino, sube el comprobante de pago y el administrador aprueba o rechaza la orden. Al aprobar, los tokens son enviados on-chain automáticamente desde la wallet del admin. El usuario y el admin reciben notificaciones por email en cada etapa.

**20 horas → $3.000.000 COP**

---

### 4.2 Compra del 1UP Pass por transferencia bancaria
Camino alternativo para adquirir el 1UP Pass sin necesitar tokens. El usuario elige pago bancario, sube el comprobante y espera aprobación del administrador. Al aprobar, el pass se activa en la base de datos con fecha de vencimiento calculada automáticamente (con acumulación si ya tenía un pass activo).

**16 horas → $2.400.000 COP**

---

### 4.3 Onboarding + Sistema de Referidos
Flujo obligatorio de primera vez que asegura la recolección de datos del usuario desde el primer inicio de sesión. Incluye: nombre completo, @username, documento de identidad (obligatorio), barrio, fecha de nacimiento (con validación de edad mínima 14 años), juegos favoritos, código de referido (opcional), y aceptación explícita del habeas data conforme a la Ley 1581. Los códigos de referido son gestionados por el administrador con control de usos máximos.

**18 horas → $2.700.000 COP**

---

### 4.4 Gas Sponsorship (envíos sin costo de gas para el usuario)
Los usuarios pueden enviar tokens $1UP desde su wallet embebida sin pagar comisiones de red (gas). Privy patrocina automáticamente el costo de cada transacción en Base mainnet. Esto aplica al envío de tokens, compra del pass y aprobación de órdenes OTC desde el admin.

**6 horas → $900.000 COP**

---

### 4.5 Verificación de afiliación a aliados
Sistema que permite al usuario verificar su afiliación a organizaciones aliadas (Comfenalco, Comfandi, universidades) para desbloquear descuentos automáticos en la academia. La integración técnica con cada aliado está preparada y activa cuando se proveen las credenciales de API.

**8 horas → $1.200.000 COP**

---

### 4.6 Sistema completo de torneos (v2.6.0 – v2.13.0)
Módulo de torneos construido desde cero, no contemplado en el contrato original.

| Funcionalidad | Detalle |
|---------------|---------|
| Página pública `/torneos` | Cards con imagen, fecha, juego, premios, estado (próximo / en vivo / finalizado) |
| Torneos nacionales — admin CRUD | Crear torneos con premios por posición (tokens o COP), capacidad, tipo de lugar |
| Torneos internacionales | Sección separada para torneos externos con enlace de inscripción |
| Inscripción de jugadores | Botón de inscripción con confirmación por email + sugerencia de calendario (Google / .ics) |
| Filtros | Por mes y por juego |
| Página de detalle por torneo | Ruta dedicada `/torneos/[id]` con imagen, premios, descripción y CTA de inscripción |
| Hall of Fame — Tabla de Campeones | Ranking automático por puntos (10/5/3) según posición en cada torneo |
| Torneos ganados por el 1UP Team | Historial de competencias externas del equipo, visible en `/torneos` |
| Check-in por código QR | El admin genera un QR por torneo; los participantes lo escanean, confirman asistencia sin salir del sitio |

**78 horas → $11.700.000 COP**

---

### 4.7 Auditoría de seguridad
Revisión completa de todos los endpoints y flujos de pago antes del primer despliegue a producción. Se corrigieron tres vulnerabilidades: protección contra acceso cruzado a comprobantes de otros usuarios, autenticación faltante en un endpoint administrativo, y validación de tipos de archivo en uploads.

**4 horas → $600.000 COP**

---

### 4.8 Mejoras post-entrega (v2.10.1 – v2.12.0)
Iteración adicional tras el review de mayo 2026.

| Entregable | Descripción |
|-----------|-------------|
| Torneos en navegación | Sección Torneos visible en el menú principal y menú móvil |
| Página Marketplace (coming soon) | Página de presentación con features y CTA a Instagram |
| App instalable (PWA) | La web puede instalarse como app en cualquier celular, con ícono, pantalla de carga y modo offline |
| Admin usable en móvil | Panel de administración con menú deslizable optimizado para teléfonos |
| SEO completo | Metadata, Open Graph, Twitter Card y datos estructurados en todas las páginas públicas; sitemap y robots para motores de búsqueda |

**20 horas → $3.000.000 COP**

---

### 4.9 Mejoras de la app de usuario (v2.13.0)
Iteración de experiencia en `app.1upesports.org`.

| Entregable | Descripción |
|-----------|-------------|
| Mis Torneos | Nueva sección en la app donde el usuario ve todas sus inscripciones, estado de asistencia y accede al detalle del torneo |
| Ajustes unificados | Identidad y Seguridad fusionados en una sola página con pestañas, simplificando la navegación |

**6 horas → $900.000 COP**

---

### 4.10 Restructura de navegación y UX (v2.14.0)
Simplificación de la arquitectura de información del sitio público y corrección de bugs de flujo de inscripción.

| Entregable | Descripción |
|-----------|-------------|
| Home enriquecido | Nuevas secciones AcademiaSection y TorneosSection — cada una con propuesta de valor, íconos y CTA directo a su sección. GamesGallery retirada del home (games viven en Tower) |
| "Sobre Nosotros" en home | Sección TalentPipeline reenmarcada como "Nuestro Ecosistema" — explica los tres pilares (Recreativo · Academia · Torneos) en lugar de hablar de un funnel de talento |
| Juegos integrados en Tower | Página `/juegos` retirada como standalone; los juegos ahora se muestran en `/gaming-tower` con el mismo layout por categorías (imagen de categoría + grid de títulos). `/juegos` redirige sin romper URLs externas |
| Reclutamiento en Torneos | Formulario de reclutamiento añadido al final de `/torneos` — punto de conversión natural donde los competidores ya están |
| Página `/team` consolidada | Roster retirado como sección dedicada — los Masters viven en `/academia`, reclutamiento en `/torneos`. `/team` redirige sin romper URLs externas |
| 1UP Pass en Tower | PassSection (beneficios) añadida a `/gaming-tower` para comunicar el valor del pass en contexto |
| Fix inscripción a torneos | Botón REGISTRARME funcionaba solo si el usuario ya tenía sesión en `app.1upesports.org`. Resuelto con login modal inline (mismo dominio), auto-registro tras autenticación, y corrección de estado colgado por falta de manejo de errores |
| Redes sociales en Marketplace | Íconos de redes sociales dinámicos en `/marketplace`, leídos desde la BD (antes era texto estático con sugerencia de Instagram) |
| Tab PERFIL siempre visible | Menú móvil inferior muestra siempre el tab PERFIL como 5to elemento, independiente del estado de autenticación |
| Logout en admin sidebar | Botón de cierre de sesión añadido al panel de administración |

**18 horas → $2.700.000 COP**

---

### 4.11 Infraestructura y seguridad base
Arquitectura multi-subdominio (`1upesports.org`, `app.`, `admin.`), sistema de autenticación de administradores, invalidación automática de caché, política de privacidad Ley 1581, y configuración del dominio canónico.

**8 horas → $1.200.000 COP**

---

## 5. RESUMEN FINANCIERO

| Concepto | Horas | Valor |
|----------|-------|-------|
| EKX-2026-005 — Scope original | — | $20.000.000 COP |
| Compra de tokens $1UP (OTC) | 20h | $3.000.000 COP |
| Compra del 1UP Pass (banco) | 16h | $2.400.000 COP |
| Onboarding + Sistema de Referidos | 18h | $2.700.000 COP |
| Gas Sponsorship (sin costo para el usuario) | 6h | $900.000 COP |
| Verificación de aliados + descuentos | 8h | $1.200.000 COP |
| Sistema de Torneos completo (incl. QR check-in) | 78h | $11.700.000 COP |
| Auditoría de seguridad | 4h | $600.000 COP |
| Mejoras post-entrega (PWA + SEO + nav) | 20h | $3.000.000 COP |
| Mejoras de la app de usuario (v2.13.0) | 6h | $900.000 COP |
| Restructura de navegación y UX (v2.14.0) | 18h | $2.700.000 COP |
| Infraestructura y seguridad base | 8h | $1.200.000 COP |
| **Total adiciones fuera del scope** | **~196h** | **$29.400.000 COP** |
| | | |
| **TOTAL PROYECTO** | | **$49.400.000 COP** |

> Tarifa adiciones: $150.000 COP/hora (según EKX-2026-005, Parte 4).

---

## 6. PENDIENTES

| Ítem | Razón del bloqueo | Acción requerida |
|------|------------------|-----------------|
| MercadoPago automático (cobro de academia sin intervención manual) | MercadoPago Colombia requiere que 1UP Gaming Tower habilite el procesador de pagos directamente en su cuenta | 1UP debe completar el proceso de habilitación con MercadoPago Colombia |
| Cloudflare Stream (videos de academia protegidos) | Pendiente de credenciales de Cloudflare | Compartir credenciales de cuenta Cloudflare con Ekinoxis para activar la integración |

---

*Preparado por Ekinoxis Labs — 11 de mayo de 2026*  
*Referencia contractual: EKX-2026-005*
