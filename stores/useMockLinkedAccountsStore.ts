import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "@/stores/persistStorage";

type MockLinkedAccountsState = {
  hasLinkedAccounts: boolean;
  linkMockAccounts: () => void;
  clearMockAccounts: () => void;
};

export const useMockLinkedAccountsStore = create<MockLinkedAccountsState>()(
  persist(
    (set) => ({
      hasLinkedAccounts: false,
      linkMockAccounts: () => set({ hasLinkedAccounts: true }),
      clearMockAccounts: () => set({ hasLinkedAccounts: false }),
    }),
    {
      name: "mock-linked-accounts-store",
      version: 1,
      storage: persistStorage,
    },
  ),
);
