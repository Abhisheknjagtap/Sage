import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface UserState {
  user: User | null;
  displayName: string | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setDisplayName: (name: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  displayName: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setDisplayName: (displayName) => set({ displayName }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
