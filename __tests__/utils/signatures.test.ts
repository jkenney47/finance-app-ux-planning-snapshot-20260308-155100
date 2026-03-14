import {
  hashString,
  stableStringify,
} from "@/supabase/functions/_shared/signatures";

describe("signature helpers", () => {
  it("stableStringify orders object keys deterministically", () => {
    const left = stableStringify({
      b: 2,
      a: { y: 1, x: 0 },
      c: [2, { z: 3, w: 4 }],
    });
    const right = stableStringify({
      c: [2, { w: 4, z: 3 }],
      a: { x: 0, y: 1 },
      b: 2,
    });

    expect(left).toBe(right);
  });

  it("hashString changes when payload changes", () => {
    const first = hashString("one");
    const second = hashString("two");
    expect(first).not.toBe(second);
  });
});
