import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type SessionState = {
  status: AuthStatus;
  session: Session | null;
  setSession: (session: Session | null) => void;
  startLoading: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  status: "loading",
  session: null,
  setSession: (session) =>
    set({
      session,
      status: session ? "authenticated" : "unauthenticated",
    }),
  startLoading: () => set({ status: "loading" }),
}));
