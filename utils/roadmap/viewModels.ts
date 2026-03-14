import {
  ROADMAP_STAGE_METADATA,
  ROADMAP_STAGE_SEQUENCE,
} from "@/utils/engine/roadmap/roadmapGenerationEngine";
import type {
  DomainCoverageStatus,
  FinancialSnapshotPayload,
  OverallCoverageLevel,
  RoadmapPayload,
} from "@/utils/engine/types";

type CoverageTone = "warning" | "positive" | "neutral";

export type CoverageChipViewModel = {
  label: "Preliminary coverage" | "Coverage strong" | "Coverage limited";
  tone: CoverageTone;
};

export type HomeViewModel = {
  coverageChip: CoverageChipViewModel;
  stage: {
    id: string;
    label: string;
    description: string;
  };
  currentFocus: {
    label: string;
    description: string;
  };
  nextAction: {
    actionId: string;
    title: string;
    recommendation: string;
    confidence: "low" | "medium" | "high";
  };
  keyMetric: {
    label: string;
    value: string;
  };
  reasoningPreview: string[];
  limitationPreview: string[];
  snapshotCards?: Array<{
    key:
      | "netWorth"
      | "monthlyIncome"
      | "monthlySpending"
      | "monthlySurplus"
      | "totalDebt"
      | "liquidCash";
    label: string;
    value: string;
    deltaLabel?: string;
  }>;
  ctas: Array<{
    type:
      | "see_full_roadmap"
      | "view_step_detail"
      | "link_more_accounts"
      | "manage_accounts";
    label: string;
  }>;
};

export type RoadmapStageCard = {
  stageId: string;
  label: string;
  status: "completed" | "current" | "upcoming" | "blocked";
  description: string;
  blockedReason?: string;
  isCurrent: boolean;
};

export type RoadmapViewModel = {
  coverageChip: CoverageChipViewModel;
  currentStageId: string;
  stageCards: RoadmapStageCard[];
  currentFocus: {
    label: string;
    description: string;
  };
  nextAction: {
    actionId: string;
    title: string;
    recommendation: string;
  };
  whyPlacedHere: string;
  goalImpacts: string[];
  limitations: string[];
  recommendedAccountsToLink: string[];
};

export type StepDetailViewModel = {
  stage: {
    id: string;
    label: string;
  };
  focus: {
    label: string;
    description: string;
  };
  nextAction: {
    actionId: string;
    title: string;
    recommendation: string;
    rationale: string;
    confidence: "low" | "medium" | "high";
    alternativeOptions?: Array<{
      title: string;
      tradeoff: string;
    }>;
  };
  whyNow: string;
  reasoningBullets: string[];
  limitations: string[];
  goalImpacts: string[];
  domainCoverage: Array<{
    domain: string;
    level: "none" | "limited" | "strong";
  }>;
  requiredCoverageDomains: string[];
  ctas: Array<{
    type: "link_more_accounts" | "see_full_roadmap" | "manage_accounts";
    label: string;
  }>;
};

