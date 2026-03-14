export type DecisionPhase =
  | "connect_accounts"
  | "build_emergency_fund"
  | "invest_employer_match"
  | "focus_debt"
  | "set_goal";

export type DecisionInput = {
  hasLinkedAccounts: boolean;
  emergencyFundMonths: number;
  employerMatchEligible: boolean;
  hasHighAprDebt: boolean;
  customGoalCount: number;
};

export type DecisionOutput = {
  phase: DecisionPhase;
  title: string;
  description: string;
  actionLabel: string;
  analyticsEvent: string;
};

export type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
  institution?: string;
  mask?: string;
};

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  description: string;
  accountId: string;
};
