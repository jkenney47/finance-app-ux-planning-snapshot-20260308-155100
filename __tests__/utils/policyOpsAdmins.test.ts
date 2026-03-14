import { getPolicyOpsAdmins } from "@/utils/queries/usePolicyOpsAdmins";

const mockPost = jest.fn();

jest.mock("@/utils/services/backendClient", () => ({
  backendClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe("policy ops admins query", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("returns admin rows from governance endpoint", async () => {
    mockPost.mockResolvedValue({
      admins: [
        {
          user_id: "0f53b9d8-bf09-4a93-b6f9-6f2b393897be",
          active: true,
          notes: "seed admin",
          added_by_user_id: null,
          created_at: "2026-02-17T20:00:00.000Z",
          updated_at: "2026-02-17T20:00:00.000Z",
        },
      ],
    });

    await expect(getPolicyOpsAdmins()).resolves.toEqual([
      {
        user_id: "0f53b9d8-bf09-4a93-b6f9-6f2b393897be",
        active: true,
        notes: "seed admin",
        added_by_user_id: null,
        created_at: "2026-02-17T20:00:00.000Z",
        updated_at: "2026-02-17T20:00:00.000Z",
      },
    ]);
  });

  it("returns empty array when endpoint response has no admins", async () => {
    mockPost.mockResolvedValue({});
    await expect(getPolicyOpsAdmins()).resolves.toEqual([]);
  });
});
