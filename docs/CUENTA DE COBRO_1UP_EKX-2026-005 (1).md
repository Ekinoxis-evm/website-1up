**CUENTA DE COBRO**

**EKX-2026-005**

| CLIENTE ![][image1] 1UP Gaming Tower Colombia's First Professional Esports Hub 1upesports.org | Fecha: 08 de Abril, 2026 Válido hasta: 30 de Abril, 2026 Moneda: COP |
| :---- | ----: |

**Descripción del servicio:**

Suministro de plataforma tecnológica bajo modelo Software as a Service (SaaS) e infraestructura de cómputo en la nube para el ecosistema 1UP Gaming Tower. Incluye aprovisionamiento de bases de datos, despliegue en red de entrega de contenido (CDN) y servicios de backend distribuido.

**Valor unitario:** $20.000.000 COP

**IVA:** 0% (O marcar la casilla de "Excluido")

**Nota**  
*Servicio excluido de IVA de conformidad con el Numeral 21 del Artículo 476 del Estatuto Servicio excluido de IVA de conformidad con el Numeral 21 del Artículo 476 del Estatuto Tributario. El prestador pertenece al Régimen Simple de Tributación y no es responsable de IVA (Código 48 no presente en RUT).*

  **INDICE**  

| 1\. | SERVICIOS ACEPTADOS |
| :---- | :---- |
|  | 1.1 Website  |  1.2 App |
| **2\.** | **SERVICIOS DE SOSTENIMIENTO** |
|  | 2.1 Recurrentes  |  2.2 Escalabilidad  |  2.3 Mantenimiento |
| **3\.** | **ACADEMIA** |
| **4\.** | **INTEGRACIONES PENDIENTES** |
| **5\.** | **STACK TECNOLÓGICO** |
| **6\.** | **FORMA DE PAGO** |

  **🌐 Advisory & Support:** Esta plataforma ha sido construida bajo el apoyo de **ETH CALI** (ethcali.org)

#   **PARTE 1: SERVICIOS ACEPTADOS**


##   **1.1 PLATAFORMA WEB: [1upesports.org](http://1upesports.org)** 

Sitio web público completamente funcional. Layout: TopAppBar \+ Footer \+ MobileBottomNav.

**Páginas Entregadas:**

| Ruta | Layout | Descripción | Status |
| :---- | :---- | :---- | :---: |
| **/ (home)** | No sidebar | Hero, Games Gallery, Recruitment | **Done** |
| **/gaming-tower** | SideNavBar | 6-floor breakdown, 1UP Pass, Map | **Done** |
| **/team** | SideNavBar | Pro roster \+ Hall of Fame \+ Recruitment | **Done** |
| **/masters** | SideNavBar | Masters showcase — coaches, social links (8 platforms) | **Done** |
| **/academia** | SideNavBar | Course catalog \+ MercadoPago checkout | **Done** |
| **/juegos** | SideNavBar | Games showcase by category | **Done** |
| **/recreativo** | No sidebar | Casual gaming section | **Done** |
| /store | SideNavBar | Buy merchandise (future) | **Future** |

**Panel de Administración: admin.1upesports.org:**

| Módulo | Control | Funcionalidad | Status |
| :---- | :---: | :---- | :---: |
| **/admin** | Admin | Dashboard: stat cards \+ quick links | **Done** |
| **/admin/users** | Admin | Admin user management | **Done** |
| **/admin/games** | Web | Games \+ categories CRUD (image upload) | **Done** |
| **/admin/floors** | Web | Gaming Tower Floor Info CRUD | **Done** |
| **/admin/players** | Web | Team roster CRUD (photo, social links) | **Done** |
| **/admin/competitions** | Web | Hall of Fame CRUD | **Done** |
| **/admin/masters** | Web+App | Masters CRUD (photo, 8 social links, categories, topics) | **Done** |
| **/admin/courses** | Web+App | Academia course CRUD (image, master, category) | **Done** |
| **/admin/academia-content** | App | Video/doc/quiz content per course (published toggle) | **Done** |
| **/admin/1pass** | Web+App | 1UP Pass: benefits, discounts, purchase history | **Process** |
| **/admin/pass-benefits** | Web+App | 1UP Pass benefits CRUD | **Done** |
| **/admin/discounts** | Web+App | Discount rules (Comfenalco, promo, aliado) | **Done** |
| **/admin/enrollments** | App | Payment log with revenue total (read-only) | **Done** |
| **/admin/user-profiles** | App | All registered users (Comfenalco status) | **Done** |
| **/admin/social-links** | Web | Footer social URLs (6 platforms) | **Done** |
| **/admin/aliados** | Web+App | Partner CRUD (NIT, email, API URL/key) | **Done** |
| **/admin/submissions** | Web | Recruitment form submissions (read-only) | **Done** |

