import LegalLayout, { EMPRESA as E } from './LegalLayout';

export default function Terminos() {
  return (
    <LegalLayout titulo="Términos y condiciones" actualizado="22 de octubre de 2026">
      
      <h2>1. Quiénes somos</h2>
      <p>
        Este sitio es operado por {E.razonSocial}, RUT {E.rut}, que opera bajo el nombre {E.nombre},
        con domicilio en {E.direccion}. Contacto: <a href={`mailto:${E.email}`}>{E.email}</a>, {E.telefono}.
      </p>

      <h2>2. Qué ofrecemos</h2>
      <p>
        Servicios de tatuaje y perforación, y la reserva de citas en línea. Los precios se muestran en pesos chilenos (CLP)
        e incluyen impuestos, salvo que se indique lo contrario. El valor final de un trabajo puede variar según el diseño,
        tamaño y tiempo de ejecución, y se acuerda con el artista antes de comenzar.
      </p>

      <h2>3. Reserva de citas y pagos</h2>
      <ul>
        <li>Al reservar, aceptas estos términos y la política de cambios y reembolsos.</li>
        <li>El pago se realiza en línea con Webpay Plus de Transbank. Nosotros no almacenamos los datos de tu tarjeta.</li>
        <li>La reserva queda confirmada cuando el pago es aprobado y recibes un correo de confirmación.</li>
        <li>Si el pago es rechazado, la cita no queda reservada.</li>
        <li>El monto pagado como reserva se descuenta del valor total del trabajo.</li>
      </ul>

      <h2>4. Requisitos del cliente</h2>
      <ul>
        <li>Debes ser mayor de 18 años y presentar tu cédula de identidad el día de la sesión.</li>
        <li>No realizamos tatuajes a menores de edad.</li>
        <li>Debes informar condiciones de salud relevantes (alergias, diabetes, problemas de coagulación, embarazo, medicamentos) y firmar el consentimiento informado antes de la sesión.</li>
        <li>Nos reservamos el derecho de no realizar o suspender un trabajo si hay riesgo para tu salud, si llegas bajo los efectos del alcohol o drogas, o si hay faltas de respeto hacia el equipo.</li>
      </ul>

      <h2>5. Diseños y propiedad intelectual</h2>
      <p>
        Los diseños, fotografías y contenidos del sitio y del portafolio pertenecen a {E.nombre} y a sus artistas.
        No pueden copiarse ni usarse comercialmente sin autorización escrita. Los diseños creados para ti
        son de uso exclusivo para tu tatuaje, y los artistas pueden fotografiar el trabajo terminado para su portafolio,
        salvo que nos pidas lo contrario por escrito.
      </p>

      <h2>6. Cuidados posteriores y resultados</h2>
      <p>
        La cicatrización depende en gran parte de seguir las indicaciones de cuidado que te entregamos.
        No nos hacemos responsables por complicaciones derivadas de no seguirlas, de condiciones de salud no informadas
        o de la exposición del tatuaje a factores externos durante la cicatrización. Los retoques se rigen por la política de cambios y reembolsos.
      </p>

      <h2>7. Responsabilidad</h2>
      <p>
        Hacemos lo posible por mantener el sitio disponible y la información actualizada, pero puede haber interrupciones
        o errores. Esto no limita los derechos que te otorga la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores.
      </p>

      <h2>8. Reclamos</h2>
      <p>
        Puedes escribirnos a <a href={`mailto:${E.email}`}>{E.email}</a> y responderemos a la brevedad.
        También puedes acudir al Servicio Nacional del Consumidor (SERNAC).
      </p>

      <h2>9. Cambios y ley aplicable</h2>
      <p>
        Podemos actualizar estos términos; la versión vigente es la publicada en esta página. Se rigen por las leyes de la
        República de Chile y cualquier controversia se resolverá ante los tribunales competentes de {E.direccion.split(',').slice(-2, -1)[0] || 'nuestra ciudad'}.
      </p>
    </LegalLayout>
  );
}
