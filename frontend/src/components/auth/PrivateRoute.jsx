import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function PrivateRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red rounded-full border-t-transparent animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (roles.length > 0 && !roles.some((r) => user.roles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  return children;
}
