module.exports = function (api) {
  const env = api.env();
  const isTest = env === "test";
  api.cache.using(() => env);

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      !isTest && "nativewind/babel",
    ].filter(Boolean),
    // Strip Flow types in dependencies that still ship Flow annotations.
    plugins: [
      "@babel/plugin-transform-flow-strip-types",
      "react-native-reanimated/plugin",
    ],
    overrides: [
      {
        // Some React Native entrypoints ship TS-style assertions in .js
        test: /node_modules\/react-native\/index\.js$/,
        presets: [
          [
            "@babel/preset-typescript",
            { allExtensions: true, isTSX: false, allowNamespaces: true },
          ],
        ],
      },
    ],
  };
};
