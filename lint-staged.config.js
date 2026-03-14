module.exports = {
  "{app,components,utils,stores,hooks,theme,__tests__}/**/*.{js,jsx,ts,tsx}": [
    "node scripts/lint-design-tokens.mjs",
    "eslint --cache --fix --max-warnings=0",
    "prettier --write",
  ],
  "supabase/functions/**/*.{js,jsx,ts,tsx}": [
    "eslint --cache --fix --max-warnings=0",
    "prettier --write",
  ],
  "scripts/**/*.{js,mjs,cjs}": [
    "eslint --cache --fix --max-warnings=0",
    "prettier --write",
  ],
  "**/*.{json,css,md,yml,yaml}": ["prettier --write"],
};
