import { describe, expect, test } from "@jest/globals";
import { stableStringify } from "../../../../supabase/functions/_shared/signatures";

describe("stableStringify", () => {
  test("handles basic types", () => {
    expect(stableStringify("hello")).toBe('"hello"');
    expect(stableStringify(123)).toBe("123");
    expect(stableStringify(true)).toBe("true");
    expect(stableStringify(false)).toBe("false");
    expect(stableStringify(null)).toBe("null");
  });

  test("handles arrays", () => {
    expect(stableStringify([1, 2, 3])).toBe("[1,2,3]");
    expect(stableStringify(["a", "b", "c"])).toBe('["a","b","c"]');
    expect(stableStringify([1, "a", true, null])).toBe('[1,"a",true,null]');
  });

  test("handles nested arrays", () => {
    expect(stableStringify([1, [2, 3], 4])).toBe("[1,[2,3],4]");
    expect(stableStringify([[], [[]]])).toBe("[[],[[]]]");
  });

  test("handles objects and sorts keys", () => {
    const obj1 = { b: 2, a: 1, c: 3 };
    const obj2 = { a: 1, b: 2, c: 3 };
    const obj3 = { c: 3, b: 2, a: 1 };

    const expected = '{"a":1,"b":2,"c":3}';

    expect(stableStringify(obj1)).toBe(expected);
    expect(stableStringify(obj2)).toBe(expected);
    expect(stableStringify(obj3)).toBe(expected);
  });

  test("handles nested objects with sorted keys", () => {
    const obj = {
      z: 1,
      a: {
        c: 3,
        b: 2,
      },
    };

    const expected = '{"a":{"b":2,"c":3},"z":1}';

    expect(stableStringify(obj)).toBe(expected);
  });

  test("handles complex nested structures", () => {
    const obj = {
      list: [3, 1, 2],
      meta: {
        timestamp: 12345,
        valid: true,
      },
      data: {
        id: "test",
        values: [{ y: 2, x: 1 }, { z: 3 }],
      },
    };

    const expected =
      '{"data":{"id":"test","values":[{"x":1,"y":2},{"z":3}]},"list":[3,1,2],"meta":{"timestamp":12345,"valid":true}}';

    expect(stableStringify(obj)).toBe(expected);
  });

  test("handles empty objects and arrays", () => {
    expect(stableStringify({})).toBe("{}");
    expect(stableStringify([])).toBe("[]");
    expect(stableStringify({ a: [], b: {} })).toBe('{"a":[],"b":{}}');
  });
});
