import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { logApiError } from "../lib/opsLogger";

const AuthContext = createContext();

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    logApiError(error, { source: "axios-interceptor" });
    return Promise.reject(error);
  },
);

const getErrorMessage = (err, fallback) =>
  err.response?.data?.message || fallback;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkspace = async () => {
    try {
      const res = await API.get("/workspaces/my-workspace");
      const workspaceData = res.data.data;
      setWorkspace(workspaceData);
      return workspaceData;
    } catch {
      setWorkspace(null);
      return null;
    }
  };

  const refreshWorkspace = async () => {
    if (!user || user.role !== "owner") {
      setWorkspace(null);
      return null;
    }
    return fetchWorkspace();
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const res = await API.post("/auth/login", { email, password });
      const { token, user: userData } = res.data.data;

      localStorage.setItem("token", token);
      setUser(userData);

      let hasWorkspace = false;
      if (userData.role === "owner") {
        const ws = await fetchWorkspace();
        hasWorkspace = !!ws;
      } else {
        setWorkspace(null);
      }

      return {
        success: true,
        hasWorkspace,
        role: userData.role,
      };
    } catch (err) {
      const message = getErrorMessage(err, "Login failed");
      setError(message);
      return { success: false, message };
    }
  };

  const register = async (formData) => {
    try {
      setError(null);
      const res = await API.post("/auth/register", formData);
      const { token, user: userData } = res.data.data;

      localStorage.setItem("token", token);
      setUser(userData);
      setWorkspace(null);

      return { success: true, role: userData.role, hasWorkspace: false };
    } catch (err) {
      const message = getErrorMessage(err, "Registration failed");
      setError(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setWorkspace(null);
    setError(null);
  };

  const fetchMeAndWorkspace = async () => {
    try {
      const res = await API.get("/auth/me");
      const me = res.data.data;
      setUser(me);

      if (me.role === "owner") {
        await fetchWorkspace();
      } else {
        setWorkspace(null);
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) fetchMeAndWorkspace();
    else setLoading(false);
  }, []);

  const activeWorkspaceId = useMemo(() => {
    if (workspace?._id) return workspace._id;

    const userWorkspace = user?.workspaces?.[0]?.workspace;
    if (!userWorkspace) return null;

    return typeof userWorkspace === "string" ? userWorkspace : userWorkspace._id;
  }, [workspace, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        activeWorkspaceId,
        loading,
        error,
        setError,
        login,
        register,
        logout,
        refreshWorkspace,
        isAuthenticated: !!user,
        hasWorkspace: !!workspace,
        isOwner: user?.role === "owner",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default API;
