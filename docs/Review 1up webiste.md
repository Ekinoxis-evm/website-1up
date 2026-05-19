# Review 8 May 2026 — Estado actualizado al 19 de mayo de 2026

**Tareas / conclusiones**

- [x] Habilitar correos por  
      - [x] La compra de 1UP tokens (aprobado / rechazado)  
      - [x] La compra de 1UP pass (banco: aprobado / rechazado)  
      - [x] Inscripción a torneos organizados por 1UP (confirmación + .ics adjunto + notificación al admin)  
- [ ] Habilitar forma de pago automática   
      - [ ] Pendiente que 1UP habilite el procesador de pagos MercadoPago Colombia ← **bloqueo externo**  
      - [x] Pago sin tokens: transferencia bancaria + comprobante habilitado para tokens, pass y cursos  
- [x] Cambiar 1UP pass position de la página de Tower a la página Home  
- [x] Política de Privacidad   
      - [x] Página [https://www.1upesports.org/privacidad](https://www.1upesports.org/privacidad)   
      - [x] Habeas data (checkbox + política) incluido en el wizard de onboarding  
- [x] Plan técnico  
      - [x] FICHA-TECNICA.md v2.4 — documentación completa de arquitectura, seguridad, endpoints, tablas e integraciones

---

# Review 8 May 2026

## **NAVBAR**

- [ ] Ajustar posición de "Academia" → más cerca de la esquina izquierda, junto a "Home" ← pendiente
- [ ] Reducir redundancia: eliminar duplicación entre logo 1UP + texto 1UP ← pendiente
- [ ] Quitar o ajustar la transparencia del header ← pendiente (glass-panel es el estándar de diseño actual; requiere decisión de diseño)

## **HOME**

**Marcas aliadas — Layouts**

- [x] Banner animado unificado (marcas, patrocinadores y aliados en una sola marquee) — desde admin: Aliados → toggle "Mostrar en banner"
- [ ] Background: Blanco ← pendiente de decisión de diseño
- [x] Carga de logos en formato .png o .svg — hasta 5 MB, soportado en el admin
- [ ] Tamaño 80px (logos en la marquee) ← pendiente ajuste visual

**1UP Pass layout**

- [x] Sección del 1UP Pass en el home — beneficios visibles sin ir a Gaming Tower
- [x] 1UP Pass también en Gaming Tower (doble presencia)
- [ ] Unificar el texto + hacer el nombre más grande ← pendiente

**Talent Pipeline Layout**

- [x] Error crítico resuelto: torneos ya tienen página propia `/torneos` — no redirige a "Team"
- [ ] Quitar los números de la sección "Sobre Nosotros" ← pendiente
- [x] Links de redirección corregidos:
      - [x] Recreativo → `/recreativo`
      - [x] Academia → `/academia`
      - [x] Torneos → `/torneos`
      - [x] "Training" eliminado

**Marketplace**

- [x] Layout del marketplace en el home — sección con features y CTA

## **TORNEOS \[Página\]**

- [x] Página dedicada `/torneos` — implementada y funcional

**Torneos 1UP**

- [x] BD para crear un torneo:
  - [x] Pieza gráfica (imagen hasta 5 MB)
  - [x] Fecha y hora
  - [x] Lugar (presencial / online / mixto)
  - [x] Nombre con URL tipo slug (ej: `/torneos/copa-valorant`)
  - [x] Categoría y juego (basado en la categoría)
  - [x] Premios por posición (1°/2°/3°) en $1UP tokens, COP o ambos
  - [x] Puntaje Hall of Fame (1°: 10pts, 2°: 5pts, 3°: 3pts)
  - [x] Sponsor (nombre, logo, website)
- [x] Cards: imagen, nombre, fecha, estado (próximo/en vivo/finalizado), badges
- [x] "Ver más" → página de detalle `/torneos/[slug]` con premios, descripción y REGISTRARME
- [x] Agregar al calendario: Google Calendar link + .ics adjunto por email
- [x] Inscribirse → confirmación por email + sugerencia de calendario en modal post-inscripción
- [x] Filtros por mes y por juego/categoría
- [x] Entrega de premios on-chain ($1UP) y COP desde el admin con registro en cadena

**Torneos Internacionales**

- [x] BD para crear torneo internacional:
  - [x] Nombre
  - [x] Organizador
  - [x] Fecha
  - [x] País y Ciudad
  - [x] Link de inscripción (opcional)

**Hall of Fame 1UP**

- [x] Tabla de campeones con puntos por posición en torneos de 1UP

**Hall of Fame 1UP Tower**

- [x] Jugadores con puntos acumulados (vista pública + admin con resultados por torneo)

## **MASTER & ACADEMIA:**

- [x] Masters y Academia unificados en una sola sección clara — Masters en `/academia`, acceso de contenido en `/app/academia`
- [x] Currículum por curso para usuarios inscritos (`/app/academia/[courseId]`): video intro, módulos, sesiones, documentos
- [x] Videos protegidos por Cloudflare Stream (JWT RS256, solo para inscritos)

## **MARKETPLACE**

- [ ] Agregar Marketplace en el header / navbar ← pendiente
- [x] Marketplace en el home (sección con features y CTA)

## **GENERALES**

- [ ] Popup que sugiera comprar el 1UP Pass — no implementado ← pendiente
- [ ] Interacción hold-on-click: cambiar a click inmediato con hover azul ← pendiente verificación en producción
- [x] Calendario de cobertura del 1UP Pass — visual por días en `/app/pass`
- [x] Compra de cursos habilitada (token + banco) sin MercadoPago automático
- [x] CommunitySection con invitaciones a Discord y WhatsApp en home y academia
- [x] Pass admin grant — admin puede conceder el pass con fecha retroactiva
