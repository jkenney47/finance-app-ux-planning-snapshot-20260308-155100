import type {
  FactKey,
  FactPriority,
  FactRequest,
  FactValueByKey,
  FactsSnapshot,
  FinancialDebt,
  HouseholdIncomeStructure,
  IncomeStability,
  StressScore,
} from "@/utils/contracts/facts";
import type {
  FmeEvaluation,
  FmeMode,
  JourneyMilestone,
  RecommendationDecisionGate,
  Recommendation,
  ReasoningTrace,
} from "@/utils/contracts/fme";
import type { PolicyBundle, PolicyDomain } from "@/utils/contracts/policy";
import {
  buildDefaultPolicyBundle,
  getPolicyStatuses,
} from "@/utils/domain/fme/policies";

type EvaluateFinancialMaturityInput = {
  facts: FactsSnapshot;
  policyBundle?: PolicyBundle;
  nowIso?: string;
};

type RecommendationInput = Omit<Recommendation, "traceRefs"> & {
  trace: Omit<ReasoningTrace, "traceId">;
};

const PRIORITY_ORDER: Record<FactPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const ACT_NOW_CONFIDENCE_THRESHOLD = 0.72;

const MILESTONE_TITLES: Record<JourneyMilestone["id"], string> = {
  cash_flow_truth: "Cash flow truth",
  deductible_shield: "Deductible shield",
  protection_gap: "Protection gap",
  match_arbitrage: "Employer match",
  toxic_debt_purge: "Toxic debt purge",
  fortress_fund: "Fortress fund",
};

function getFactValue<K extends FactKey>(
  facts: FactsSnapshot,
  key: K,
): FactValueByKey[K] | undefined {
  const record = facts[key];
  if (!record) return undefined;
  return record.value as FactValueByKey[K];
}

function createMilestone(
  id: JourneyMilestone["id"],
  status: JourneyMilestone["status"],
  detail: string,
): JourneyMilestone {
  return {
    id,
    title: MILESTONE_TITLES[id],
    status,
    detail,
  };
}

