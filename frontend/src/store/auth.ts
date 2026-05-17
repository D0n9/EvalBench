import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "@/api/client";

export interface User {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  is_superuser: boolean;
  is_active: boolean;
  team_id: string | null;
  team_name: string | null;
  role: number | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setToken: (token) => {
        localStorage.setItem("token", token);
        set({ token, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem("token");
        set({ token: null, user: null, isAuthenticated: false });
      },
      fetchUser: async () => {
        try {
          const response = await apiClient.get("/users/me");
          set({ user: response.data });
        } catch (error) {
          console.error("Failed to fetch user", error);
          set({ token: null, user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
