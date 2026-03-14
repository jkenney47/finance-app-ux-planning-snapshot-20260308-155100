export type ComplianceMode = "education" | "advisory";

const DEFAULT_MODE: ComplianceMode = "education";

export function resolveComplianceMode(
  rawValue: string | undefined,
): ComplianceMode {
  if (!rawValue) return DEFAULT_MODE;
  const normalized = rawValue.trim().toLowerCase();
  return normalized === "advisory" ? "advisory" : DEFAULT_MODE;
}

export function getComplianceMode(): ComplianceMode {
  return resolveComplianceMode(process.env.EXPO_PUBLIC_COMPLIANCE_MODE);
}
