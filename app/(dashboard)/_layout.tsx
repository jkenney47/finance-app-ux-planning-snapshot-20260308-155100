import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo } from "react";
import { View } from "react-native";

import { AskFAB } from "@/components/ask/AskFAB";
import { AskSheet } from "@/components/ask/AskSheet";
import { ConnectionHealthBanner } from "@/components/dashboard/ConnectionHealthBanner";
import { useDashboardSummary } from "@/hooks/useDashboardData";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAskStore } from "@/stores/useAskStore";

const TAB_ICON_SIZE = 24;

type TabConfig = {
  name: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tabTestID: string;
};

const tabs: TabConfig[] = [
  { name: "index", title: "Home", icon: "home-outline", tabTestID: "tab-home" },
  {
    name: "journey",
    title: "Roadmap",
    icon: "map-marker-path",
    tabTestID: "tab-roadmap",
  },
  {
    name: "goals",
    title: "Goals",
    icon: "flag-outline",
    tabTestID: "tab-goals",
  },
];

export default function DashboardLayout(): JSX.Element {
  const { colors } = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const summary = useDashboardSummary().data;
  const setScreenContext = useAskStore((state) => state.setScreenContext);

  const reconnectInstitutions = useMemo(
    () =>
      (summary?.institutionStatuses ?? []).filter(
        (institution) =>
          institution.status === "relink" || institution.status === "error",
      ),
    [summary?.institutionStatuses],
  );

  useEffect(() => {
    const activeSegment = segments[segments.length - 1] ?? "index";
    const mappedScreen = segments.includes("step")
      ? "step_detail"
      : activeSegment === "index"
        ? "home"
        : activeSegment === "journey"
          ? "roadmap"
          : activeSegment === "goals"
            ? "goals"
            : activeSegment.replace(/-/g, "_");
    setScreenContext(mappedScreen);
  }, [segments, setScreenContext]);

  const tabBarOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textFaint,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: "600" as const,
        letterSpacing: 0.3,
      },
      tabBarStyle: {
        backgroundColor: colors.surface1,
        borderTopColor: colors.borderSubtle,
        borderTopWidth: 1,
        paddingTop: 8,
        paddingBottom: 8,
        height: 68,
      },
    }),
    [colors.accent, colors.borderSubtle, colors.surface1, colors.textFaint],
  );

  return (
    <>
      <Tabs screenOptions={tabBarOptions}>
        {tabs.map(({ name, title, icon, tabTestID }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarButtonTestID: tabTestID,
              tabBarIcon: ({ color }) => (
                <MaterialCommunityIcons
                  name={icon}
                  size={TAB_ICON_SIZE}
                  color={color}
                />
              ),
            }}
          />
        ))}
        <Tabs.Screen name="accounts" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="insights" options={{ href: null }} />
        <Tabs.Screen name="monthly-review" options={{ href: null }} />
        <Tabs.Screen name="step/[recommendationId]" options={{ href: null }} />
        <Tabs.Screen name="agent-hub" options={{ href: null }} />
        <Tabs.Screen name="policy-ops" options={{ href: null }} />
        <Tabs.Screen name="ui-lab" options={{ href: null }} />
      </Tabs>

      {reconnectInstitutions.length > 0 ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: 10,
            left: 12,
            right: 12,
            zIndex: 20,
          }}
        >
          <ConnectionHealthBanner
            institutionStatuses={reconnectInstitutions}
            onPressReconnect={() => router.push("/(dashboard)/accounts")}
          />
        </View>
      ) : null}

      <AskFAB />
      <AskSheet />
    </>
  );
}
