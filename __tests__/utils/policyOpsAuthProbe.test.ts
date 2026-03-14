import { getPolicyOpsAuthProbe } from "@/utils/queries/usePolicyOpsAuthProbe";

const mockPost = jest.fn();

jest.mock("@/utils/services/backendClient", () => ({
  backendClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe("policy ops auth probe", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("returns authorized state when probe succeeds", async () => {
    mockPost.mockResolvedValue({
      status: "authorized",
      authMode: "admin_jwt",
      actorUserId: "user-123",
    });

    await expect(getPolicyOpsAuthProbe()).resolves.toEqual({
      authorized: true,
      authMode: "admin_jwt",
      actorUserId: "user-123",
    });
  });

  it("returns unauthorized state when probe fails", async () => {
    mockPost.mockRejectedValue(new Error("forbidden"));

    await expect(getPolicyOpsAuthProbe()).resolves.toEqual({
      authorized: false,
      authMode: "unknown",
      actorUserId: null,
    });
  });
});
