import { Stack } from "expo-router";

export default function UnauthLayout(): JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
