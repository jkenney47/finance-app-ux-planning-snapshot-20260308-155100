import type { AskContextPayload } from "@/stores/useAskStore";

const SCREEN_LABELS: Record<string, string> = {
  home: "Home",
  roadmap: "Roadmap",
  insights: "Insights",
  profile: "Profile",
  accounts: "Accounts",
  goals: "Goals",
  step_detail: "Step detail",
  policy_ops: "Policy Ops",
  agent_hub: "Agent Hub",
};

const METRIC_LABELS: Record<string, string> = {
  cash_flow_trend: "cash flow trend",
  cash_flow_actual: "cash flow actuals",
  spending_categories: "spending categories",
  net_worth: "net worth",
  roadmap_progress: "roadmap progress",
  accounts_linked: "connected accounts",
  connection_health: "connection health",
  coverage_confidence: "coverage confidence",
  goal_funding_progress: "goal funding progress",
  goal_setup: "goal setup",
};

function humanizeIdentifier(input: string): string {
  return input
    .replace(/\[|\]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSentenceCase(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

export function getAskScreenLabel(screen: string): string {
  return SCREEN_LABELS[screen] ?? toSentenceCase(humanizeIdentifier(screen));
}

export function getAskMetricLabel(metricId: string): string {
  return METRIC_LABELS[metricId] ?? humanizeIdentifier(metricId).toLowerCase();
}

export function getAskHeadline(context: AskContextPayload): string {
  if (context.stepId || context.recommendationId) {
    return "Ask about this step";
  }

  if (context.metricId) {
    return `Ask about ${getAskMetricLabel(context.metricId)}`;
  }

  return `Ask about ${getAskScreenLabel(context.screen).toLowerCase()}`;
}

export function getAskFabLabel(context: AskContextPayload): string {
  if (context.stepId || context.recommendationId) {
    return "Ask Step";
  }

  if (context.metricId) {
    return "Ask Metric";
  }

  const screenLabel = getAskScreenLabel(context.screen).split(" ")[0];
  return `Ask ${screenLabel}`;
}

export function getAskContextSummary(context: AskContextPayload): string {
  const summaryParts = [`Screen: ${getAskScreenLabel(context.screen)}`];

  if (context.recommendationId) {
    summaryParts.push(
      `Step: ${humanizeIdentifier(context.recommendationId).toLowerCase()}`,
    );
  }

  if (context.metricId) {
    summaryParts.push(`Metric: ${getAskMetricLabel(context.metricId)}`);
  }

  return summaryParts.join(" · ");
}

export function getAskSuggestedPrompts(context: AskContextPayload): string[] {
  if (context.stepId || context.recommendationId) {
    return [
      "Why is this the suggested next step right now?",
      "What does this step unlock and what does it delay?",
      "What assumptions most affect this recommendation?",
    ];
  }

  if (context.metricId) {
    return [
      "What does this metric trend mean for my roadmap?",
      "What is one concrete action to improve this metric this month?",
      "How sensitive is this metric to missing account data?",
    ];
  }

  if (context.screen === "roadmap") {
    return [
      "What is the most important milestone in my current stage?",
      "Which step should I start this week and why?",
      "What is preventing faster roadmap progress?",
    ];
  }

  if (context.screen === "insights") {
    return [
      "Which trend needs attention first?",
      "How do these insights change my next step priority?",
      "What pattern should I watch over the next pay cycle?",
    ];
  }

  if (context.screen === "accounts") {
    return [
      "Which institution should I reconnect first to improve accuracy?",
      "How does reconnecting this account change my roadmap confidence?",
      "What data is currently missing from disconnected institutions?",
    ];
  }

  if (context.screen === "profile") {
    return [
      "What should I do next to improve my data coverage?",
      "How does my current confidence level affect recommendations?",
      "Which setting changes are most useful right now?",
    ];
  }

  if (context.screen === "goals") {
    return [
      "How much should I contribute this pay cycle to stay on target?",
      "Which goal should I prioritize first and why?",
      "What tradeoffs should I consider before increasing contributions?",
    ];
  }

  return [
    "What is my most important next action and why?",
    "How confident is this guidance based on my current data?",
    "What account should I connect next to improve plan accuracy?",
  ];
}

export function getDefaultAskPrompt(context: AskContextPayload): string {
  return getAskSuggestedPrompts(context)[0];
}