function debtThreshold(
  riskFreeRateApy: number,
  debtRiskPremiumApr: number,
  toxicAprFloor: number,
): number {
  return Math.max(toxicAprFloor, riskFreeRateApy + debtRiskPremiumApr);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function buildFortressMonths(
  stability: IncomeStability,
  household: HouseholdIncomeStructure,
  stableSingle: number,
  stableDual: number,
  variableSingle: number,
  variableDual: number,
): number {
  if (stability === "stable" && household === "single") return stableSingle;
  if (stability === "stable" && household === "dual") return stableDual;
  if (stability === "variable" && household === "single") return variableSingle;
  return variableDual;
}

function debtPayoffStrategy(
  stressScore: StressScore | undefined,
): "snowball" | "avalanche" {
  return stressScore === "high" ? "snowball" : "avalanche";
}

function sortToxicDebts(
  debts: FinancialDebt[],
  strategy: "snowball" | "avalanche",
): FinancialDebt[] {
  return [...debts].sort((left, right) => {
    if (strategy === "snowball") {
      return left.balance - right.balance;
    }
    return right.apr - left.apr;
  });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function factTriggerCondition(key: FactKey): string {
  switch (key) {
    case "incomeMonthlyNet":
      return "Add your monthly net income to validate cash-flow direction.";
    case "burnRateMonthly":
      return "Add your monthly burn rate to confirm runway and reserve targets.";
    case "liquidSavings":
      return "Add your liquid savings balance to unlock reserve guidance.";
    case "debts":
      return "Add debt balances and APR values to unlock payoff prioritization.";
    case "hasHealthInsurance":
      return "Confirm current health coverage status to clear protection checks.";
    case "incomeStability":
      return "Set income stability so reserve targets can be calibrated correctly.";
    case "householdIncomeStructure":
      return "Set household income structure to complete fortress-fund sizing.";
    default:
      return `Complete ${key} to improve recommendation precision.`;
  }
}

function uniqueList(items: string[]): string[] {
  return Array.from(new Set(items));
}

export function evaluateFinancialMaturity({
  facts,
  policyBundle,
  nowIso = new Date().toISOString(),
}: EvaluateFinancialMaturityInput): FmeEvaluation {
  const activePolicyBundle = policyBundle ?? buildDefaultPolicyBundle(nowIso);
  const policyStatus = getPolicyStatuses(activePolicyBundle, nowIso);
  const stalePolicyDomains = new Set<PolicyDomain>(
    policyStatus
      .filter((status) => status.isStale)
      .map((status) => status.domain),
  );

  const trace: ReasoningTrace[] = [];
  const recommendations: Recommendation[] = [];
  const milestones: JourneyMilestone[] = [];
  const factRequests: FactRequest[] = [];
  const factRequestMap = new Map<FactKey, FactRequest>();
  let traceCounter = 0;

  const addFactRequest = (
    key: FactKey,
    reason: string,
    priority: FactPriority,
  ): void => {
    const existing = factRequestMap.get(key);
    if (
      !existing ||
      PRIORITY_ORDER[priority] > PRIORITY_ORDER[existing.priority]
    ) {
      factRequestMap.set(key, {
        key,
        reason,
        priority,
      });
    }
  };

  const addRecommendation = (input: RecommendationInput): boolean => {
    const hasStaleDependency = input.policyDomains.some((domain) =>
      stalePolicyDomains.has(domain),
    );
    if (hasStaleDependency) {
      return false;
    }

    traceCounter += 1;
    const traceId = `trace_${traceCounter}`;
    trace.push({
      traceId,
      ...input.trace,
    });
    recommendations.push({
      ...input,
      traceRefs: [traceId],
    });
    return true;
  };

  const hasLinkedAccounts = getFactValue(facts, "hasLinkedAccounts") ?? false;

  if (!hasLinkedAccounts) {
    addRecommendation({
      id: "connect_accounts",
      phase: "cash_flow_truth",
      title: "Link accounts for fiduciary-grade planning",
      summary:
        "Connect your accounts so the engine can compute your real burn rate and evaluate recommendations with fewer assumptions.",
      actionLabel: "Link accounts",
      actionRoute: "/(auth)/plaid-link",
      analyticsEvent: "fme_connect_accounts",
      pros: [
        "Reduces manual input errors",
        "Improves recommendation confidence and traceability",
      ],
      cons: ["Requires account linking and periodic sync"],
      assumptions: ["No linked account data is currently available"],
      requiredFacts: ["hasLinkedAccounts"],
      policyDomains: [],
      priority: 100,
      trace: {
        ruleId: "rule_connect_accounts",
        factsUsed: ["hasLinkedAccounts"],
        policyRefs: [],
        computed: { hasLinkedAccounts },
      },
    });
  }

  const incomeMonthlyNet = getFactValue(facts, "incomeMonthlyNet");
  const burnRateMonthly = getFactValue(facts, "burnRateMonthly");
  const liquidSavings = getFactValue(facts, "liquidSavings");
  const highestInsuranceDeductible = getFactValue(
    facts,
    "highestInsuranceDeductible",
  );
  const hasHealthInsurance = getFactValue(facts, "hasHealthInsurance");
  const hasDisabilityInsurance = getFactValue(facts, "hasDisabilityInsurance");
  const hasTermLifeInsurance = getFactValue(facts, "hasTermLifeInsurance");
  const dependentsCount = getFactValue(facts, "dependentsCount");
  const employerMatchEligible = getFactValue(facts, "employerMatchEligible");
  const employerMatchPercent = getFactValue(facts, "employerMatchPercent");
  const retirementContributionPercent = getFactValue(
    facts,
    "retirementContributionPercent",
  );
  const stressScore = getFactValue(facts, "stressScore");
  const debts = getFactValue(facts, "debts");
  const incomeStability = getFactValue(facts, "incomeStability");
  const householdIncomeStructure = getFactValue(
    facts,
    "householdIncomeStructure",
  );

  if (incomeMonthlyNet === undefined) {
    addFactRequest(
      "incomeMonthlyNet",
      "Needed to evaluate cash flow risk and fiduciary suitability.",
      "high",
    );
  }
  if (burnRateMonthly === undefined) {
    addFactRequest(
      "burnRateMonthly",
      "Needed to calculate emergency and fortress fund targets.",
      "high",
    );
  }

  const isCrisis =
    incomeMonthlyNet !== undefined &&
    burnRateMonthly !== undefined &&
    incomeMonthlyNet < burnRateMonthly;

  if (incomeMonthlyNet === undefined || burnRateMonthly === undefined) {
    milestones.push(
      createMilestone(
        "cash_flow_truth",
        "needs_info",
        "Add monthly income and burn rate to evaluate your cash flow position.",
      ),
    );
  } else if (isCrisis) {
    milestones.push(
      createMilestone(
        "cash_flow_truth",
        "in_progress",
        "Cash flow is negative. Stabilization actions should come before optimization.",
      ),
    );
    addRecommendation({
      id: "stabilize_cash_flow",
      phase: "cash_flow_truth",
      title: "Stabilize cash flow before optimization",
      summary:
        "Monthly burn currently exceeds income. Reduce burn and pause optional optimization moves until baseline cash flow is positive.",
      actionLabel: "Create stabilization plan",
      analyticsEvent: "fme_stabilize_cash_flow",
      pros: [
        "Prevents short-term cash shortfalls",
        "Protects against new high-interest debt accumulation",
      ],
      cons: ["May delay investing and long-term optimization actions"],
      assumptions: ["Income and spending inputs are representative"],
      requiredFacts: ["incomeMonthlyNet", "burnRateMonthly"],
      policyDomains: [],
      priority: 99,
      trace: {
        ruleId: "rule_cash_flow_crisis",
        factsUsed: ["incomeMonthlyNet", "burnRateMonthly"],
        policyRefs: [],
        computed: {
          incomeMonthlyNet,
          burnRateMonthly,
          monthlyGap: incomeMonthlyNet - burnRateMonthly,
        },
      },
    });
  } else {
    milestones.push(
      createMilestone(
        "cash_flow_truth",
        "complete",
        "Cash flow baseline is positive using available inputs.",
      ),
    );
  }

  const thresholdsPolicy = activePolicyBundle.domains.thresholds?.data;
  if (!thresholdsPolicy || stalePolicyDomains.has("thresholds")) {
    milestones.push(
      createMilestone(
        "deductible_shield",
        "blocked_policy_stale",
        "Starter fund target is blocked until threshold policy is refreshed.",
      ),
    );
  } else if (
    liquidSavings === undefined ||
    highestInsuranceDeductible === undefined
  ) {
    milestones.push(
      createMilestone(
        "deductible_shield",
        "needs_info",
        "Add liquid savings and highest deductible to compute your starter target.",
      ),
    );
    if (liquidSavings === undefined) {
      addFactRequest(
        "liquidSavings",
        "Needed to compare against your deductible shield target.",
        "high",
      );
    }
    if (highestInsuranceDeductible === undefined) {
      addFactRequest(
        "highestInsuranceDeductible",
        "Needed to set your deductible shield floor.",
        "medium",
      );
    }
  } else {
    const starterTarget = Math.max(
      thresholdsPolicy.starterFundFloor,
      highestInsuranceDeductible,
      burnRateMonthly ?? thresholdsPolicy.starterFundFloor,
    );
    if (liquidSavings < starterTarget) {
      milestones.push(
        createMilestone(
          "deductible_shield",
          "in_progress",
          "Starter cash reserve is below the deductible shield target.",
        ),
      );
      addRecommendation({
        id: "build_deductible_shield",
        phase: "deductible_shield",
        title: "Build the deductible shield first",
        summary:
          "Target enough liquidity to absorb a deductible-level shock without adding expensive debt.",
        actionLabel: "Set shield target",
        analyticsEvent: "fme_build_deductible_shield",
        pros: [
          "Reduces the chance of emergency debt spirals",
          "Creates resilience before taking additional risk",
        ],
        cons: ["Can temporarily slow debt payoff or investing"],
        assumptions: [
          "Highest deductible and spending inputs reflect current coverage.",
        ],
        requiredFacts: [
          "liquidSavings",
          "highestInsuranceDeductible",
          "burnRateMonthly",
        ],
        policyDomains: ["thresholds"],
        priority: 92,
        trace: {
          ruleId: "rule_deductible_shield",
          factsUsed: [
            "liquidSavings",
            "highestInsuranceDeductible",
            "burnRateMonthly",
          ],
          policyRefs: ["thresholds.starterFundFloor"],
          computed: {
            liquidSavings,
            highestInsuranceDeductible,
            starterTarget,
          },
        },
      });
    } else {
      milestones.push(
        createMilestone(
          "deductible_shield",
          "complete",
          "Liquid savings meet the deductible shield target.",
        ),
      );
    }
  }

  const needsProtectionReview =
    hasHealthInsurance === false ||
    hasDisabilityInsurance !== true ||
    ((dependentsCount ?? 0) > 0 && hasTermLifeInsurance !== true);

  if (hasHealthInsurance === undefined || dependentsCount === undefined) {
    milestones.push(
      createMilestone(
        "protection_gap",
        "needs_info",
        "Add insurance and dependents details to evaluate protection exposure.",
      ),
    );
    if (hasHealthInsurance === undefined) {
      addFactRequest(
        "hasHealthInsurance",
        "Needed to evaluate immediate protection risk.",
        "high",
      );
    }
    if (dependentsCount === undefined) {
      addFactRequest(
        "dependentsCount",
        "Needed to evaluate life insurance planning needs.",
        "medium",
      );
    }
  } else if (needsProtectionReview) {
    milestones.push(
      createMilestone(
        "protection_gap",
        "in_progress",
        "Protection coverage appears incomplete for current household risk.",
      ),
    );
    addRecommendation({
      id: "close_protection_gap",
      phase: "protection_gap",
      title: "Close critical protection gaps",
      summary:
        "Review health, disability, and term life coverage to reduce catastrophic downside risk before advanced optimization.",
      actionLabel: "Review coverage",
      analyticsEvent: "fme_close_protection_gap",
      pros: [
        "Protects household solvency against severe life events",
        "Reduces fiduciary risk from unhedged human-capital exposure",
      ],
      cons: ["May increase monthly insurance costs"],
      assumptions: ["Coverage fields reflect active policies"],
      requiredFacts: [
        "hasHealthInsurance",
        "hasDisabilityInsurance",
        "hasTermLifeInsurance",
        "dependentsCount",
      ],
      policyDomains: [],
      priority: 94,
      trace: {
        ruleId: "rule_protection_gap",
        factsUsed: [
          "hasHealthInsurance",
          "hasDisabilityInsurance",
          "hasTermLifeInsurance",
          "dependentsCount",
        ],
        policyRefs: [],
        computed: {
          hasHealthInsurance,
          hasDisabilityInsurance: hasDisabilityInsurance ?? "unknown",
          hasTermLifeInsurance: hasTermLifeInsurance ?? "unknown",
          dependentsCount,
        },
      },
    });
  } else {
    milestones.push(
      createMilestone(
        "protection_gap",
        "complete",
        "Protection checks are currently in a healthy range.",
      ),
    );
  }

  if (employerMatchEligible === undefined) {
    milestones.push(
      createMilestone(
        "match_arbitrage",
        "needs_info",
        "Add employer plan eligibility to assess match capture.",
      ),
    );
    addFactRequest(
      "employerMatchEligible",
      "Needed to evaluate whether employer match arbitrage is available.",
      "medium",
    );
  } else if (!employerMatchEligible) {
    milestones.push(
      createMilestone(
        "match_arbitrage",
        "not_relevant",
        "Employer match is not currently available.",
      ),
    );
  } else {
    const matchTarget = employerMatchPercent ?? 0.05;
    const currentContribution = retirementContributionPercent ?? 0;
    if (retirementContributionPercent === undefined) {
      addFactRequest(
        "retirementContributionPercent",
        "Needed to assess whether you are capturing the full employer match.",
        "medium",
      );
    }
    if (currentContribution < matchTarget) {
      milestones.push(
        createMilestone(
          "match_arbitrage",
          "in_progress",
          "Retirement contribution is below the estimated employer match target.",
        ),
      );
      addRecommendation({
        id: "capture_employer_match",
        phase: "match_arbitrage",
        title: "Capture the full employer match",
        summary:
          "Increase contribution to at least the employer match threshold before lower-return alternatives.",
        actionLabel: "Adjust contribution",
        analyticsEvent: "fme_capture_employer_match",
        pros: [
          "Immediate return through employer matching dollars",
          "Accelerates retirement savings trajectory",
        ],
        cons: ["Reduces near-term take-home cash flow"],
        assumptions: ["Employer match details are accurate"],
        requiredFacts: [
          "employerMatchEligible",
          "employerMatchPercent",
          "retirementContributionPercent",
        ],
        policyDomains: ["limits"],
        priority: 88,
        trace: {
          ruleId: "rule_match_arbitrage",
          factsUsed: [
            "employerMatchEligible",
            "employerMatchPercent",
            "retirementContributionPercent",
          ],
          policyRefs: ["limits.retirementContributionTargetPercent"],
          computed: {
            currentContribution,
            matchTarget,
            contributionGap: matchTarget - currentContribution,
          },
        },
      });
    } else {
      milestones.push(
        createMilestone(
          "match_arbitrage",
          "complete",
          "Current contribution appears to meet or exceed employer match level.",
        ),
      );
    }
  }

  const ratesPolicy = activePolicyBundle.domains.rates?.data;
  if (!debts) {
    milestones.push(
      createMilestone(
        "toxic_debt_purge",
        "needs_info",
        "Add debt balances and APRs to classify debt risk.",
      ),
    );
    addFactRequest(
      "debts",
      "Needed to rank debt by effective cost and fiduciary urgency.",
      "high",
    );
  } else if (debts.length === 0) {
    milestones.push(
      createMilestone(
        "toxic_debt_purge",
        "not_relevant",
        "No debt balances were provided.",
      ),
    );
  } else if (!ratesPolicy || stalePolicyDomains.has("rates")) {
    milestones.push(
      createMilestone(
        "toxic_debt_purge",
        "blocked_policy_stale",
        "Debt prioritization is blocked until rates policy is refreshed.",
      ),
    );
  } else {
    const threshold = debtThreshold(
      ratesPolicy.riskFreeRateApy,
      ratesPolicy.debtRiskPremiumApr,
      ratesPolicy.toxicAprFloor,
    );
    const toxicDebts = debts.filter((debt) => debt.apr >= threshold);
    if (toxicDebts.length > 0) {
      const strategy = debtPayoffStrategy(stressScore);
      const prioritizedDebts = sortToxicDebts(toxicDebts, strategy);
      const leadDebt = prioritizedDebts[0];
      const strategySummary =
        strategy === "snowball"
          ? "Start with the smallest toxic balance first for quick momentum, then roll payments forward."
          : "Start with the highest APR toxic debt first to minimize total lifetime interest.";
      const strategyPros =
        strategy === "snowball"
          ? [
              "Builds behavioral momentum with faster early wins",
              "Can reduce financial stress while still targeting toxic APR debt",
            ]
          : [
              "Reduces guaranteed drag from high-interest liabilities fastest",
              "Improves monthly cash flow as expensive balances decline",
            ];
      const strategyCons =
        strategy === "snowball"
          ? [
              "May cost more total interest than pure APR-first optimization",
              "Requires discipline to keep rolling freed cash into the next debt",
            ]
          : [
              "Can feel slower if the highest APR balance is large",
              "May increase abandonment risk for high-stress users",
            ];

      milestones.push(
        createMilestone(
          "toxic_debt_purge",
          "in_progress",
          `${toxicDebts.length} debt account(s) exceed the toxic threshold.`,
        ),
      );
      addRecommendation({
        id: "tackle_toxic_debt",
        phase: "toxic_debt_purge",
        title: "Prioritize toxic debt payoff",
        summary: `${strategySummary}${leadDebt ? ` Start with ${leadDebt.name}.` : ""}`,
        actionLabel:
          strategy === "snowball"
            ? "Start snowball payoff plan"
            : "Start avalanche payoff plan",
        analyticsEvent: "fme_tackle_toxic_debt",
        pros: strategyPros,
        cons: [...strategyCons, "May defer some investment contributions"],
        assumptions: ["Debt APRs and balances are up to date"],
        requiredFacts: ["debts", "stressScore"],
        policyDomains: ["rates"],
        priority: 90,
        trace: {
          ruleId: "rule_toxic_debt",
          factsUsed: ["debts", "stressScore"],
          policyRefs: [
            "rates.riskFreeRateApy",
            "rates.debtRiskPremiumApr",
            "rates.toxicAprFloor",
          ],
          computed: {
            debtCount: debts.length,
            toxicDebtCount: toxicDebts.length,
            threshold,
            payoffStrategy: strategy,
            stressScore: stressScore ?? "unknown",
            leadDebtId: leadDebt?.id ?? "unknown",
          },
        },
      });
    } else {
      milestones.push(
        createMilestone(
          "toxic_debt_purge",
          "complete",
          `No debt currently exceeds the toxic threshold (${formatPercent(threshold)}).`,
        ),
      );
    }
  }

  if (!thresholdsPolicy || stalePolicyDomains.has("thresholds")) {
    milestones.push(
      createMilestone(
        "fortress_fund",
        "blocked_policy_stale",
        "Emergency reserve sizing is blocked until threshold policy is refreshed.",
      ),
    );
  } else if (
    burnRateMonthly === undefined ||
    liquidSavings === undefined ||
    incomeStability === undefined ||
    householdIncomeStructure === undefined
  ) {
    milestones.push(
      createMilestone(
        "fortress_fund",
        "needs_info",
        "Add burn rate, savings, and household stability details for reserve sizing.",
      ),
    );
    if (incomeStability === undefined) {
      addFactRequest(
        "incomeStability",
        "Needed to calibrate emergency fund months for income volatility.",
        "high",
      );
    }
    if (householdIncomeStructure === undefined) {
      addFactRequest(
        "householdIncomeStructure",
        "Needed to calibrate emergency fund months for household support.",
        "high",
      );
    }
  } else {
    const fortressMonths = buildFortressMonths(
      incomeStability,
      householdIncomeStructure,
      thresholdsPolicy.fortressFundMonths.stableSingle,
      thresholdsPolicy.fortressFundMonths.stableDual,
      thresholdsPolicy.fortressFundMonths.variableSingle,
      thresholdsPolicy.fortressFundMonths.variableDual,
    );
    const fortressTarget = burnRateMonthly * fortressMonths;
    if (liquidSavings < fortressTarget) {
      milestones.push(
        createMilestone(
          "fortress_fund",
          "in_progress",
          `Current reserves are below the ${fortressMonths}-month target.`,
        ),
      );
      addRecommendation({
        id: "build_fortress_fund",
        phase: "fortress_fund",
        title: "Increase fortress fund coverage",
        summary:
          "Build liquid reserves toward the dynamic month target for your income stability and household profile.",
        actionLabel: "Set reserve plan",
        analyticsEvent: "fme_build_fortress_fund",
        pros: [
          "Improves resilience to income shocks",
          "Reduces forced withdrawals from long-term assets",
        ],
        cons: ["May slow optimization allocations while funding the reserve"],
        assumptions: [
          "Burn rate and savings inputs reflect current conditions.",
        ],
        requiredFacts: [
          "burnRateMonthly",
          "liquidSavings",
          "incomeStability",
          "householdIncomeStructure",
        ],
        policyDomains: ["thresholds"],
        priority: 78,
        trace: {
          ruleId: "rule_fortress_fund",
          factsUsed: [
            "burnRateMonthly",
            "liquidSavings",
            "incomeStability",
            "householdIncomeStructure",
          ],
          policyRefs: [
            "thresholds.fortressFundMonths.stableSingle",
            "thresholds.fortressFundMonths.stableDual",
            "thresholds.fortressFundMonths.variableSingle",
            "thresholds.fortressFundMonths.variableDual",
          ],
          computed: {
            fortressMonths,
            fortressTarget,
            liquidSavings,
          },
        },
      });
    } else {
      milestones.push(
        createMilestone(
          "fortress_fund",
          "complete",
          "Emergency reserve currently meets the dynamic target.",
        ),
      );
    }
  }

  for (const value of factRequestMap.values()) {
    factRequests.push(value);
  }
  factRequests.sort(
    (left, right) =>
      PRIORITY_ORDER[right.priority] - PRIORITY_ORDER[left.priority],
  );

  recommendations.sort((left, right) => right.priority - left.priority);

  if (recommendations.length === 0 && factRequests.length > 0) {
    addRecommendation({
      id: "collect_missing_facts",
      phase: "cash_flow_truth",
      title: "Collect missing inputs",
      summary:
        "Complete key inputs so the model can issue a fully-specified fiduciary recommendation.",
      actionLabel: "Update profile inputs",
      actionRoute: "/onboarding",
      analyticsEvent: "fme_collect_missing_facts",
      pros: [
        "Improves recommendation precision and audit confidence",
        "Enables additional strategy paths",
      ],
      cons: ["Requires additional user input"],
      assumptions: ["Current profile is missing required facts"],
      requiredFacts: factRequests.map((request) => request.key),
      policyDomains: [],
      priority: 40,
      trace: {
        ruleId: "rule_collect_missing_facts",
        factsUsed: factRequests.map((request) => request.key),
        policyRefs: [],
        computed: {
          missingFactCount: factRequests.length,
        },
      },
    });
    recommendations.sort((left, right) => right.priority - left.priority);
  }

  if (recommendations.length === 0) {
    addRecommendation({
      id: "keep_momentum",
      phase: "fortress_fund",
      title: "Maintain your current trajectory",
      summary:
        "Current inputs do not indicate urgent intervention. Continue monitoring and refresh inputs as your situation changes.",
      actionLabel: "Review journey",
      actionRoute: "/(dashboard)/journey",
      analyticsEvent: "fme_keep_momentum",
      pros: [
        "Avoids unnecessary account churn",
        "Keeps strategy aligned to measured risk and goals",
      ],
      cons: ["May miss opportunities if inputs become stale"],
      assumptions: ["Provided facts remain current"],
      requiredFacts: [],
      policyDomains: [],
      priority: 1,
      trace: {
        ruleId: "rule_keep_momentum",
        factsUsed: [],
        policyRefs: [],
        computed: { recommendationCount: 0 },
      },
    });
    recommendations.sort((left, right) => right.priority - left.priority);
  }

  const primaryRecommendation = recommendations[0] ?? null;
  const alternatives = recommendations.slice(1, 3);

  let mode: FmeMode = "build";
  if (stalePolicyDomains.size > 0 && recommendations.length === 0) {
    mode = "blocked_policy_stale";
  } else if (isCrisis) {
    mode = "crisis";
  } else if (
    recommendations.some((recommendation) =>
      [
        "build_deductible_shield",
        "close_protection_gap",
        "tackle_toxic_debt",
      ].includes(recommendation.id),
    )
  ) {
    mode = "stabilize";
  } else if (factRequests.length > 0) {
    mode = "needs_info";
  } else if (
    recommendations.some((recommendation) =>
      ["capture_employer_match", "build_fortress_fund"].includes(
        recommendation.id,
      ),
    )
  ) {
    mode = "build";
  } else {
    mode = "optimize";
  }

  const primaryRequiredFacts = new Set(
    primaryRecommendation?.requiredFacts ?? [],
  );
  const criticalMissingFacts = factRequests
    .filter(
      (request) =>
        request.priority === "high" &&
        (primaryRequiredFacts.size === 0 ||
          primaryRequiredFacts.has(request.key)),
    )
    .map((request) => request.key);

  const requiredMissingFacts = factRequests.filter((request) =>
    primaryRequiredFacts.has(request.key),
  );

  let confidenceScore = 0.92;
  confidenceScore -= criticalMissingFacts.length * 0.18;
  confidenceScore -=
    Math.max(0, requiredMissingFacts.length - criticalMissingFacts.length) *
    0.06;
  confidenceScore -= stalePolicyDomains.size > 0 ? 0.08 : 0;
  confidenceScore -= primaryRecommendation ? 0 : 0.2;
  confidenceScore -=
    primaryRecommendation?.id === "collect_missing_facts" ? 0.12 : 0;
  confidenceScore -= primaryRecommendation?.id === "keep_momentum" ? 0.05 : 0;
  const confidence = clamp(Number(confidenceScore.toFixed(2)), 0.05, 0.99);

  const nextMilestone = milestones.find((milestone) =>
    ["needs_info", "blocked_policy_stale", "in_progress"].includes(
      milestone.status,
    ),
  );
  const nextMilestoneGate: RecommendationDecisionGate | null = nextMilestone
    ? {
        milestoneId: nextMilestone.id,
        status: nextMilestone.status,
        detail: nextMilestone.detail,
      }
    : null;

  const triggerConditions: string[] = [];
  for (const key of criticalMissingFacts) {
    triggerConditions.push(factTriggerCondition(key));
  }
  if (stalePolicyDomains.size > 0) {
    triggerConditions.push(
      `Refresh stale policy domains (${Array.from(stalePolicyDomains).join(", ")}) to unlock full recommendation coverage.`,
    );
  }
  if (nextMilestoneGate) {
    triggerConditions.push(
      `Clear milestone gate "${nextMilestoneGate.milestoneId}": ${nextMilestoneGate.detail}`,
    );
  }
  if (confidence < ACT_NOW_CONFIDENCE_THRESHOLD) {
    triggerConditions.push(
      `Raise decision confidence to at least ${Math.round(ACT_NOW_CONFIDENCE_THRESHOLD * 100)}% before taking a new action.`,
    );
  }
  if (triggerConditions.length === 0 && primaryRecommendation) {
    triggerConditions.push(
      `Re-check conditions after your next data refresh for "${primaryRecommendation.title}".`,
    );
  }

  const decisionAssumptions = uniqueList([
    ...(primaryRecommendation?.assumptions ?? []),
    ...(factRequests.length > 0
      ? ["Some profile inputs are still missing and may limit precision."]
      : []),
    ...(stalePolicyDomains.size > 0
      ? ["One or more policy domains are stale and can suppress guidance."]
      : []),
  ]);

  const actionableRecommendation =
    primaryRecommendation !== null &&
    !["collect_missing_facts", "keep_momentum"].includes(
      primaryRecommendation.id,
    );
  const decisionMode =
    actionableRecommendation &&
    confidence >= ACT_NOW_CONFIDENCE_THRESHOLD &&
    criticalMissingFacts.length === 0 &&
    stalePolicyDomains.size === 0
      ? "act_now"
      : "hold_steady";

  return {
    mode,
    decision: {
      mode: decisionMode,
      confidence,
      confidenceThreshold: ACT_NOW_CONFIDENCE_THRESHOLD,
      assumptions: decisionAssumptions,
      triggerConditions: uniqueList(triggerConditions),
      nextMilestoneGate,
      criticalMissingFacts,
      stalePolicyDomains: Array.from(stalePolicyDomains),
      recommendedActionId: primaryRecommendation?.id ?? null,
    },
    primaryRecommendation,
    alternatives,
    milestones,
    factRequests,
    policyStatus,
    trace,
    generatedAt: nowIso,
  };
}

export function toxicDebtAccounts(
  debts: FinancialDebt[],
  riskFreeRateApy: number,
  debtRiskPremiumApr: number,
  toxicAprFloor: number,
): FinancialDebt[] {
  const threshold = debtThreshold(
    riskFreeRateApy,
    debtRiskPremiumApr,
    toxicAprFloor,
  );
  return debts.filter((debt) => debt.apr >= threshold);
}
