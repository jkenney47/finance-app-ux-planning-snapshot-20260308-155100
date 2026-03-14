/** @type {import('@expo/cli').ExpoConfig} */
module.exports = ({ config }) => {
  const sentryPlugin = [
    "@sentry/react-native/expo",
    {
      organization: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      url: process.env.SENTRY_URL,
    },
  ];

  return {
    ...config,
    name: "FinancePal",
    slug: "ai-financial-advisor",
    userInterfaceStyle: "automatic",
    scheme: "financepal", // 🔑 used by the Dev Client for deep-links
    ios: { bundleIdentifier: "com.financepal.app", usesSwift: false },
    android: { package: "com.financepal.app" },
    plugins: ["expo-router", sentryPlugin, "expo-font"],
  };
};
