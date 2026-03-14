import { useMockGoalsStore } from "@/stores/useMockGoalsStore";

describe("useMockGoalsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useMockGoalsStore.getState().resetGoals();
  });

  it("creates a goal with normalized defaults and derived progress", () => {
    const createdGoal = useMockGoalsStore.getState().createGoal({
      name: " Emergency Fund ",
      targetAmount: 10000,
      savedAmount: 2500,
      cadence: " ",
      milestoneNote: "",
    });

    expect(createdGoal.id).toMatch(/^mock-goal-\d+$/);
    expect(createdGoal.name).toBe("Emergency Fund");
    expect(createdGoal.target).toBe(10000);
    expect(createdGoal.saved).toBe(2500);
    expect(createdGoal.progress).toBe(0.25);
    expect(createdGoal.cadence).toBe("Manual contributions");
    expect(createdGoal.nextMilestone).toBe("No milestone set yet");
    expect(createdGoal.status).toBe("active");
    expect(useMockGoalsStore.getState().goals).toEqual([createdGoal]);
  });

  it("updates an existing goal and returns null for missing goals", () => {
    const createdGoal = useMockGoalsStore.getState().createGoal({
      name: "Vacation",
      targetAmount: 5000,
      savedAmount: 1000,
    });

    const updatedGoal = useMockGoalsStore.getState().updateGoal({
      goalId: createdGoal.id,
      targetAmount: -1,
      savedAmount: -3,
      cadence: "Weekly",
      milestoneNote: "Book flights",
      status: "paused",
    });

    expect(updatedGoal).not.toBeNull();
    expect(updatedGoal?.target).toBe(0);
    expect(updatedGoal?.saved).toBe(0);
    expect(updatedGoal?.progress).toBe(0);
    expect(updatedGoal?.cadence).toBe("Weekly");
    expect(updatedGoal?.nextMilestone).toBe("Book flights");
    expect(updatedGoal?.status).toBe("paused");

    const missingGoal = useMockGoalsStore.getState().updateGoal({
      goalId: "missing-goal",
      savedAmount: 100,
    });

    expect(missingGoal).toBeNull();
  });

  it("resets all mock goals", () => {
    useMockGoalsStore.getState().createGoal({
      name: "Retirement",
      targetAmount: 500000,
    });

    expect(useMockGoalsStore.getState().goals.length).toBe(1);
    useMockGoalsStore.getState().resetGoals();
    expect(useMockGoalsStore.getState().goals).toEqual([]);
  });
});
