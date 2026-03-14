import { tokenSource } from "./token-source";

// Canonical runtime design-token source shared with Tailwind config.
export const tokens = tokenSource;

export type Tokens = typeof tokens;
