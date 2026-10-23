import { Link } from 'react-router-dom';
import './legal/legal.css';

export default function NotFound() {
  return (
    <main className="nf">
      <div>
        <p className="nf__code" aria-hidden="true">404</p>
        <h1>No encontramos esta página</h1>
        <p>
          El enlace puede estar mal escrito o la página ya no existe.
          Vuelve al inicio o revisa nuestro portafolio.
        </p>
        <div className="nf__links">
          <Link className="nf__btn nf__btn--solid" to="/">Ir al inicio</Link>
          <Link className="nf__btn" to="/contacto">Contactar al estudio</Link>
        </div>
      </div>
    </main>
  );
}
