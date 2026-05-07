export const metadata = {
  title: "Política de Privacidad — 1UP Gaming Tower",
  description: "Política de tratamiento de datos personales de 1UP Gaming Tower Colombia, conforme a la Ley 1581 de 2012.",
};

const LAST_UPDATED = "6 de mayo de 2025";
const COMPANY = "1UP Gaming Tower Colombia S.A.S.";
const NIT = "En trámite de registro";
const ADDRESS = "Cali, Valle del Cauca, Colombia";
const EMAIL_CONTACT = "privacidad@1upesports.org";

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-background text-on-background">
      {/* Hero */}
      <div className="bg-surface-container-lowest py-16 px-6 md:px-24 border-b-8 border-primary-container">
        <p className="font-headline text-xs uppercase tracking-widest text-primary-container mb-4">
          Marco legal — Ley 1581 de 2012 · Decreto 1377 de 2013
        </p>
        <h1 className="font-headline font-black text-5xl md:text-6xl uppercase tracking-tighter leading-none mb-4">
          POLÍTICA DE<br /><span className="text-primary-container">PRIVACIDAD</span>
        </h1>
        <div className="h-1 w-24 bg-primary-container mb-6" />
        <p className="font-body text-on-surface/60 text-sm">
          Última actualización: {LAST_UPDATED}
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 md:px-8 py-16 space-y-14">

        {/* 1 */}
        <Section title="1. Identificación del Responsable">
          <p>
            <strong>{COMPANY}</strong>, con NIT {NIT}, con domicilio en {ADDRESS}, y correo de contacto{" "}
            <a href={`mailto:${EMAIL_CONTACT}`} className="text-primary hover:underline">{EMAIL_CONTACT}</a>,
            es el Responsable del tratamiento de los datos personales recopilados a través de la plataforma digital{" "}
            <strong>1UP Gaming Tower</strong> (en adelante, «la Plataforma»), de conformidad con la Ley Estatutaria 1581 de 2012
            y sus decretos reglamentarios.
          </p>
        </Section>

        {/* 2 */}
        <Section title="2. Marco Legal Aplicable">
          <p>El tratamiento de datos personales en la Plataforma se rige por:</p>
          <ul>
            <li>Ley 1581 de 2012 — Régimen General de Protección de Datos Personales de Colombia.</li>
            <li>Decreto 1377 de 2013 — Reglamentación parcial de la Ley 1581.</li>
            <li>Decreto 886 de 2014 — Registro Nacional de Bases de Datos (RNBD).</li>
            <li>Circulares de la Superintendencia de Industria y Comercio (SIC) en materia de protección de datos.</li>
          </ul>
        </Section>

        {/* 3 */}
        <Section title="3. Datos Personales Recopilados">
          <p>La Plataforma puede recopilar las siguientes categorías de datos personales:</p>

          <SubSection title="3.1 Datos de registro e identidad">
            <ul>
              <li>Nombres y apellidos.</li>
              <li>Dirección de correo electrónico.</li>
              <li>Tipo y número de documento de identidad (CC, CE, TI, PP, NIT).</li>
              <li>Fecha de nacimiento y barrio de residencia.</li>
              <li>Número de teléfono y código de país.</li>
              <li>Nombre de usuario (@username) elegido por el titular.</li>
            </ul>
          </SubSection>

          <SubSection title="3.2 Datos financieros y de pago">
            <ul>
              <li>Dirección de billetera digital en la red Base (Ethereum L2).</li>
              <li>Historial de transacciones de tokens $1UP.</li>
              <li>Comprobantes de pago (transferencias bancarias) subidos voluntariamente.</li>
              <li>Monto en COP de órdenes de compra OTC (tokens o 1UP Pass).</li>
            </ul>
          </SubSection>

          <SubSection title="3.3 Datos de uso y preferencias">
            <ul>
              <li>Juegos preferidos seleccionados durante el registro.</li>
              <li>Historial de inscripciones a cursos.</li>
              <li>Estado y fechas de vigencia del 1UP Pass.</li>
              <li>Código de referido utilizado.</li>
            </ul>
          </SubSection>

          <SubSection title="3.4 Datos técnicos">
            <ul>
              <li>Dirección IP y agente de usuario (User-Agent) del navegador.</li>
              <li>Logs de acceso y sesión provistos por el proveedor de autenticación Privy.</li>
              <li>Cookies de sesión necesarias para el funcionamiento de la autenticación.</li>
            </ul>
          </SubSection>
        </Section>

        {/* 4 */}
        <Section title="4. Finalidades del Tratamiento">
          <p>Los datos personales son tratados para las siguientes finalidades:</p>
          <ol>
            <li><strong>Registro y autenticación:</strong> crear y gestionar la cuenta del usuario en la Plataforma.</li>
            <li><strong>Prestación del servicio:</strong> administrar el acceso al Gaming Tower, cursos, torneos y beneficios del 1UP Pass.</li>
            <li><strong>Procesamiento de pagos:</strong> gestionar órdenes de compra de tokens $1UP y del 1UP Pass, incluyendo la verificación de transacciones en blockchain y transferencias bancarias.</li>
            <li><strong>Comunicaciones transaccionales:</strong> enviar confirmaciones de compra, activación del pass y notificaciones operativas al correo electrónico registrado.</li>
            <li><strong>Verificación de elegibilidad:</strong> comprobar afiliación a entidades aliadas (Comfenalco y otros) para aplicar descuentos autorizados.</li>
            <li><strong>Seguridad y prevención del fraude:</strong> detectar y prevenir usos indebidos de la Plataforma.</li>
            <li><strong>Cumplimiento legal:</strong> atender requerimientos de autoridades competentes conforme a la ley colombiana.</li>
            <li><strong>Mejora del servicio:</strong> analizar patrones de uso de forma agregada y anonimizada para optimizar la experiencia.</li>
            <li><strong>Programa de referidos:</strong> validar y registrar el uso de códigos de referido.</li>
          </ol>
        </Section>

        {/* 5 */}
        <Section title="5. Base Legal del Tratamiento">
          <p>El tratamiento de datos personales se realiza sobre las siguientes bases legales:</p>
          <ul>
            <li><strong>Consentimiento informado:</strong> el titular otorga su consentimiento expreso durante el proceso de registro en la Plataforma, marcando la casilla de aceptación de esta Política.</li>
            <li><strong>Ejecución de un contrato:</strong> el tratamiento es necesario para la prestación de los servicios contratados (membresía, cursos, acceso al Gaming Tower).</li>
            <li><strong>Cumplimiento de obligaciones legales:</strong> cuando la normativa colombiana exige la conservación de ciertos datos.</li>
            <li><strong>Interés legítimo:</strong> para la prevención del fraude y la seguridad de la Plataforma, siempre que no prevalezcan los derechos del titular.</li>
          </ul>
        </Section>

        {/* 6 */}
        <Section title="6. Derechos del Titular">
          <p>
            De conformidad con el artículo 8 de la Ley 1581 de 2012, el titular de los datos personales tiene los siguientes derechos:
          </p>
          <ul>
            <li><strong>Acceso:</strong> conocer, actualizar y rectificar sus datos personales.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos, incompletos o fraccionados.</li>
            <li><strong>Supresión:</strong> solicitar la eliminación de sus datos cuando no exista obligación legal de conservarlos.</li>
            <li><strong>Revocación del consentimiento:</strong> retirar en cualquier momento el consentimiento otorgado, sin efecto retroactivo.</li>
            <li><strong>Oposición:</strong> oponerse al tratamiento de sus datos en casos específicos previstos por la ley.</li>
            <li><strong>Portabilidad:</strong> recibir una copia de sus datos en formato legible.</li>
            <li><strong>Queja ante la SIC:</strong> presentar quejas ante la Superintendencia de Industria y Comercio si considera vulnerados sus derechos.</li>
          </ul>
          <p>
            Para ejercer estos derechos, el titular debe enviar una solicitud al correo{" "}
            <a href={`mailto:${EMAIL_CONTACT}`} className="text-primary hover:underline">{EMAIL_CONTACT}</a>{" "}
            con asunto «Derechos ARCO», adjuntando copia de su documento de identidad. La respuesta se emitirá dentro de los
            plazos establecidos por la Ley 1581 (máximo 15 días hábiles para consultas y 15 días hábiles prorrogables por
            8 días adicionales para reclamos).
          </p>
        </Section>

        {/* 7 */}
        <Section title="7. Transferencia y Transmisión de Datos">
          <p>Los datos personales podrán ser compartidos con:</p>
          <ul>
            <li><strong>Proveedores de infraestructura tecnológica:</strong> Supabase Inc. (almacenamiento en base de datos, servidores ubicados en AWS us-east-1), Vercel Inc. (hosting y CDN), Privy Inc. (autenticación de usuarios).</li>
            <li><strong>Procesadores de pago:</strong> MercadoPago S.A. para el procesamiento de pagos de cursos en Colombia.</li>
            <li><strong>Entidades aliadas verificadoras:</strong> Comfenalco Valle y otras entidades aliadas, exclusivamente para verificar la afiliación del titular y aplicar beneficios.</li>
            <li><strong>Autoridades competentes:</strong> cuando sea legalmente requerido.</li>
          </ul>
          <p>
            Todos los proveedores externos actúan como Encargados del Tratamiento y están sujetos a acuerdos contractuales
            que garantizan el tratamiento seguro y confidencial de los datos. Las transferencias internacionales de datos
            se realizan a países que proveen niveles adecuados de protección según la SIC o mediante cláusulas contractuales estándar.
          </p>
        </Section>

        {/* 8 */}
        <Section title="8. Conservación de los Datos">
          <p>Los datos personales serán conservados durante los siguientes períodos:</p>
          <ul>
            <li><strong>Datos de cuenta:</strong> mientras la cuenta permanezca activa y hasta 5 años después de la solicitud de eliminación, salvo obligación legal de mayor plazo.</li>
            <li><strong>Registros de transacciones financieras:</strong> mínimo 10 años, conforme a la normativa tributaria y contable colombiana.</li>
            <li><strong>Logs de seguridad:</strong> hasta 12 meses.</li>
            <li><strong>Comprobantes de pago:</strong> hasta 5 años desde la transacción correspondiente.</li>
          </ul>
        </Section>

        {/* 9 */}
        <Section title="9. Medidas de Seguridad">
          <p>
            {COMPANY} implementa medidas técnicas, humanas y administrativas para proteger los datos personales contra
            acceso no autorizado, pérdida, alteración o divulgación, incluyendo:
          </p>
          <ul>
            <li>Cifrado TLS en todas las comunicaciones entre el navegador y los servidores.</li>
            <li>Autenticación de dos factores disponible para usuarios y administradores.</li>
            <li>Control de acceso basado en roles (RBAC) en la base de datos.</li>
            <li>Políticas de seguridad a nivel de fila (RLS) en Supabase.</li>
            <li>Revisión periódica de permisos de acceso administrativo.</li>
            <li>Monitoreo de transacciones anómalas.</li>
          </ul>
        </Section>

        {/* 10 */}
        <Section title="10. Menores de Edad">
          <p>
            La Plataforma está dirigida exclusivamente a personas de <strong>14 años de edad o más</strong>.
            No se recopilan intencionalmente datos de menores de 14 años. Si un padre, madre o tutor legal
            detecta que un menor de 14 años ha proporcionado datos personales sin autorización, deberá
            contactarnos a{" "}
            <a href={`mailto:${EMAIL_CONTACT}`} className="text-primary hover:underline">{EMAIL_CONTACT}</a>{" "}
            para proceder con la eliminación inmediata de dichos datos.
          </p>
          <p>
            Para usuarios entre 14 y 17 años, el registro implica el conocimiento y consentimiento del
            padre, madre o representante legal, quienes son responsables de supervisar el uso de la Plataforma
            por parte del menor.
          </p>
        </Section>

        {/* 11 */}
        <Section title="11. Cookies y Tecnologías de Seguimiento">
          <p>La Plataforma utiliza las siguientes cookies:</p>
          <ul>
            <li><strong>Cookies de sesión (estrictamente necesarias):</strong> gestionadas por Privy para mantener la autenticación del usuario. Sin estas cookies, la Plataforma no puede funcionar correctamente. No requieren consentimiento separado.</li>
            <li><strong>Cookies de preferencias:</strong> almacenan configuraciones del usuario (p. ej., idioma, temas). Se solicita consentimiento.</li>
          </ul>
          <p>
            No utilizamos cookies de seguimiento publicitario ni compartimos datos con redes publicitarias de terceros.
          </p>
        </Section>

        {/* 12 */}
        <Section title="12. Cambios a Esta Política">
          <p>
            {COMPANY} se reserva el derecho de modificar esta Política de Privacidad en cualquier momento. Los cambios
            serán notificados a los titulares mediante un aviso destacado en la Plataforma y/o por correo electrónico
            con al menos 10 días hábiles de anticipación. El uso continuado de la Plataforma tras la notificación
            constituye aceptación de la política actualizada.
          </p>
        </Section>

        {/* 13 */}
        <Section title="13. Contacto y Reclamaciones">
          <p>Para cualquier consulta, solicitud o reclamación relacionada con el tratamiento de datos personales:</p>
          <div className="bg-surface-container p-6 space-y-2 mt-4">
            <p><span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Empresa:</span>{" "}{COMPANY}</p>
            <p><span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">NIT:</span>{" "}{NIT}</p>
            <p><span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Ciudad:</span>{" "}{ADDRESS}</p>
            <p>
              <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">Email:</span>{" "}
              <a href={`mailto:${EMAIL_CONTACT}`} className="text-primary hover:underline">{EMAIL_CONTACT}</a>
            </p>
          </div>
          <p className="mt-4">
            Si la respuesta del Responsable no es satisfactoria, el titular tiene derecho a presentar una queja ante la
            Superintendencia de Industria y Comercio (SIC) de Colombia, entidad encargada de velar por el cumplimiento
            de la Ley 1581 de 2012. Más información en{" "}
            <a
              href="https://www.sic.gov.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              www.sic.gov.co
            </a>.
          </p>
        </Section>

        {/* Footer note */}
        <div className="bg-surface-container-low p-6">
          <p className="font-headline font-black text-xs uppercase tracking-widest text-outline mb-2">
            Vigencia
          </p>
          <p className="font-body text-sm text-on-surface/70">
            Esta Política de Privacidad rige a partir del {LAST_UPDATED} y reemplaza cualquier versión anterior.
          </p>
        </div>

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-headline font-black text-2xl uppercase tracking-tighter text-on-background">
        {title}
      </h2>
      <div className="h-0.5 w-12 bg-primary-container" />
      <div className="font-body text-sm text-on-surface/80 space-y-3 leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1">
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-outline">{title}</h3>
      <div className="font-body text-sm text-on-surface/80 space-y-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}
