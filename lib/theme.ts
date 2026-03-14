import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

const LIGHT_THEME_VARIABLES = {
  background: "247 245 239",
  foreground: "39 48 35",
  card: "254 252 247",
  popover: "254 252 247",
  primary: "95 125 90",
  secondary: "242 239 230",
  muted: "233 228 215",
  accent: "242 239 230",
  destructive: "179 92 82",
  border: "127 140 121",
  input: "127 140 121",
  ring: "109 124 144",
  radius: "16px",
} as const;

const DARK_THEME_VARIABLES = {
  background: "18 24 20",
  foreground: "230 236 228",
  card: "24 33 28",
  popover: "24 33 28",
  primary: "143 173 122",
  secondary: "31 42 36",
  muted: "39 52 45",
  accent: "31 42 36",
  destructive: "208 138 127",
  border: "137 150 134",
  input: "137 150 134",
  ring: "144 166 188",
  radius: "16px",
} as const;

export const CSS_VARIABLES = {
  light: LIGHT_THEME_VARIABLES,
  dark: DARK_THEME_VARIABLES,
} as const;

const toRgb = (value: string): string => `rgb(${value})`;

const LIGHT_NAV_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: toRgb(LIGHT_THEME_VARIABLES.background),
    border: toRgb(LIGHT_THEME_VARIABLES.border),
    card: toRgb(LIGHT_THEME_VARIABLES.card),
    notification: toRgb(LIGHT_THEME_VARIABLES.destructive),
    primary: toRgb(LIGHT_THEME_VARIABLES.primary),
    text: toRgb(LIGHT_THEME_VARIABLES.foreground),
  },
};

const DARK_NAV_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: toRgb(DARK_THEME_VARIABLES.background),
    border: toRgb(DARK_THEME_VARIABLES.border),
    card: toRgb(DARK_THEME_VARIABLES.card),
    notification: toRgb(DARK_THEME_VARIABLES.destructive),
    primary: toRgb(DARK_THEME_VARIABLES.primary),
    text: toRgb(DARK_THEME_VARIABLES.foreground),
  },
};

export const NAV_THEME = {
  light: LIGHT_NAV_THEME,
  dark: DARK_NAV_THEME,
} as const;
