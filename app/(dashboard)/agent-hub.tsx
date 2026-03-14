import { Redirect } from "expo-router";

export default function DashboardAgentHubRedirect(): JSX.Element {
  // Legacy dashboard alias. Canonical operator ownership lives at /(ops)/agent-hub.
  return <Redirect href="/(ops)/agent-hub" />;
}
