import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  FactKey,
  FactRecord,
  FactsSnapshot,
} from "@/utils/contracts/facts";
import { persistStorage } from "@/stores/persistStorage";

type FactRegistryState = {
  facts: FactsSnapshot;
  upsertFact: (fact: FactRecord<FactKey>) => void;
  upsertFacts: (nextFacts: FactsSnapshot) => void;
  clearFact: (key: FactKey) => void;
  resetFacts: () => void;
};

export const useFactRegistryStore = create<FactRegistryState>()(
  persist(
    (set) => ({
      facts: {},
      upsertFact: (fact) =>
        set((state) => ({
          facts: {
            ...state.facts,
            [fact.key]: fact,
          },
        })),
      upsertFacts: (nextFacts) =>
        set((state) => ({
          facts: {
            ...state.facts,
            ...nextFacts,
          },
        })),
      clearFact: (key) =>
        set((state) => {
          const updatedFacts = { ...state.facts };
          delete updatedFacts[key];
          return { facts: updatedFacts };
        }),
      resetFacts: () => set({ facts: {} }),
    }),
    {
      name: "fact-registry-store-v1",
      version: 1,
      storage: persistStorage,
    },
  ),
);
