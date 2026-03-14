/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["react", "@typescript-eslint", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],

  rules: {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-require-imports": "off",
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "lucide-react",
            message: "Use lucide-react-native or phosphor-react-native.",
          },
        ],
        patterns: ["@radix-ui/*", "*@\\d+\\.\\d+\\.\\d+"],
      },
    ],
  },

  overrides: [
    {
      files: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "utils/**/*.{ts,tsx}",
        "stores/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
        "theme/**/*.{ts,tsx}",
      ],
      rules: {
        "@typescript-eslint/explicit-function-return-type": [
          "error",
          {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
            allowHigherOrderFunctions: true,
            allowDirectConstAssertionInArrowFunctions: true,
            allowConciseArrowFunctionExpressionsStartingWithVoid: true,
          },
        ],
      },
    },
    {
      files: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "__tests__/**/*.{ts,tsx}",
      ],
      rules: {
        "@typescript-eslint/no-unused-vars": "error",
        "@typescript-eslint/no-explicit-any": "error",
      },
    },
    {
      files: ["stores/use*Store.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "@/stores/use*Store",
                  "./use*Store",
                  "../stores/use*Store",
                ],
                message:
                  "Store files must stay modular. Compose multiple stores in hooks/screens, not inside stores.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["scripts/**/*.{js,mjs,cjs,ts}"],
      rules: {
        "no-constant-condition": ["error", { checkLoops: false }],
      },
    },
    {
      files: ["scripts/**/*.cjs"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],

  settings: { react: { version: "detect" } },
};
