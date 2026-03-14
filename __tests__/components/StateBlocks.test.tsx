import { EmptyHint, ErrorNotice, Skeleton } from "@/components/state";
import { darkTheme, lightTheme } from "@/theme/paper";
import { render } from "@test-utils";

describe("State blocks", () => {
  it("EmptyHint matches snapshot in both themes", () => {
    const { toJSON: toJSONLight } = render(
      <EmptyHint
        title="Nothing yet"
        description="Link an account to get started."
        actionLabel="Link"
        onActionPress={jest.fn()}
      />,
      { theme: lightTheme },
    );

    const { toJSON: toJSONDark } = render(
      <EmptyHint
        title="Nothing yet"
        description="Link an account to get started."
        actionLabel="Link"
        onActionPress={jest.fn()}
      />,
      { theme: darkTheme },
    );

    expect(toJSONLight()).toMatchSnapshot();
    expect(toJSONDark()).toMatchSnapshot();
  });

  it("ErrorNotice matches snapshot in both themes", () => {
    const { toJSON: toJSONLight } = render(
      <ErrorNotice description="Something broke." onRetry={jest.fn()} />,
      { theme: lightTheme },
    );

    const { toJSON: toJSONDark } = render(
      <ErrorNotice description="Something broke." onRetry={jest.fn()} />,
      { theme: darkTheme },
    );

    expect(toJSONLight()).toMatchSnapshot();
    expect(toJSONDark()).toMatchSnapshot();
  });

  it("Skeleton matches snapshot", () => {
    const { toJSON } = render(<Skeleton width={120} height={20} />, {
      theme: lightTheme,
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
