import { AuthFrame } from "@/components/common/AuthFrame";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import * as appThemeHook from "@/hooks/useAppTheme";
import { tokens } from "@/theme/tokens";
import { render, screen } from "@test-utils";

describe("Common primitives", () => {
  beforeEach(() => {
    jest.spyOn(appThemeHook, "useAppTheme").mockReturnValue({
      isDark: true,
      colors: tokens.color.dark,
      tokens,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("SurfaceCard uses dark background and subtle border", () => {
    render(
      <SurfaceCard testID="surface-card">
        <Text>Card</Text>
      </SurfaceCard>,
    );

    const card = screen.getByTestId("surface-card");
    const style = card.getAttribute("style") ?? "";

    expect(style).toContain("background-color: rgb(24, 33, 28)");
    expect(style).toContain("border-top-color: rgba(213,226,210,0.08)");
  });

  it("PrimaryButton uses accent fill", () => {
    render(<PrimaryButton>Continue</PrimaryButton>);

    const button = screen.getByRole("button");
    const style = button.getAttribute("style") ?? "";

    expect(style).toContain("background-color: rgb(143, 173, 122)");
  });

  it("ScreenHeader renders title, description, and supporting content", () => {
    render(
      <ScreenHeader
        eyebrow="Advisor view"
        title="Good morning"
        description="Your roadmap is ready."
        titleTestID="screen-header-title"
      >
        <Text>Current stage: Growth</Text>
      </ScreenHeader>,
    );

    expect(screen.getByTestId("screen-header-title")).toHaveTextContent(
      "Good morning",
    );
    expect(screen.getByText("Your roadmap is ready.")).toBeTruthy();
    expect(screen.getByText("Current stage: Growth")).toBeTruthy();
  });

  it("AuthFrame renders shared auth layout content", () => {
    render(
      <AuthFrame
        eyebrow="Secure access"
        title="Welcome back"
        description="Sign in to continue."
        headerBadge={<Text>Private by default</Text>}
        footer={<Text>Footer actions</Text>}
      >
        <Text>Auth form</Text>
      </AuthFrame>,
    );

    expect(screen.getByText("Welcome back")).toBeTruthy();
    expect(screen.getByText("Sign in to continue.")).toBeTruthy();
    expect(screen.getByText("Private by default")).toBeTruthy();
    expect(screen.getByText("Auth form")).toBeTruthy();
    expect(screen.getByText("Footer actions")).toBeTruthy();
  });
});
