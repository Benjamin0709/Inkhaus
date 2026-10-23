import LegalLayout, { EMPRESA as E } from './LegalLayout';

export default function Devoluciones() {
  return (
    <LegalLayout titulo="Cambios, anulaciones y reembolsos" actualizado="22 de octubre de 2026">

      <h2>1. Naturaleza del servicio</h2>
      <p>
        Un tatuaje es un servicio personalizado, con fecha y hora reservadas y que no puede devolverse una vez realizado.
        Por eso las reglas de cambio y reembolso dependen del momento en que avises.
      </p>

      <h2>2. Cambiar la fecha de tu cita</h2>
      <ul>
        <li>Puedes reprogramar sin costo avisando con al menos <strong>48 horas</strong> de anticipación.</li>
        <li>Con menos de 48 horas, o si no te presentas, la reserva pagada se pierde.</li>
        <li>Si llegas con más de 30 minutos de atraso sin avisar, podemos considerar la cita como no realizada.</li>
      </ul>

      <h2>3. Anular tu cita y reembolso</h2>
      <ul>
        <li>Anulación con 48 horas o más de anticipación: reembolso del <strong>100%</strong> del monto pagado.</li>
        <li>Anulación con menos de 48 horas: sin reembolso, por el tiempo reservado para ti.</li>
        <li>Si somos nosotros quienes debemos anular o reprogramar, te devolvemos el <strong>100%</strong> o reprogramamos sin costo, según prefieras.</li>
      </ul>
      <p>Para anular, usa tu cuenta en el sitio o escribe a <a href={`mailto:${E.email}`}>{E.email}</a>.</p>

      <h2>4. Cómo se devuelve el dinero</h2>
      <p>
        El reembolso se hace al mismo medio de pago usado en Webpay. Una vez aprobado, lo tramitamos en un plazo de hasta
        <strong> 10 días hábiles</strong>. El tiempo en que lo veas reflejado depende de tu banco.
      </p>

      <h2>5. Retoques</h2>
      <p>
        Si tu tatuaje necesita un retoque por un defecto de ejecución, lo hacemos sin costo dentro de los
        <strong> 60 días</strong> posteriores a la sesión, siempre que hayas seguido las indicaciones de cuidado.
        No cubre cambios de diseño ni daños por exposición solar, rascado o mala cicatrización.
      </p>

      <h2>6. Si no estás conforme</h2>
      <p>
        Escríbenos a <a href={`mailto:${E.email}`}>{E.email}</a> con tu nombre, fecha de la cita y qué ocurrió.
        Revisaremos tu caso y te responderemos a la brevedad. Esta política no limita los derechos que te reconoce la
        Ley N° 19.496 sobre Protección de los Derechos de los Consumidores.
      </p>

      <h2>7. Pagos rechazados o duplicados</h2>
      <p>
        Si te cobraron dos veces o el pago fue descontado pero la reserva no quedó confirmada, avísanos con el
        comprobante y lo regularizamos.
      </p>
    </LegalLayout>
  );
}
