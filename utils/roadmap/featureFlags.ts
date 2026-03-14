function parseFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function isRoadmapCoreScreensEnabled(
  rawValue = process.env.EXPO_PUBLIC_ENABLE_ROADMAP_CORE_SCREENS,
): boolean {
  if (rawValue == null) {
    return true;
  }

  return parseFlag(rawValue);
}
