import { ROADMAP_STAGE_METADATA } from "@/utils/engine/roadmap/roadmapGenerationEngine";
import type {
  FinancialSnapshotPayload,
  RoadmapPayload,
  RoadmapStageId,
} from "@/utils/engine/types";

type CoverageTone = "positive" | "warning" | "neutral";

export type CoverageDisplay = {
  label: "Coverage strong" | "Coverage limited" | "Action needed";
  tone: CoverageTone;
  summary: string;
  impact: string;
  actionLabel: string;
  staleCategories: string[];
  recommendedAccountsToLink: string[];
  banner: {
    title: string;
    description: string;
  } | null;
};

export type MonthlyReviewSection = {
  label: string;
  value: string;
};

export type MonthlyReviewSummary = {
  snapshot: MonthlyReviewSection[];
  whatChanged: string[];
  roadmapProgress: {
    currentStage: string;
    nextStage?: string;
    summary: string;
  };
  advisorUpdate: string;
  nextMove: {
    primary: string;
    secondary?: string;
  };
  dataHealth: {
    label: CoverageDisplay["label"];
    summary: string;
  };
};

const STRESS_MODE_FOCUS_CODES = new Set([
  "catch_up_bills",
  "stop_overdrafts",
  "stabilize_cash_flow",
]);

function normalizeCoverageActionLabel(hasActionNeeded: boolean): string {
  return hasActionNeeded ? "Manage accounts" : "Improve coverage";
}

function getFutureStageLabel(stageId?: RoadmapStageId): string | undefined {
  if (!stageId) {
    return undefined;
  }

  return ROADMAP_STAGE_METADATA[stageId]?.label;
}

export function isRoadmapStressMode(roadmap: RoadmapPayload): boolean {
  return (
    roadmap.currentStage.id === "get_stable" &&
    (STRESS_MODE_FOCUS_CODES.has(roadmap.currentFocus.code) ||
      (roadmap.keyMetric.rawValue ?? 0) < 0)
  );
}

export function buildCoverageDisplay(args: {
  roadmap: RoadmapPayload;
  snapshot?: FinancialSnapshotPayload | null;
}): CoverageDisplay {
  const staleCategories = args.snapshot?.accountFreshness.staleCategories ?? [];
  const recommendedAccountsToLink = args.roadmap.recommendedAccountsToLink;
  const hasActionNeeded = staleCategories.length > 0;
  const hasLimitedCoverage =
    args.roadmap.overallCoverageLevel !== "strong" ||
    recommendedAccountsToLink.length > 0;

  if (hasActionNeeded) {
    const joined = staleCategories.join(", ");
    return {
      label: "Action needed",
      tone: "warning",
      summary:
        "Some linked institutions need attention before the roadmap is fully dependable.",
      impact:
        joined.length > 0
          ? `Freshness issues in ${joined} may weaken the current recommendation.`
          : "Freshness issues may weaken the current recommendation.",
      actionLabel: normalizeCoverageActionLabel(true),
      staleCategories,
      recommendedAccountsToLink,
      banner: {
        title: "Action needed",
        description:
          joined.length > 0
            ? `${joined} needs attention. Refresh that data to keep the recommendation trustworthy.`
            : "Some linked data needs attention to keep the recommendation trustworthy.",
      },
    };
  }

  if (hasLimitedCoverage) {
    const joined =
      recommendedAccountsToLink.length > 0
        ? recommendedAccountsToLink.join(", ")
        : "more linked account coverage";
    return {
      label: "Coverage limited",
      tone:
        args.roadmap.overallCoverageLevel === "preliminary"
          ? "warning"
          : "neutral",
      summary:
        args.roadmap.overallCoverageLevel === "preliminary"
          ? "The roadmap is usable, but stronger coverage would sharpen tradeoffs."
          : "This is still a preliminary roadmap with limited connected data.",
      impact: `Link ${joined} to improve how specific the next recommendation can be.`,
      actionLabel: "Improve coverage",
      staleCategories,
      recommendedAccountsToLink,
      banner:
        recommendedAccountsToLink.length > 0
          ? {
              title: "Coverage limited",
              description: `Link ${joined} to improve the current recommendation and unblock deeper guidance.`,
            }
          : null,
    };
  }

  return {
    label: "Coverage strong",
    tone: "positive",
    summary:
      "Your current recommendation is supported by enough linked data to trust the main tradeoffs.",
    impact:
      "The roadmap has broad enough coverage to keep the main next step and stage sequencing stable.",
    actionLabel: "Manage accounts",
    staleCategories,
    recommendedAccountsToLink,
    banner: null,
  };
}

export function buildMonthlyReviewSummary(args: {
  roadmap: RoadmapPayload;
  snapshot?: FinancialSnapshotPayload | null;
}): MonthlyReviewSummary {
  const coverage = buildCoverageDisplay(args);
  const snapshot = args.snapshot;
  const sections: MonthlyReviewSection[] = [
    snapshot?.netWorth
      ? { label: snapshot.netWorth.label, value: snapshot.netWorth.value }
      : null,
    snapshot?.monthlySurplus
      ? {
          label: snapshot.monthlySurplus.label,
          value: snapshot.monthlySurplus.value,
        }
      : null,
    snapshot?.totalDebt
      ? { label: snapshot.totalDebt.label, value: snapshot.totalDebt.value }
      : snapshot?.liquidCash
        ? { label: snapshot.liquidCash.label, value: snapshot.liquidCash.value }
        : null,
    snapshot?.monthlyIncome
      ? {
          label: snapshot.monthlyIncome.label,
          value: snapshot.monthlyIncome.value,
        }
      : null,
  ].filter((section): section is MonthlyReviewSection => Boolean(section));

  const whatChanged = [
    args.roadmap.keyMetric.value !== "Not enough data yet"
      ? `${args.roadmap.keyMetric.label} is now ${args.roadmap.keyMetric.value.toLowerCase()}.`
      : null,
    args.roadmap.explanation.goalImpacts[0]
      ? args.roadmap.explanation.goalImpacts[0]
      : null,
    coverage.banner?.description ?? null,
    args.roadmap.explanation.reasoningBullets[0] ?? null,
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  return {
    snapshot: sections,
    whatChanged,
    roadmapProgress: {
      currentStage: args.roadmap.currentStage.label,
      nextStage: getFutureStageLabel(args.roadmap.upcomingStages[0]),
      summary: args.roadmap.explanation.whyPlacedHere,
    },
    advisorUpdate: args.roadmap.explanation.whyPlacedHere,
    nextMove: {
      primary: args.roadmap.nextAction.title,
      secondary: args.roadmap.nextAction.alternativeOptions?.[0]?.title,
    },
    dataHealth: {
      label: coverage.label,
      summary: coverage.summary,
    },
  };
}
