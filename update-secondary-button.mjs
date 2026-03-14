import fs from "fs";

const FILE_PATH = "components/common/SecondaryButton.tsx";
let content = fs.readFileSync(FILE_PATH, "utf8");

// Inject the `const isDisabled = Boolean(props.disabled || loading);`
content = content.replace(
  "  const { colors, tokens } = useAppTheme();",
  "  const { colors, tokens } = useAppTheme();\n  const isDisabled = Boolean(props.disabled || loading);",
);

// Add `disabled={isDisabled}` to Button props and update `accessibilityState`
content = content.replace(
  "      {...props}\n      accessibilityState={{\n        busy: loading,\n        disabled: props.disabled || loading,",
  "      {...props}\n      disabled={isDisabled}\n      accessibilityState={{\n        busy: loading,\n        disabled: isDisabled,",
);

fs.writeFileSync(FILE_PATH, content, "utf8");
console.log("Successfully updated SecondaryButton.tsx");
