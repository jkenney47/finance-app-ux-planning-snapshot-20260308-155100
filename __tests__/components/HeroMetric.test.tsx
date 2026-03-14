import { HeroMetric } from "@/components/dashboard/HeroMetric";
import { darkTheme, lightTheme } from "@/theme/paper";
import { render } from "@test-utils";

describe("HeroMetric", () => {
  it("matches snapshot in light theme", () => {
    const { toJSON } = render(
      <HeroMetric
        label="Net worth"
        value={123456.78}
        delta={{ value: 2500, label: "vs last month" }}
        caption="Across all accounts"
      />,
      { theme: lightTheme },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it("matches snapshot in dark theme", () => {
    const { toJSON } = render(
      <HeroMetric
        label="Net worth"
        value={123456.78}
        delta={{ value: -1200, label: "vs last month" }}
        caption="Across all accounts"
      />,
      { theme: darkTheme },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
