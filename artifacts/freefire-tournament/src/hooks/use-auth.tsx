import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, Player } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthContextType {
  player: Player | null;
  token: string | null;
  login: (token: string, player: Player) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("ff_token"));
  const [player, setPlayer] = useState<Player | null>(null);
  
  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("ff_token"));
  }, []);

  const { data: meData, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (meData) {
      setPlayer(meData);
    }
  }, [meData]);

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  const login = (newToken: string, newPlayer: Player) => {
    localStorage.setItem("ff_token", newToken);
    setTokenState(newToken);
    setPlayer(newPlayer);
  };

  const logout = () => {
    localStorage.removeItem("ff_token");
    setTokenState(null);
    setPlayer(null);
  };

  return (
    <AuthContext.Provider value={{ player, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
