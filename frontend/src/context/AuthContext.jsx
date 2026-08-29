import { createContext, useContext, useState, useEffect } from "react";
import { registerAPI, loginAPI, verifyAPI } from "../api/auth.api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar: verificar si ya hay token guardado
  useEffect(() => {
    const token = localStorage.getItem("inkhaus_token");
    if (!token) { setLoading(false); return; }
    verifyAPI()
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem("inkhaus_token"))
      .finally(() => setLoading(false));
  }, []);

  const register = async (formData) => {
    const { data } = await registerAPI(formData);
    localStorage.setItem("inkhaus_token", data.token);
    setUser(data.user);
    return data;
  };

  const login = async (formData) => {
    const { data } = await loginAPI(formData);
    localStorage.setItem("inkhaus_token", data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("inkhaus_token");
    setUser(null);
  };

  const hasRole = (...roles) => roles.some((r) => user?.roles?.includes(r));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
