import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback
} from "react";
import api from "@/config/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_cache");
    delete api.defaults.headers.common["Authorization"];
  }, []);


  const fetchCurrentUser = useCallback(
    async (retryCount = 0) => {
      try {
        const res = await api.get("/api/auth/me");

        if (res.data?.success && res.data.data) {
          const userData = res.data.data;
          setUser(userData);
          localStorage.setItem("user_cache", JSON.stringify(userData));
          retryCountRef.current = 0;
        } else {
          logout();
        }
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          logout();
          return;
        }

        if (!error.response && retryCount < maxRetries) {
          retryCountRef.current = retryCount + 1;
          setTimeout(
            () => fetchCurrentUser(retryCount + 1),
            Math.min(1000 * 2 ** retryCount, 5000)
          );
          return;
        }
      } finally {
        if (retryCount === 0 || retryCount >= maxRetries) {
          setLoading(false);
        }
      }
    },
    [logout]
  );


  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (res) => res,
      (error) => {
        if (
          (error.response?.status === 401 ||
            error.response?.status === 403) &&
          localStorage.getItem("auth_token")
        ) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, [logout]);

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const cachedUser = localStorage.getItem("user_cache");

    if (storedToken) {
      setToken(storedToken);
      api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;

      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch { }
      }

      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = async (identifier, password) => {
    try {
      const isEmail = identifier.includes("@");
      const payload = isEmail ? { email: identifier, password } : { phone: identifier, password };
      
      const res = await api.post("/api/auth/login", payload);

      const token = res.data.data?.token;
      const user = res.data.data?.user;

      if (!token || !user) throw new Error("Invalid login response");

      setToken(token);
      setUser(user);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_cache", JSON.stringify(user));
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      await fetchCurrentUser(0);

      return { success: true, user };
    } catch (err) {
      return {
        success: false,
        message:
          err.response?.data?.message || "Login failed"
      };
    }
  };


  const signup = async (data) => {
    try {
      const res = await api.post("/api/auth/register", data);

      const token = res.data.data?.token;
      const user = res.data.data?.user;

      setToken(token);
      setUser(user);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_cache", JSON.stringify(user));
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      await fetchCurrentUser(0);

      return { success: true, user };
    } catch (err) {
      return {
        success: false,
        message:
          err.response?.data?.message || "Signup failed"
      };
    }
  };

  const addPassword = async (newPassword, otp) => {
    try {
      await api.post("/api/auth/password/add", {
        newPassword,
        otp
      });

      // 🔥 IMMEDIATE STATE FIX
      setUser((prev) =>
        prev ? { ...prev, has_password: true } : prev
      );

      const cached = JSON.parse(
        localStorage.getItem("user_cache") || "{}"
      );
      localStorage.setItem(
        "user_cache",
        JSON.stringify({ ...cached, has_password: true })
      );

      await fetchCurrentUser(0);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        message:
          err.response?.data?.message || "Failed to add password"
      };
    }
  };


  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.post("/api/auth/password/change", {
        currentPassword,
        newPassword
      });

      // keep state consistent
      setUser((prev) =>
        prev ? { ...prev, has_password: true } : prev
      );

      await fetchCurrentUser(0);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        message:
          err.response?.data?.message ||
          "Failed to change password"
      };
    }
  };

  const refreshUser = async () => {
    if (localStorage.getItem("auth_token")) {
      await fetchCurrentUser(0);
    }
  };

  const requestOTP = async (identifier, type) => {
    try {
      const isEmail = identifier.includes("@");
      const payload = isEmail 
        ? { email: identifier, purpose: type } 
        : { phone: identifier, purpose: type };
        
      const res = await api.post("/api/auth/register/request-otp", payload);
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to send OTP"
      };
    }
  };

  const loginSuccess = async (token, user) => {
    setToken(token);
    setUser(user);
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user_cache", JSON.stringify(user));
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    await fetchCurrentUser(0);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    addPassword,
    changePassword,
    logout,
    refreshUser,
    requestOTP,
    loginSuccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

export default AuthContext;