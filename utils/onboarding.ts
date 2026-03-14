import { supabase } from "@/utils/supabaseClient";

// Shared type for onboarding data
export interface OnboardingData {
  accounts: unknown[];
  manualAccount: { name: string; balance: string };
  goals: string[];
  otherGoal: string;
  risk: string;
  nudges: boolean;
}

export interface OnboardingResult {
  success: boolean;
  error?: string;
}

const MANUAL_ACCOUNT_ITEM_ID = "manual";
const MANUAL_PRIMARY_ACCOUNT_ID = "manual-primary";

function parseBalance(balance: string): number | null {
  const normalized = balance.replace(/[$,\s]/g, "");
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function toUniqueGoalNames(data: OnboardingData): string[] {
  const rawNames = [...data.goals, data.otherGoal];
  const seen = new Set<string>();
  const goalNames: string[] = [];

  for (const rawName of rawNames) {
    const name = rawName.trim();
    if (!name) {
      continue;
    }
    const dedupeKey = name.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    goalNames.push(name);
  }

  return goalNames;
}

/**
 * Submits onboarding data to Supabase (or backend API).
 * This function is platform-agnostic and can be reused in web/mobile.
 */
export async function submitOnboarding(
  data: OnboardingData,
): Promise<OnboardingResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return { success: false, error: "User not authenticated" };
    }

    const userId = authData.user.id;
    const accountName = data.manualAccount.name.trim();
    const manualBalance = parseBalance(data.manualAccount.balance);
    const goals = toUniqueGoalNames(data);

    if (accountName) {
      if (manualBalance === null) {
        return {
          success: false,
          error: "Manual account balance must be a valid number.",
        };
      }
      const { error: accountError } = await supabase.from("accounts").upsert(
        [
          {
            user_id: userId,
            plaid_item_id: MANUAL_ACCOUNT_ITEM_ID,
            plaid_account_id: MANUAL_PRIMARY_ACCOUNT_ID,
            account_name: accountName,
            account_type: "manual",
            account_subtype: "manual",
            balance: manualBalance,
          },
        ],
        {
          onConflict: "user_id,plaid_account_id",
        },
      );

      if (accountError) {
        return { success: false, error: accountError.message };
      }
    }

    if (goals.length > 0) {
      const { data: existingGoals, error: existingGoalsError } = await supabase
        .from("user_goals")
        .select("name")
        .eq("user_id", userId);

      if (existingGoalsError) {
        return { success: false, error: existingGoalsError.message };
      }

      const existingGoalNames = new Set(
        (existingGoals ?? []).map((goal) => goal.name.trim().toLowerCase()),
      );
      const goalsToInsert = goals
        .filter((goal) => !existingGoalNames.has(goal.toLowerCase()))
        .map((goal) => ({
          user_id: userId,
          name: goal,
          target_amount: 0,
          saved_amount: 0,
          status: "active" as const,
        }));

      if (goalsToInsert.length > 0) {
        const { error: goalInsertError } = await supabase
          .from("user_goals")
          .insert(goalsToInsert);
        if (goalInsertError) {
          return { success: false, error: goalInsertError.message };
        }
      }
    }

    return { success: true };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Unknown onboarding submission error";
    return { success: false, error: message };
  }
}

/**
 * Validates onboarding data. Returns a map of field errors (empty if valid).
 */
export function validateOnboarding(data: OnboardingData): {
  [field: string]: string;
} {
  const errors: { [field: string]: string } = {};
  if (!data.manualAccount.name || !data.manualAccount.balance) {
    errors.manualAccount = "Please enter both account name and balance.";
  } else if (parseBalance(data.manualAccount.balance) === null) {
    errors.manualAccount = "Please enter a valid numeric balance.";
  }
  if (data.goals.length === 0 && !data.otherGoal) {
    errors.goals = "Please select at least one goal or enter a custom goal.";
  }
  if (!data.risk) {
    errors.risk = "Please select your risk profile.";
  }
  // Add more rules as needed
  return errors;
}
