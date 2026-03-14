// @ts-check
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/**
 * Metro configuration for React Native
 * https://facebook.github.io/metro/
 */
const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

// Required for expo-router when using the dev client; enables require.context.
config.transformer.unstable_allowRequireContext = true;

module.exports = withNativeWind(config, {
  input: "./globals.css",
  inlineRem: 16,
});
