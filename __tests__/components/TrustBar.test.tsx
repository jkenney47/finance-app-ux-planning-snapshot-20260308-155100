import { TrustBar } from "@/components/trust/TrustBar";
import { darkTheme, lightTheme } from "@/theme/paper";
import { render } from "@test-utils";

const SAMPLE_STATUSES = [
  {
    id: "chase",
    name: "Chase",
    status: "connected" as const,
    lastSynced: "Updated 2h ago",
  },
  {
    id: "capone",
    name: "Capital One",
    status: "relink" as const,
    lastSynced: "Needs reconnect",
  },
];

describe("TrustBar", () => {
  it("matches snapshot in light theme", () => {
    const { toJSON } = render(
      <TrustBar
        institutionStatuses={SAMPLE_STATUSES}
        onManageConnections={jest.fn()}
      />,
      { theme: lightTheme },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it("matches snapshot in dark theme", () => {
    const { toJSON } = render(
      <TrustBar
        institutionStatuses={SAMPLE_STATUSES}
        onManageConnections={jest.fn()}
      />,
      { theme: darkTheme },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
