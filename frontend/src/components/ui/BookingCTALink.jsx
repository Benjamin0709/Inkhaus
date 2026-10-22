import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Si hay sesión, lleva a elegir artista para agendar.
// Si no, lleva a registrarse.
export default function BookingCTALink({ className, children }) {
  const { user } = useAuth();
  const to = user ? "/artists" : "/register";
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}