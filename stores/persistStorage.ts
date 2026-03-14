import { Platform } from "react-native";
import { createJSONStorage, type StateStorage } from "zustand/middleware";

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function getWebStorage(): StateStorage {
  if (typeof window === "undefined" || !window.localStorage) {
    return noopStorage;
  }
  return {
    getItem: (name) => window.localStorage.getItem(name),
    setItem: (name, value) => window.localStorage.setItem(name, value),
    removeItem: (name) => window.localStorage.removeItem(name),
  };
}

function resolveStorage(): StateStorage {
  if (Platform.OS === "web") {
    return getWebStorage();
  }

  // Lazy require avoids loading native modules during web/Jest execution.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const asyncStorageModule = require("@react-native-async-storage/async-storage");
  const asyncStorage = asyncStorageModule.default ?? asyncStorageModule;
  return asyncStorage as StateStorage;
}

export const persistStorage = createJSONStorage(resolveStorage);
