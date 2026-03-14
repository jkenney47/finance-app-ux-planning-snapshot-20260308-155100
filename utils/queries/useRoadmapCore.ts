import { useEffect, useMemo } from "react";

import { useDashboardSummary } from "@/hooks/useDashboardData";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import type {
  FinancialSnapshotPayload,
  RoadmapPayload,
} from "@/utils/engine/types";
import {
  createRoadmapPayloadSignature,
  resolveCurrentRoadmapPayload,
  resolveFinancialSnapshotPayload,
} from "@/utils/roadmap/readModels";
import {
  roadmapToHomeViewModel,
  roadmapToRoadmapViewModel,
  roadmapToStepDetailViewModel,
  type HomeViewModel,
  type RoadmapViewModel,
  type StepDetailViewModel,
} from "@/utils/roadmap/viewModels";

type ResourceState<T> = {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  hasRefreshError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};

type ViewModelState<T> = ResourceState<T> & {
  roadmap: RoadmapPayload | null;
  snapshot: FinancialSnapshotPayload | null;
};

function normalizeError(error: unknown): Error | null {
  if (error instanceof Error) {
    return error;
  }

  return error ? new Error(String(error)) : null;
}

export function useCurrentRoadmap(): ResourceState<RoadmapPayload> {
  const intake = useOnboardingStore((state) => state.intake);
  const linking = useOnboardingStore((state) => state.linking);
  const generatedRoadmap = useOnboardingStore(
    (state) => state.generatedRoadmap ?? null,
  );
  const setGeneratedRoadmap = useOnboardingStore(
    (state) => state.setGeneratedRoadmap,
  );
  const summaryQuery = useDashboardSummary();
  const reliesOnSummary = linking.mockScenario === "none";
  const computedRoadmap = useMemo(
    () =>
      resolveCurrentRoadmapPayload({
        intake,
        linking,
        summary: summaryQuery.data,
      }),
    [intake, linking, summaryQuery.data],
  );
  const roadmap = computedRoadmap ?? generatedRoadmap;

  useEffect(() => {
    if (!computedRoadmap) {
      return;
    }

    if (
      createRoadmapPayloadSignature(computedRoadmap) ===
      createRoadmapPayloadSignature(generatedRoadmap)
    ) {
      return;
    }

    setGeneratedRoadmap(computedRoadmap);
  }, [computedRoadmap, generatedRoadmap, setGeneratedRoadmap]);

  return {
    data: roadmap,
    isLoading:
      !roadmap &&
      linking.coreTransactionalLinked &&
      reliesOnSummary &&
      summaryQuery.isLoading,
    isError:
      !roadmap &&
      linking.coreTransactionalLinked &&
      reliesOnSummary &&
      summaryQuery.isError,
    hasRefreshError: reliesOnSummary && summaryQuery.isError,
    error: normalizeError(summaryQuery.error),
    refetch: summaryQuery.refetch,
  };
}

export function useFinancialSnapshot(): ResourceState<FinancialSnapshotPayload> {
  const linking = useOnboardingStore((state) => state.linking);
  const summaryQuery = useDashboardSummary();
  const reliesOnSummary = linking.mockScenario === "none";
  const snapshot = useMemo(
    () =>
      resolveFinancialSnapshotPayload({
        linking,
        summary: summaryQuery.data,
      }),
    [linking, summaryQuery.data],
  );

  return {
    data: snapshot,
    isLoading: !snapshot && reliesOnSummary && summaryQuery.isLoading,
    isError: !snapshot && reliesOnSummary && summaryQuery.isError,
    hasRefreshError: reliesOnSummary && summaryQuery.isError,
    error: normalizeError(summaryQuery.error),
    refetch: summaryQuery.refetch,
  };
}

export function useHomeViewModel(): ViewModelState<HomeViewModel> {
  const roadmapQuery = useCurrentRoadmap();
  const snapshotQuery = useFinancialSnapshot();
  const data = useMemo(
    () =>
      roadmapQuery.data
        ? roadmapToHomeViewModel(roadmapQuery.data, snapshotQuery.data)
        : null,
    [roadmapQuery.data, snapshotQuery.data],
  );

  return {
    data,
    roadmap: roadmapQuery.data,
    snapshot: snapshotQuery.data,
    isLoading: roadmapQuery.isLoading,
    isError: roadmapQuery.isError,
    hasRefreshError:
      roadmapQuery.hasRefreshError || snapshotQuery.hasRefreshError,
    error: roadmapQuery.error ?? snapshotQuery.error,
    refetch: async () => {
      await Promise.all([roadmapQuery.refetch(), snapshotQuery.refetch()]);
    },
  };
}

export function useRoadmapViewModel(): ViewModelState<RoadmapViewModel> {
  const roadmapQuery = useCurrentRoadmap();
  const snapshotQuery = useFinancialSnapshot();
  const data = useMemo(
    () =>
      roadmapQuery.data ? roadmapToRoadmapViewModel(roadmapQuery.data) : null,
    [roadmapQuery.data],
  );

  return {
    data,
    roadmap: roadmapQuery.data,
    snapshot: snapshotQuery.data,
    isLoading: roadmapQuery.isLoading,
    isError: roadmapQuery.isError,
    hasRefreshError:
      roadmapQuery.hasRefreshError || snapshotQuery.hasRefreshError,
    error: roadmapQuery.error ?? snapshotQuery.error,
    refetch: async () => {
      await Promise.all([roadmapQuery.refetch(), snapshotQuery.refetch()]);
    },
  };
}

export function useStepDetailViewModel(
  stepId?: string,
): ViewModelState<StepDetailViewModel> {
  const roadmapQuery = useCurrentRoadmap();
  const snapshotQuery = useFinancialSnapshot();
  const data = useMemo(
    () =>
      roadmapQuery.data
        ? roadmapToStepDetailViewModel(roadmapQuery.data, stepId)
        : null,
    [roadmapQuery.data, stepId],
  );

  return {
    data,
    roadmap: roadmapQuery.data,
    snapshot: snapshotQuery.data,
    isLoading: roadmapQuery.isLoading,
    isError: roadmapQuery.isError,
    hasRefreshError:
      roadmapQuery.hasRefreshError || snapshotQuery.hasRefreshError,
    error: roadmapQuery.error ?? snapshotQuery.error,
    refetch: async () => {
      await Promise.all([roadmapQuery.refetch(), snapshotQuery.refetch()]);
    },
  };
}