**Control: Admin** \= interno | **Web** \= contenido público | **App** \= cuentas usuario | **Web+App** \= ambos

| WEB (Público \+ Admin) | $15.000.000 COP |
| :---- | ----: |

##  ** 1.2 APLICACIÓN: [app.1upesports.org](http://app.1upesports.org)** 

**Estado:** BETA, Auth-gated con Privy cookie

**Token Desplegado:**

| Token | Network | Address |
| :---- | :---- | :---- |
| **$1UP** | Base Mainnet | 0xF6813C71e620c654Ff6049a485E38D9494eFABdf |

**User Side — Módulos:**

| Módulo | Funcionalidad | Status |
| :---- | :---- | :---: |
| **/app/login** | Public login page (Privy → redirect dashboard) | **Done** |
| **💳 /app (Wallet)** | $1UP balance, send (QR scanner), receive (QR code) | **Process** |
| **🤳 /app/identidad** | Verification del documento con aliado | **Process** |
| **🚀 /app/pass** | 1UP Pass status \+ purchase (NFT unlock) | **Process** |
| **📖 /app/academia** | My enrolled courses \+ content access | **Process** |
| **⚙️ /app/settings** | Linked accounts \+ export private keys | **Done** |
| 🔒 Challenges | Create challenges between players | **Future** |

**Funcionalidades Core:**

| Funcionalidad | Descripción | Status |
| :---- | :---- | :---: |
| 🔐 Authentication | Privy (email, Google, Discord, passkey) | **Done** |
| ⛽ Gas Sponsorship | Privy native (Base, ETH, OP, Unichain) | **Done** |
| 📱 QR Scanner | Send/receive tokens via QR code | **Done** |

**Smart Contracts (Base Mainnet):**

| Contrato | Descripción | Status |
| :---- | :---- | :---: |
| IdentityNFTFactory | Deploys city IdentityNFT collections | **Done** |
| IdentityNFT | Subscription profile card, city-based | **Done** |
| CourseNFT | ERC-721 course \+ content gate, ERC-2981 royalties | **Done** |
| CourseFactory | Deploys CourseNFT contracts | **Done** |
| VersusContracts | EIP-4626 2-player escrow games | **Future** |

| APP BETA (Público \+ Admin) | $5.000.000 COP |
| :---- | ----: |

#   **PARTE 2: SERVICIOS DE SOSTENIMIENTO**  

**A. Costos Recurrentes**

**Únicos:**

