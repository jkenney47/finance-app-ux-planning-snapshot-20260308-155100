import { ConnectionHealthBanner } from "@/components/dashboard/ConnectionHealthBanner";
import { fireEvent, render, screen } from "@test-utils";

const INSTITUTIONS = [
  {
    name: "Chase",
    status: "connected" as const,
    lastSynced: "Updated 2h ago",
  },
  {
    name: "Capital One",
    status: "relink" as const,
    lastSynced: "Needs reconnect",
  },
  {
    name: "Vanguard",
    status: "error" as const,
    lastSynced: "Sync error",
  },
];

describe("ConnectionHealthBanner", () => {
  it("explains degraded accuracy and fallback inputs", () => {
    render(
      <ConnectionHealthBanner
        institutionStatuses={INSTITUTIONS}
        onPressReconnect={jest.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Reconnect Capital One and Vanguard to keep your roadmap accurate.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Accuracy is reduced while 2 institutions are disconnected.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "What we are using now: your last successful sync plus saved profile inputs.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Missing right now: live balances and transactions from disconnected institutions.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("\u2022 Capital One: Needs reconnect (Needs reconnect)"),
    ).toBeTruthy();
    expect(
      screen.getByText("\u2022 Vanguard: Fix needed (Sync error)"),
    ).toBeTruthy();
  });

  it("fires reconnect action", () => {
    const onPressReconnect = jest.fn();
    render(
      <ConnectionHealthBanner
        institutionStatuses={INSTITUTIONS}
        onPressReconnect={onPressReconnect}
      />,
    );

    fireEvent.click(screen.getByText("Reconnect now"));
    expect(onPressReconnect).toHaveBeenCalledTimes(1);
  });
});
