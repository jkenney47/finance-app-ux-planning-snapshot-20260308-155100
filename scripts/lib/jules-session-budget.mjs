function isoToEpochMs(value) {
  const parsed = new Date(value ?? 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getSessionTimestamp(session) {
  return isoToEpochMs(
    session?.createTime ??
      session?.create_time ??
      session?.startTime ??
      session?.start_time ??
      session?.updateTime ??
      session?.update_time,
  );
}

export async function enforceJulesDailySessionBudget({
  dailyLimit = 100,
  listSessions,
  lookbackHours = 24,
  sourceName = "",
}) {
  const cutoffEpochMs = Date.now() - lookbackHours * 60 * 60 * 1000;
  const sessions = await listSessions();
  const recentSessions = sessions.filter(
    (session) => getSessionTimestamp(session) >= cutoffEpochMs,
  );
  const sourceRecentSessions = sourceName
    ? recentSessions.filter(
        (session) => session?.sourceContext?.source === sourceName,
      )
    : [];

  if (recentSessions.length >= dailyLimit) {
    const sourceDetail = sourceName
      ? ` Repo source ${sourceName} accounts for ${sourceRecentSessions.length} of those session(s).`
      : "";
    throw new Error(
      `Jules daily session limit reached: ${recentSessions.length}/${dailyLimit} session(s) created in the last ${lookbackHours} hour(s).${sourceDetail}`,
    );
  }

  return {
    recentSessions: recentSessions.length,
    remainingSessions: dailyLimit - recentSessions.length,
    sourceRecentSessions: sourceRecentSessions.length,
  };
}