| Servicio | USD | COP | Status |
| :---- | :---: | :---: | :---: |
| Adquisición dominio [1upesports.org](http://1upesports.org)  | $6 | $30.000 | **Done** |

**Anuales:**

| Servicio | USD/año | COP/año | Status |
| :---- | :---: | :---: | :---: |
| Renovación dominio [1upesports.org](http://1upesports.org)  | $10 | $40.000 | **Pending** |
| \*Email Gmail [hola@1upesports.org](mailto:hola@1upesports.org)  | $70 | $280.000 | **Pending** |

\*Puede ser adquirido directamente por el cliente.

**Mensuales:**

| Servicio | USD/mes | COP/mes |
| :---- | :---: | :---: |
| Supabase Pro (DB \+ Storage) | $25 | \~$105.000 |
| Vercel Pro (Hosting) | $20 | \~$85.000 |
| Cloudflare Creator Plan \+10.000 minutos de grabación | $50 | \~$210.000 |
| **TOTAL INFRAESTRUCTURA BASE** | **\~$45** | **\~$400.000** |

**B. Escalabilidad (Privy según MAU)**

| Tier | MAU | USD/mes | COP/mes |
| :---: | :---: | :---: | :---: |
| **FREE** | 0 \- 499 | $0 | **$0** |
| **CORE** | 500 \- 2,499 | $345 | **\~$1.450.000** |
| **SCALE** | 2,500 \- 9,999 | $545 | **\~$2.290.000** |

**C. Mantenimiento Base — desde 15/06/2026**

| Servicio Incluido |  |
| :---- | ----- |
| • Actualizaciones de seguridad y dependencias | **$1.500.000** COP/mes |
| • Monitoreo uptime y performance 24/7 |  |
| • Corrección de bugs menores |  |
| • Soporte técnico prioritario |  |
| • Backups diarios y gestión de base de datos |  |
| • Gestión de plataforma Academia (pagos, inscripciones) |  |

#   **PARTE 3: ACADEMIA**


Distribución de regalías sugerida para cursos de Academia a través de cajas de compensación.

* Mercado objetivo: 6,000 usuarios   
* Categorías: Tecnología, Marketing, Legal

**Modelo de precios por Curso:**

| Nivel | Precio | Duración |
| :---- | :---: | :---: |
| Nivel Individual / Personal | **$100.000 COP** | 4 horas |
| Nivel Corporativo / Certificado | **$250.000 COP** | 4 horas |

**Modelo de Distribución de Regalías:**

| Distribución | Porcentaje |
| :---- | :---: |
| Ejecutor del curso (ETH CALI o Ekinoxis Labs) | **70%** |
| Pool de Incentivos $1UP (Recomendación) | **10%** |
| Socio distribuidor (1UP) | **20%** |

#   **PARTE 4: INTEGRACIONES PENDIENTES**


**Integración Comfenalco** (STUB — esperando API docs)

| ✓ API /api/user/comfenalco/verify — POST verificación por cédula |
| :---- |
| ✓ Campo user\_profiles.comfenalco\_afiliado: true/false |
| ✓ Descuento automático para afiliados verificados |

**Integración MercadoPago (**PLANNED — arch documented**)**

| ✓ MercadoPago SDK v2 para compra de cursos |
| :---- |
| ✓ Sistema discount\_rules configurable desde Admin Panel |
| ✓ Webhook HMAC-SHA256 para actualización de pagos |

**Cloudflare Stream — Video Academia** (PLANNED — arch documented)

| ○ Signed JWT tokens (1 h expiry) — videos solo para enrolled users |
| :---- |
| ○ requireSignedURLs: true — no URL sharing |
| ○ Direct creator uploads desde admin panel |
| **○ Estimado: Creator plan: $50 USD/mes (\~$210.000 COP)** |

**Mejoras futuras / Future Enhancements:**

| Desarrollo adicional bajo demanda | $150.000 COP/hora |
| :---- | ----: |

#   **PARTE 5: STACK TECNOLÓGICO**  

| Capa | Tecnología | Versión / Detalle |
| :---- | :---- | :---- |
| Framework | **Next.js** | v16 (App Router, Turbopack) |
| Lenguaje | **TypeScript** | Strict mode |
| Estilos | **Tailwind CSS** | V3 \- Neo-Brutalist Design |
| Auth | **Privy** | Email, Google, Discord \+ Gas Sponsorship |
| Database | **Supabase \+ Drizzle** | PostgreSQL, 16 tablas |
| Storage | **Supabase Storage** | images bucket (public, 5MB) |
| Payments | **MercadoPago** | SDK v2, Webhooks HMAC-SHA256 |
| Blockchain | **Ethereum / Base** | Base Mainnet (Chain ID: 8453\) |
| Smart Contracts | **Solidity \+ Foundry** | Solidity 0.8.28, Foundry 1.0 |
| Runtime | **Node.js** | v24 |

**Base de Datos (16 tablas):**

* Game\_categories  
*  games   
* players competitions  
* Courses  
* Masters  
* Pass\_benefits  
* floor\_info,   
* recruitment\_submissions,   
* user\_profiles, aliados,   
* discount\_rules,   
* enrollments,   
* academic content,   
* social links,   
* Admin users,  
* Executive commercials (pending)

#   **PARTE 6: FORMA DE PAGO**  

| Item | Primer Pago | Segundo Pago |
| :---: | :---: | :---: |
| **Valor** | **$10.000.000 COP** | **$10.000.000**  |
| **Fecha** | Antes del 15 de mayo del 2026 | Antes del 15 de junio del 2026 |
| **Metodo** | Efectivo | Efectivo |

- **importante:** Es relevante resaltar que hasta que **no exista un pago igual o superior al 30% del valor total,** no se activará la plataforma en los 3 dominios mencionados:

  - Website: [www.1upesports.org](http://www.1upesports.org)   
  - Aplicación a usuarios: [app.1upesporsts.org](http://app.1upesporsts.org)  
  - Panel admin: [admin.1upesports.org](http://admin.1upesports.org)


**ACEPTACIÓN**

| Por EKINOXIS LABS: | Por 1UP GAMING TOWER: |
| :---- | :---- |
| William Martínez Bolanos | Andrés Felipe Penagos |
| CC. | CC.  |
| CEO \- Ekinoxis Labs | CEO \- 1UP Gaming Tower |
|   |   |
| \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |
| Firma | Firma |
| Fecha: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | Fecha: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |
|   |   |

[image1]: <data:image/png;base64,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>