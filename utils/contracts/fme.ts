import type { FactKey, FactRequest } from "@/utils/contracts/facts";
import type { PolicyDomain, PolicyStatus } from "@/utils/contracts/policy";

export type FmeMode =
  | "needs_info"
  | "blocked_policy_stale"
  | "crisis"
  | "stabilize"
  | "build"
  | "optimize";

export type JourneyMilestoneId =
  | "cash_flow_truth"
  | "deductible_shield"
  | "protection_gap"
  | "match_arbitrage"
  | "toxic_debt_purge"
  | "fortress_fund";

export type MilestoneStatus =
  | "needs_info"
  | "blocked_policy_stale"
  | "in_progress"
  | "complete"
  | "not_relevant";

export type RecommendationId =
  | "connect_accounts"
  | "stabilize_cash_flow"
  | "build_deductible_shield"
  | "close_protection_gap"
  | "capture_employer_match"
  | "tackle_toxic_debt"
  | "build_fortress_fund"
  | "collect_missing_facts"
  | "keep_momentum";

export type ReasoningTrace = {
  traceId: string;
  ruleId: string;
  factsUsed: FactKey[];
  policyRefs: string[];
  computed: Record<string, number | string | boolean>;
};

export type Recommendation = {
  id: RecommendationId;
  phase: JourneyMilestoneId;
  title: string;
  summary: string;
  actionLabel: string;
  actionRoute?: string;
  analyticsEvent: string;
  pros: string[];
  cons: string[];
  assumptions: string[];
  requiredFacts: FactKey[];
  policyDomains: PolicyDomain[];
  priority: number;
  traceRefs: string[];
};

export type RecommendationDecisionMode = "act_now" | "hold_steady";

export type RecommendationDecisionGate = {
  milestoneId: JourneyMilestoneId;
  status: MilestoneStatus;
  detail: string;
};

export type RecommendationDecision = {
  mode: RecommendationDecisionMode;
  confidence: number;
  confidenceThreshold: number;
  assumptions: string[];
  triggerConditions: string[];
  nextMilestoneGate: RecommendationDecisionGate | null;
  criticalMissingFacts: FactKey[];
  stalePolicyDomains: PolicyDomain[];
  recommendedActionId: RecommendationId | null;
};

export type JourneyMilestone = {
  id: JourneyMilestoneId;
  title: string;
  status: MilestoneStatus;
  detail: string;
};

export type FmeEvaluation = {
  mode: FmeMode;
  decision: RecommendationDecision;
  primaryRecommendation: Recommendation | null;
  alternatives: Recommendation[];
  milestones: JourneyMilestone[];
  factRequests: FactRequest[];
  policyStatus: PolicyStatus[];
  trace: ReasoningTrace[];
  generatedAt: string;
};
