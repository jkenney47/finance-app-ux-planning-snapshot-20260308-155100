import { Redirect } from "expo-router";

export default function DashboardPolicyOpsRedirect(): JSX.Element {
  // Legacy dashboard alias. Canonical operator ownership lives at /(ops)/policy-ops.
  return <Redirect href="/(ops)/policy-ops" />;
}
