import { tokens } from "@/theme/tokens";
import { tokenSource } from "@/theme/token-source";
import tailwindConfig from "../../tailwind.config.js";

const resolvedTailwindConfig = tailwindConfig as {
  theme: {
    extend: {
      spacing: Record<string, string>;
      borderRadius: Record<string, string>;
      colors: Record<string, string>;
    };
  };
};

describe("token source interop", () => {
  it("uses tokenSource as the runtime token export", () => {
    expect(tokens).toEqual(tokenSource);
  });

  it("wires Tailwind theme extensions to the same token source", () => {
    expect(resolvedTailwindConfig.theme.extend.spacing.md).toBe(
      `${tokenSource.space.md}px`,
    );
    expect(resolvedTailwindConfig.theme.extend.borderRadius.xs).toBe(
      `${tokenSource.radius.xs}px`,
    );
    expect(resolvedTailwindConfig.theme.extend.colors.brand500).toBe(
      tokenSource.color.brand500,
    );
  });
});
