import { makeFact } from "@/utils/contracts/facts";

describe("makeFact", () => {
  it("creates a fact with default parameters", () => {
    const beforeDate = new Date().toISOString();
    const fact = makeFact("hasLinkedAccounts", true);
    const afterDate = new Date().toISOString();

    expect(fact.key).toBe("hasLinkedAccounts");
    expect(fact.value).toBe(true);
    expect(fact.source).toBe("manual");
    expect(fact.confidence).toBe(1);

    // Check if asOf is a valid ISO string and within the expected time frame
    expect(typeof fact.asOf).toBe("string");
    expect(new Date(fact.asOf).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeDate).getTime(),
    );
    expect(new Date(fact.asOf).getTime()).toBeLessThanOrEqual(
      new Date(afterDate).getTime(),
    );
  });

  it("creates a fact with explicit parameters", () => {
    const customDate = new Date("2023-01-01T00:00:00Z").toISOString();
    const fact = makeFact(
      "incomeMonthlyNet",
      5000,
      "inferred",
      0.8,
      customDate,
    );

    expect(fact.key).toBe("incomeMonthlyNet");
    expect(fact.value).toBe(5000);
    expect(fact.source).toBe("inferred");
    expect(fact.confidence).toBe(0.8);
    expect(fact.asOf).toBe(customDate);
  });

  it("works with different FactKey types (string union)", () => {
    const fact = makeFact("incomeStability", "stable");
    expect(fact.key).toBe("incomeStability");
    expect(fact.value).toBe("stable");
  });

  it("works with different FactKey types (array of objects)", () => {
    const debts = [
      {
        id: "1",
        name: "Credit Card",
        type: "credit_card" as const,
        apr: 0.15,
        balance: 1000,
      },
    ];
    const fact = makeFact("debts", debts);
    expect(fact.key).toBe("debts");
    expect(fact.value).toEqual(debts);
  });
});