function humanizeIdentifier(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function mapCoverageLevelToChip(
  level: OverallCoverageLevel,
): CoverageChipViewModel {
  switch (level) {
    case "strong":
      return {
        label: "Coverage strong",
        tone: "positive",
      };
    case "preliminary":
      return {
        label: "Preliminary coverage",
        tone: "warning",
      };
    case "demo":
    default:
      return {
        label: "Coverage limited",
        tone: "neutral",
      };
  }
}

function shouldEncourageLinking(level: OverallCoverageLevel): boolean {
  return level !== "strong";
}

function buildHomeSnapshotCards(
  roadmap: RoadmapPayload,
  snapshot: FinancialSnapshotPayload | null | undefined,
): HomeViewModel["snapshotCards"] {
  if (!snapshot) {
    return undefined;
  }

  type SnapshotCard = NonNullable<HomeViewModel["snapshotCards"]>[number];
  const allMetrics: Record<SnapshotCard["key"], SnapshotCard | undefined> = {
    netWorth: snapshot.netWorth
      ? {
          key: "netWorth",
          label: snapshot.netWorth.label,
          value: snapshot.netWorth.value,
          deltaLabel: snapshot.netWorth.deltaLabel,
        }
      : undefined,
    monthlySurplus: snapshot.monthlySurplus
      ? {
          key: "monthlySurplus",
          label: snapshot.monthlySurplus.label,
          value: snapshot.monthlySurplus.value,
          deltaLabel: snapshot.monthlySurplus.deltaLabel,
        }
      : undefined,
    totalDebt: snapshot.totalDebt
      ? {
          key: "totalDebt",
          label: snapshot.totalDebt.label,
          value: snapshot.totalDebt.value,
          deltaLabel: snapshot.totalDebt.deltaLabel,
        }
      : undefined,
    liquidCash: snapshot.liquidCash
      ? {
          key: "liquidCash",
          label: snapshot.liquidCash.label,
          value: snapshot.liquidCash.value,
          deltaLabel: snapshot.liquidCash.deltaLabel,
        }
      : undefined,
    monthlyIncome: snapshot.monthlyIncome
      ? {
          key: "monthlyIncome",
          label: snapshot.monthlyIncome.label,
          value: snapshot.monthlyIncome.value,
          deltaLabel: snapshot.monthlyIncome.deltaLabel,
        }
      : undefined,
    monthlySpending: snapshot.monthlySpending
      ? {
          key: "monthlySpending",
          label: snapshot.monthlySpending.label,
          value: snapshot.monthlySpending.value,
          deltaLabel: snapshot.monthlySpending.deltaLabel,
        }
      : undefined,
  };

  const orderedKeys: SnapshotCard["key"][] =
    roadmap.currentStage.id === "get_stable"
      ? ["monthlySurplus", "monthlySpending", "liquidCash"]
      : roadmap.currentStage.id === "build_your_buffer"
        ? ["liquidCash", "monthlySurplus", "monthlySpending"]
        : roadmap.currentStage.id === "clear_expensive_debt"
          ? ["totalDebt", "monthlySurplus", "liquidCash"]
          : roadmap.currentStage.id === "strengthen_your_safety_net"
            ? ["liquidCash", "totalDebt", "monthlySurplus"]
            : roadmap.currentStage.id === "fund_whats_next"
              ? ["liquidCash", "monthlySurplus", "netWorth"]
              : ["netWorth", "monthlySurplus", "totalDebt"];

  const orderedMetrics = orderedKeys.map((key) => allMetrics[key]);

  return orderedMetrics
    .filter((metric): metric is SnapshotCard => Boolean(metric))
    .slice(0, 3);
}

function mapDomainCoverageLevel(
  level: DomainCoverageStatus,
): "none" | "limited" | "strong" {
  if (level === "strong") {
    return "strong";
  }

  if (level === "none") {
    return "none";
  }

  return "limited";
}

export function roadmapToHomeViewModel(
  roadmap: RoadmapPayload,
  snapshot?: FinancialSnapshotPayload | null,
): HomeViewModel {
  const shouldLinkAccounts = shouldEncourageLinking(
    roadmap.overallCoverageLevel,
  );

  return {
    coverageChip: mapCoverageLevelToChip(roadmap.overallCoverageLevel),
    stage: roadmap.currentStage,
    currentFocus: roadmap.currentFocus,
    nextAction: {
      actionId: roadmap.nextAction.actionId,
      title: roadmap.nextAction.title,
      recommendation: roadmap.nextAction.recommendation,
      confidence: roadmap.nextAction.confidence,
    },
    keyMetric: roadmap.keyMetric,
    reasoningPreview: roadmap.explanation.reasoningBullets.slice(0, 2),
    limitationPreview: roadmap.explanation.limitations.slice(0, 2),
    snapshotCards: buildHomeSnapshotCards(roadmap, snapshot),
    ctas: [
      {
        type: "view_step_detail",
        label: "View step detail",
      },
      {
        type: "see_full_roadmap",
        label: "See full roadmap",
      },
      shouldLinkAccounts
        ? {
            type: "link_more_accounts",
            label: "Link more accounts",
          }
        : {
            type: "manage_accounts",
            label: "Manage accounts",
          },
    ],
  };
}

export function roadmapToRoadmapViewModel(
  roadmap: RoadmapPayload,
): RoadmapViewModel {
  const blockedStages = new Map(
    roadmap.blockedStages.map((stage) => [stage.stageId, stage.reason]),
  );
  const completedStages = new Set(roadmap.completedStages);
  const upcomingStages = new Set(roadmap.upcomingStages);

  return {
    coverageChip: mapCoverageLevelToChip(roadmap.overallCoverageLevel),
    currentStageId: roadmap.currentStage.id,
    stageCards: ROADMAP_STAGE_SEQUENCE.map((stageId) => {
      const blockedReason = blockedStages.get(stageId);
      const isCurrent = stageId === roadmap.currentStage.id;

      let status: RoadmapStageCard["status"] = "upcoming";
      if (blockedReason) {
        status = "blocked";
      } else if (isCurrent) {
        status = "current";
      } else if (completedStages.has(stageId)) {
        status = "completed";
      } else if (upcomingStages.has(stageId)) {
        status = "upcoming";
      }

      return {
        stageId,
        label: ROADMAP_STAGE_METADATA[stageId].label,
        description: ROADMAP_STAGE_METADATA[stageId].description,
        status,
        blockedReason,
        isCurrent,
      };
    }),
    currentFocus: roadmap.currentFocus,
    nextAction: {
      actionId: roadmap.nextAction.actionId,
      title: roadmap.nextAction.title,
      recommendation: roadmap.nextAction.recommendation,
    },
    whyPlacedHere: roadmap.explanation.whyPlacedHere,
    goalImpacts: roadmap.explanation.goalImpacts,
    limitations: roadmap.explanation.limitations,
    recommendedAccountsToLink: shouldEncourageLinking(
      roadmap.overallCoverageLevel,
    )
      ? roadmap.recommendedAccountsToLink
      : [],
  };
}

export function roadmapToStepDetailViewModel(
  roadmap: RoadmapPayload,
  stepId?: string,
): StepDetailViewModel {
  void stepId;
  const shouldLinkAccounts = shouldEncourageLinking(
    roadmap.overallCoverageLevel,
  );

  return {
    stage: {
      id: roadmap.currentStage.id,
      label: roadmap.currentStage.label,
    },
    focus: roadmap.currentFocus,
    nextAction: {
      actionId: roadmap.nextAction.actionId,
      title: roadmap.nextAction.title,
      recommendation: roadmap.nextAction.recommendation,
      rationale: roadmap.nextAction.rationale,
      confidence: roadmap.nextAction.confidence,
      alternativeOptions: roadmap.nextAction.alternativeOptions,
    },
    whyNow: roadmap.explanation.whyPlacedHere,
    reasoningBullets: roadmap.explanation.reasoningBullets,
    limitations: roadmap.explanation.limitations,
    goalImpacts: roadmap.explanation.goalImpacts,
    domainCoverage: Object.entries(roadmap.domainCoverage).map(
      ([domain, level]) => ({
        domain: humanizeIdentifier(domain),
        level: mapDomainCoverageLevel(level),
      }),
    ),
    requiredCoverageDomains:
      roadmap.nextAction.requiredCoverageDomains.map(humanizeIdentifier),
    ctas: [
      shouldLinkAccounts
        ? {
            type: "link_more_accounts",
            label: "Link more accounts",
          }
        : {
            type: "manage_accounts",
            label: "Manage accounts",
          },
      {
        type: "see_full_roadmap",
        label: "See full roadmap",
      },
    ],
  };
}
