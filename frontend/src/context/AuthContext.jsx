import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  registerAPI,
  loginAPI,
  verifyAPI,
} from "../api/auth.api";

const AuthContext = createContext(null);

// Normaliza el identificador para que siempre exista user.id.
const normalizeUser = (user) => {
  if (!user) return null;

  return {
    ...user,
    id: user.id || user._id,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verifica la sesión al iniciar o recargar la aplicación.
  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      const token = localStorage.getItem("inkhaus_token");

      if (!token) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await verifyAPI();

        if (active) {
          setUser(normalizeUser(data.user));
        }
      } catch (error) {
        localStorage.removeItem("inkhaus_token");

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      active = false;
    };
  }, []);

  // Registro.
  const register = async (formData) => {
    const { data } = await registerAPI(formData);

    localStorage.setItem("inkhaus_token", data.token);
    setUser(normalizeUser(data.user));

    return data;
  };

  // Inicio de sesión.
  const login = async (formData) => {
    const { data } = await loginAPI(formData);

    localStorage.setItem("inkhaus_token", data.token);
    setUser(normalizeUser(data.user));

    return data;
  };

  // Cierra la sesión local.
  const logout = () => {
    localStorage.removeItem("inkhaus_token");
    setUser(null);
  };

  // Vuelve a consultar el usuario autenticado.
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await verifyAPI();
      const updatedUser = normalizeUser(data.user);

      setUser(updatedUser);

      return updatedUser;
    } catch (error) {
      // Si el token ya no es válido, limpia la sesión.
      if (error?.response?.status === 401) {
        localStorage.removeItem("inkhaus_token");
        setUser(null);
      }

      throw error;
    }
  }, []);

  // Comprueba si el usuario tiene alguno de los roles indicados.
  const hasRole = (...roles) =>
    roles.some((role) => user?.roles?.includes(role));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        hasRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
