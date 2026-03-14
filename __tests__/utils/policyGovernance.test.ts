import {
  buildPolicyGovernanceSnapshots,
  normalizePolicyGovernancePacks,
  type PolicyGovernancePackRow,
  comparePolicyRows,
} from "@/utils/services/policyGovernance";

describe("policy governance helpers", () => {
  it("normalizes valid rows and filters unsupported domains/statuses", () => {
    const rows = [
      {
        domain: "rates",
        version: 3,
        status: "approved",
        effective_from: "2026-02-17T00:00:00.000Z",
        approved_at: "2026-02-17T00:10:00.000Z",
      },
      {
        domain: "unknown",
        version: 1,
        status: "approved",
        effective_from: "2026-02-17T00:00:00.000Z",
      },
      {
        domain: "thresholds",
        version: 2,
        status: "retired",
        effective_from: "2026-02-17T00:00:00.000Z",
      },
    ];

    const normalized = normalizePolicyGovernancePacks(
      rows as unknown as PolicyGovernancePackRow[],
    );
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      domain: "rates",
      version: 3,
      status: "approved",
    });
  });

  describe("normalizePolicyGovernancePacks sorting and mapping", () => {
    it("filters out invalid domains and statuses", () => {
      const rows = [
        {
          domain: "rates",
          version: 1,
          status: "approved",
          effective_from: "2026-01-01T00:00:00.000Z",
        },
        {
          domain: "invalid-domain",
          version: 1,
          status: "approved",
          effective_from: "2026-01-01T00:00:00.000Z",
        },
        {
          domain: "thresholds",
          version: 1,
          status: "invalid-status",
          effective_from: "2026-01-01T00:00:00.000Z",
        },
      ];
      const normalized = normalizePolicyGovernancePacks(
        rows as unknown as PolicyGovernancePackRow[],
      );
      expect(normalized).toHaveLength(1);
      expect(normalized[0].domain).toBe("rates");
    });

    it("sorts by version descending", () => {
      const rows = [
        {
          domain: "rates",
          version: 1,
          status: "approved",
          effective_from: "2026-01-01T00:00:00.000Z",
        },
        {
          domain: "rates",
          version: 3,
          status: "approved",
          effective_from: "2026-01-01T00:00:00.000Z",
        },
        {
          domain: "rates",
          version: 2,
          status: "approved",
          effective_from: "2026-01-01T00:00:00.000Z",
        },
      ];
      const normalized = normalizePolicyGovernancePacks(
        rows as unknown as PolicyGovernancePackRow[],
      );
      expect(normalized.map((p) => p.version)).toEqual([3, 2, 1]);
    });

    it("sorts by effectiveFrom descending when versions are equal", () => {
      const rows = [
        {
          domain: "rates",
          version: 1,
          status: "approved",
          effective_from: "2026-01-01T00:00:00.000Z",
        },
        {
          domain: "rates",
          version: 1,
          status: "approved",
          effective_from: "2026-03-01T00:00:00.000Z",
        },
        {
          domain: "rates",
          version: 1,
          status: "approved",
          effective_from: "2026-02-01T00:00:00.000Z",
        },
      ];
      const normalized = normalizePolicyGovernancePacks(
        rows as unknown as PolicyGovernancePackRow[],
      );
      expect(normalized.map((p) => p.effectiveFrom)).toEqual([
        "2026-03-01T00:00:00.000Z",
        "2026-02-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
      ]);
    });

    it("handles invalid dates in effectiveFrom sorting", () => {
      const rows = [
        {
          domain: "rates",
          version: 1,
          status: "approved",
          effective_from: "invalid-date",
        },
        {
          domain: "rates",
          version: 1,
          status: "approved",
          effective_from: "2026-01-01T00:00:00.000Z",
        },
        {
          domain: "rates",
          version: 1,
          status: "approved",
          effective_from: "another-invalid-date",
        },
      ];
      const normalized = normalizePolicyGovernancePacks(
        rows as unknown as PolicyGovernancePackRow[],
      );
      expect(normalized[0].effectiveFrom).toBe("2026-01-01T00:00:00.000Z");
      expect(normalized[1].effectiveFrom).toBe("invalid-date");
      expect(normalized[2].effectiveFrom).toBe("another-invalid-date");
    });

    it("maps all fields correctly including optionals", () => {
      const rows = [
        {
          id: "test-id",
          domain: "rates",
          version: 1,
          status: "approved",
          effective_from: "2026-01-01T00:00:00.000Z",
          effective_to: "2026-12-31T00:00:00.000Z",
          approved_at: "2025-12-31T00:00:00.000Z",
          updated_at: "2025-12-31T01:00:00.000Z",
          source: { foo: "bar" },
        },
      ];
      const normalized = normalizePolicyGovernancePacks(
        rows as unknown as PolicyGovernancePackRow[],
      );
      expect(normalized[0]).toEqual({
        id: "test-id",
        domain: "rates",
        version: 1,
        status: "approved",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveTo: "2026-12-31T00:00:00.000Z",
        approvedAt: "2025-12-31T00:00:00.000Z",
        updatedAt: "2025-12-31T01:00:00.000Z",
        source: { foo: "bar" },
      });
    });
  });

  it("builds per-domain snapshots with latest approved and draft versions", () => {
    const rows = [
      {
        id: "r1",
        domain: "rates",
        version: 1,
        status: "approved",
        effective_from: "2026-01-01T00:00:00.000Z",
        approved_at: "2026-01-01T00:01:00.000Z",
      },
      {
        id: "r2",
        domain: "rates",
        version: 2,
        status: "approved",
        effective_from: "2026-02-01T00:00:00.000Z",
        approved_at: "2026-02-01T00:01:00.000Z",
      },
      {
        id: "r3",
        domain: "rates",
        version: 3,
        status: "draft",
        effective_from: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "t1",
        domain: "thresholds",
        version: 1,
        status: "approved",
        effective_from: "2026-01-01T00:00:00.000Z",
        approved_at: "2026-01-01T00:05:00.000Z",
      },
    ];

    const snapshots = buildPolicyGovernanceSnapshots(rows);
    const rates = snapshots.find((snapshot) => snapshot.domain === "rates");
    const thresholds = snapshots.find(
      (snapshot) => snapshot.domain === "thresholds",
    );

    expect(rates?.latestApproved?.version).toBe(2);
    expect(rates?.latestDraft?.version).toBe(3);
    expect(rates?.approvedHistory.map((pack) => pack.version)).toEqual([2, 1]);
    expect(thresholds?.latestApproved?.version).toBe(1);
    expect(thresholds?.latestDraft).toBeNull();
  });

  it("handles sorting with invalid effectiveFrom dates", () => {
    const rows = [
      {
        domain: "rates",
        version: 1,
        status: "approved",
        effective_from: "invalid-date-1",
      },
      {
        domain: "rates",
        version: 1,
        status: "approved",
        effective_from: "2026-02-01T00:00:00.000Z",
      },
      {
        domain: "rates",
        version: 1,
        status: "approved",
        effective_from: "invalid-date-2",
      },
      {
        domain: "rates",
        version: 1,
        status: "approved",
        effective_from: "2026-01-01T00:00:00.000Z",
      },
    ];

    const normalized = normalizePolicyGovernancePacks(rows);

    expect(normalized[0].effectiveFrom).toBe("2026-02-01T00:00:00.000Z");
    expect(normalized[1].effectiveFrom).toBe("2026-01-01T00:00:00.000Z");
    // The relative order of the NaNs might be preserved depending on sort stability.
    // In our case: if left is NaN, it returns 1 (pushes down). If right is NaN, it returns -1. If both are NaN, it returns 0.
    // 2026-02 vs invalid -> invalid is right, returns -1 (2026-02 first).
    // invalid-1 vs invalid-2 -> both NaN, returns 0.
    expect(normalized[2].effectiveFrom).toBe("invalid-date-2");
    expect(normalized[3].effectiveFrom).toBe("invalid-date-1");
  });

  it("builds snapshots correctly when handling invalid dates during normalization", () => {
    const rows = [
      {
        id: "p1",
        domain: "tax_labels",
        version: 1,
        status: "approved",
        effective_from: "invalid-1",
      },
      {
        id: "p2",
        domain: "tax_labels",
        version: 1,
        status: "approved",
        effective_from: "invalid-2",
      },
      {
        id: "p3",
        domain: "tax_labels",
        version: 1,
        status: "approved",
        effective_from: "2026-01-01T00:00:00.000Z",
      },
    ];

    const snapshots = buildPolicyGovernanceSnapshots(rows);
    const taxLabels = snapshots.find((s) => s.domain === "tax_labels");

    expect(taxLabels?.latestApproved?.effectiveFrom).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(taxLabels?.approvedHistory).toHaveLength(3);
    expect(taxLabels?.latestDraft).toBeNull();
  });

  it("builds snapshot for all domains even if no data is provided", () => {
    const snapshots = buildPolicyGovernanceSnapshots([]);
    expect(snapshots.length).toBeGreaterThan(0);

    const rates = snapshots.find((s) => s.domain === "rates");
    expect(rates).toMatchObject({
      domain: "rates",
      latestApproved: null,
      latestDraft: null,
      approvedHistory: [],
    });
  });

  describe("comparePolicyRows sorting logic", () => {
    it("handles invalid dates as tie breakers", () => {
      // left is NaN, right is NaN
      expect(
        comparePolicyRows(
          { version: 1, effectiveFrom: "invalid" },
          { version: 1, effectiveFrom: "invalid" },
        ),
      ).toBe(0);
      // left is NaN, right is valid
      expect(
        comparePolicyRows(
          { version: 1, effectiveFrom: "invalid" },
          { version: 1, effectiveFrom: "2026-01-01" },
        ),
      ).toBe(1);
      // left is valid, right is NaN
      expect(
        comparePolicyRows(
          { version: 1, effectiveFrom: "2026-01-01" },
          { version: 1, effectiveFrom: "invalid" },
        ),
      ).toBe(-1);
    });
  });
});
