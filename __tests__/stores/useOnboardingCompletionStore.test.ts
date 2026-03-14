import { useOnboardingCompletionStore } from "@/stores/useOnboardingCompletionStore";

describe("useOnboardingCompletionStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useOnboardingCompletionStore.setState({ completedByUserId: {} });
  });

  it("marks a user as complete and reports completion", () => {
    useOnboardingCompletionStore.getState().markComplete("user-1");

    expect(useOnboardingCompletionStore.getState().isComplete("user-1")).toBe(
      true,
    );
    expect(useOnboardingCompletionStore.getState().isComplete("user-2")).toBe(
      false,
    );
  });

  it("resets a specific user and can reset all users", () => {
    useOnboardingCompletionStore.getState().markComplete("user-1");
    useOnboardingCompletionStore.getState().markComplete("user-2");

    useOnboardingCompletionStore.getState().reset("user-1");
    expect(useOnboardingCompletionStore.getState().isComplete("user-1")).toBe(
      false,
    );
    expect(useOnboardingCompletionStore.getState().isComplete("user-2")).toBe(
      true,
    );

    useOnboardingCompletionStore.getState().reset();
    expect(useOnboardingCompletionStore.getState().isComplete("user-2")).toBe(
      false,
    );
  });
});
