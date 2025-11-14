import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "driver" | "delivery";
  profilePicture?: string;
  rating: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem("vaye_token");
    const storedUser = localStorage.getItem("vaye_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // TODO: Replace with actual API call
    const mockUser: User = {
      id: "demo_123",
      name: "Demo Driver",
      email: email,
      phone: "+27 12 345 6789",
      role: "driver",
      rating: 4.8,
    };

    const mockToken = "mock_token_" + Date.now();

    localStorage.setItem("vaye_token", mockToken);
    localStorage.setItem("vaye_user", JSON.stringify(mockUser));

    setToken(mockToken);
    setUser(mockUser);
  };

  const logout = () => {
    localStorage.removeItem("vaye_token");
    localStorage.removeItem("vaye_user");
    setToken(null);
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
