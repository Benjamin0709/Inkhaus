import LegalLayout, { EMPRESA as E } from './LegalLayout';

export default function Privacidad() {
  return (
    <LegalLayout titulo="Política de privacidad" actualizado="22 de octubre de 2026">
    

      <h2>1. Responsable</h2>
      <p>{E.razonSocial}, RUT {E.rut}, {E.direccion}. Contacto: <a href={`mailto:${E.email}`}>{E.email}</a>.</p>

      <h2>2. Datos que recopilamos</h2>
      <ul>
        <li><strong>Identificación y contacto:</strong> nombre, correo electrónico y teléfono, al reservar o crear una cuenta.</li>
        <li><strong>Datos de la cita:</strong> fecha, servicio, descripción del diseño e imágenes de referencia que subas.</li>
        <li><strong>Datos de salud:</strong> los que declares en el consentimiento informado (alergias, condiciones médicas). Son datos sensibles y los usamos solo para realizar el servicio de forma segura.</li>
        <li><strong>Datos de pago:</strong> el pago lo procesa Transbank. Nosotros recibimos solo el resultado de la transacción (aprobada o rechazada, monto, código de autorización y últimos dígitos de la tarjeta). No almacenamos el número completo ni el código de seguridad.</li>
        <li><strong>Datos técnicos:</strong> dirección IP y datos básicos del navegador, para seguridad y funcionamiento del sitio.</li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Gestionar tus reservas, pagos y recordatorios de citas.</li>
        <li>Enviarte correos transaccionales (confirmación, cancelación, recordatorio, pago).</li>
        <li>Realizar el servicio de forma segura y cumplir obligaciones legales y tributarias.</li>
        <li>Responder tus consultas y reclamos.</li>
      </ul>
      <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>

      <h2>4. Con quién los compartimos</h2>
      <p>Solo con proveedores necesarios para operar el sitio, que tratan los datos por encargo nuestro:</p>
      <ul>
        <li>Transbank (procesamiento de pagos).</li>
        <li>MongoDB Atlas (base de datos).</li>
        <li>Cloudinary (almacenamiento de imágenes).</li>
        <li>Brevo (envío de correos).</li>
        <li>Render y Vercel (alojamiento del sitio).</li>
      </ul>
      <p>Algunos de estos proveedores procesan datos fuera de Chile. También podemos entregar información si una autoridad competente lo exige.</p>

      <h2>5. Cuánto tiempo los conservamos</h2>
      <p>
        Mientras sea necesario para prestar el servicio y por los plazos que exige la ley (por ejemplo, tributarios).
        Los consentimientos y datos de salud se guardan el tiempo necesario para respaldar el servicio realizado.
        Luego se eliminan o anonimizan.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes solicitar acceso, rectificación, supresión u oposición al tratamiento de tus datos, y retirar tu consentimiento
        cuando éste sea la base del tratamiento. Escríbenos a <a href={`mailto:${E.email}`}>{E.email}</a> indicando tu nombre y tu solicitud;
        responderemos dentro de los plazos legales.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Usamos conexión cifrada (HTTPS), contraseñas almacenadas con hash y acceso restringido a los datos.
        Ningún sistema es infalible; si ocurre un incidente que te afecte, te informaremos según la ley.
      </p>

      <h2>8. Cookies y almacenamiento local</h2>
      <p>
        Usamos almacenamiento del navegador para mantener tu sesión iniciada. Si agregas herramientas de analítica o publicidad,
        deberás informarlo aquí.
      </p>

      <h2>9. Menores de edad</h2>
      <p>Nuestros servicios son solo para mayores de 18 años. No recopilamos datos de menores de forma intencional.</p>

      <h2>10. Cambios</h2>
      <p>Publicaremos cualquier cambio en esta página con la fecha de actualización.</p>
    </LegalLayout>
  );
}
