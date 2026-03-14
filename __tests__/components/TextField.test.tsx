import { render } from "@testing-library/react-native";
import { TextField } from "@/components/common/TextField";

describe("TextField", () => {
  it("renders asterisk when required is true", () => {
    const { toJSON } = render(<TextField label="Email" required />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain(" *");
  });

  it("does not render asterisk when required is false", () => {
    const { toJSON } = render(<TextField label="Email" />);
    const tree = JSON.stringify(toJSON());
    expect(tree).not.toContain(" *");
  });
});
