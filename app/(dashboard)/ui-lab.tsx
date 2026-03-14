import { Redirect } from "expo-router";

export default function DashboardUiLabRedirect(): JSX.Element {
  // Legacy dashboard alias. Canonical internal ownership lives at /(internal)/ui-lab.
  return <Redirect href="/(internal)/ui-lab" />;
}
