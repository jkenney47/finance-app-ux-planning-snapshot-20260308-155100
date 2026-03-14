import "@testing-library/jest-dom";

// Polyfill webpack's require.context used by expo-router in App.tsx
if (typeof require !== "undefined" && !require.context) {
  require.context = () => ({
    keys: () => [],
    resolve: (k) => k,
    id: "mock-require-context",
  });
}

// Mock react-native-safe-area-context to avoid native module access in Jest
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

// Ensure Platform.OS resolves to 'web' during tests so Platform.select({ web }) branches are used
jest.mock("react-native/Libraries/Utilities/Platform", () => {
  const Platform = jest.requireActual(
    "react-native/Libraries/Utilities/Platform",
  );
  return {
    ...Platform,
    OS: "web",
    select: (objs) =>
      objs && Object.prototype.hasOwnProperty.call(objs, "web")
        ? objs.web
        : objs.default,
  };
});

// Smooth over native-module expectations from expo-modules-core.
jest.mock("expo-modules-core", () => {
  class CodedError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  return {
    NativeModulesProxy: {},
    Platform: { OS: "web" },
    CodedError,
    requireNativeModule: () => ({}),
    EventEmitter: class {},
  };
});

// Mock vector icons to avoid loading fonts.
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => {
  const React = require("react");
  return function Icon(props) {
    return React.createElement("i", props);
  };
});
// Mock getBoundingClientRect for charts in tests
if (typeof window !== "undefined") {
  if (!window.HTMLElement.prototype.getBoundingClientRect) {
    window.HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        width: 400,
        height: 300,
        top: 0,
        left: 0,
        bottom: 300,
        right: 400,
      };
    };
  }
} else {
  if (!global.HTMLElement.prototype.getBoundingClientRect) {
    global.HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        width: 400,
        height: 300,
        top: 0,
        left: 0,
        bottom: 300,
        right: 400,
      };
    };
  }
}

// Mock ResizeObserver for recharts/ResponsiveContainer
if (typeof window !== "undefined") {
  window.ResizeObserver =
    window.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
} else {
  global.ResizeObserver =
    global.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
}

// Mock offsetWidth/offsetHeight for recharts ResponsiveContainer
Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  value: 400,
});
Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  value: 300,
});

// Filter specific RN Web deprecation warnings to keep CI noise low
const originalWarn = console.warn;
console.warn = (...args) => {
  const [message] = args;
  if (
    typeof message === "string" &&
    (message.includes("props.pointerEvents is deprecated") ||
      message.includes('"shadow*" style props are deprecated'))
  ) {
    return;
  }
  originalWarn(...args);
};
