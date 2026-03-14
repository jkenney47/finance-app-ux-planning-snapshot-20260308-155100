const { tokenSource } = require("./theme/token-source");

const px = (value) => `${value}px`;
const light = tokenSource.color.light;
const dark = tokenSource.color.dark;

const designTokenColors = {
  bg: light.bg,
  "bg-dark": dark.bg,
  surface1: light.surface1,
  "surface1-dark": dark.surface1,
  surface2: light.surface2,
  "surface2-dark": dark.surface2,
  surface3: light.surface3,
  "surface3-dark": dark.surface3,
  borderSubtle: light.borderSubtle,
  "borderSubtle-dark": dark.borderSubtle,
  borderStrong: light.borderStrong,
  "borderStrong-dark": dark.borderStrong,
  text: light.text,
  "text-dark": dark.text,
  textMuted: light.textMuted,
  "textMuted-dark": dark.textMuted,
  textFaint: light.textFaint,
  "textFaint-dark": dark.textFaint,
  accentSoft: light.accentSoft,
  "accentSoft-dark": dark.accentSoft,
  positive: light.positive,
  "positive-dark": dark.positive,
  negative: light.negative,
  "negative-dark": dark.negative,
  warning: light.warning,
  "warning-dark": dark.warning,
  info: light.info,
  "info-dark": dark.info,
  brand500: tokenSource.color.brand500,
  brand700: tokenSource.color.brand700,
  success500: tokenSource.color.success500,
  error500: tokenSource.color.error500,
  warning500: tokenSource.color.warning500,
  info500: tokenSource.color.info500,
};

/** @type {import("tailwindcss").Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./stores/**/*.{js,jsx,ts,tsx}",
    "./theme/**/*.{js,jsx,ts,tsx}",
    "./utils/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        ...designTokenColors,
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: px(tokenSource.radius.xs),
        xl: px(tokenSource.radius.xl),
      },
      spacing: {
        xs: px(tokenSource.space.xs),
        sm: px(tokenSource.space.sm),
        md: px(tokenSource.space.md),
        lg: px(tokenSource.space.lg),
        xl: px(tokenSource.space.xl),
        xxl: px(tokenSource.space.xxl),
      },
      minHeight: {
        hit: px(tokenSource.hit.min),
      },
      fontSize: {
        h1: [
          px(tokenSource.type.h1.size),
          {
            lineHeight: px(tokenSource.type.h1.lh),
            fontWeight: tokenSource.type.h1.weight,
          },
        ],
        h2: [
          px(tokenSource.type.h2.size),
          {
            lineHeight: px(tokenSource.type.h2.lh),
            fontWeight: tokenSource.type.h2.weight,
          },
        ],
        numXXL: [
          px(tokenSource.type.numXXL.size),
          {
            lineHeight: px(tokenSource.type.numXXL.lh),
            fontWeight: tokenSource.type.numXXL.weight,
          },
        ],
        numXL: [
          px(tokenSource.type.numXL.size),
          {
            lineHeight: px(tokenSource.type.numXL.lh),
            fontWeight: tokenSource.type.numXL.weight,
          },
        ],
        num: [
          px(tokenSource.type.num.size),
          {
            lineHeight: px(tokenSource.type.num.lh),
            fontWeight: tokenSource.type.num.weight,
          },
        ],
        body: [
          px(tokenSource.type.body.size),
          {
            lineHeight: px(tokenSource.type.body.lh),
            fontWeight: tokenSource.type.body.weight,
          },
        ],
        meta: [
          px(tokenSource.type.meta.size),
          {
            lineHeight: px(tokenSource.type.meta.lh),
            fontWeight: tokenSource.type.meta.weight,
          },
        ],
        labelCaps: [
          px(tokenSource.type.labelCaps.size),
          {
            lineHeight: px(tokenSource.type.labelCaps.lh),
            fontWeight: tokenSource.type.labelCaps.weight,
          },
        ],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
