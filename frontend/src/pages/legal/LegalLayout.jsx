import { NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import './legal.css';

export const EMPRESA = {
  nombre: 'Ink Haus Tattoo Studio',
  razonSocial: '[RAZÓN SOCIAL O NOMBRE COMPLETO DEL TITULAR]',
  rut: '[RUT]',
  direccion: '[DIRECCIÓN, COMUNA, CIUDAD, CHILE]',
  email: 'inkhausweb@gmail.com',
  telefono: '[TELÉFONO]',
  sitio: 'https://inkhaus.vercel.app',
};

export default function LegalLayout({ titulo, actualizado, children }) {
  useEffect(() => { document.title = `${titulo} | Ink Haus`; window.scrollTo(0, 0); }, [titulo]);
  return (
    <main className="legal">
      <div className="legal__inner">
        <nav className="legal__nav" aria-label="Documentos legales">
          <NavLink to="/terminos">Términos y condiciones</NavLink>
          <NavLink to="/privacidad">Política de privacidad</NavLink>
          <NavLink to="/devoluciones">Cambios, anulaciones y reembolsos</NavLink>
        </nav>
        <h1>{titulo}</h1>
        <p className="legal__updated">Última actualización: {actualizado}</p>
        {children}
      </div>
    </main>
  );
}
