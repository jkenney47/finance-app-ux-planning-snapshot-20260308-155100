import {
  POLICY_DOMAINS,
  type PolicyDomain,
  type PolicyPackStatus,
} from "@/utils/contracts/policy";

export type PolicyGovernancePackRow = {
  id?: string;
  domain: string;
  version: number;
  status: string;
  effective_from: string;
  effective_to?: string | null;
  approved_at?: string | null;
  updated_at?: string;
  source?: unknown;
  pack?: unknown;
};

export type PolicyGovernancePack = {
  id?: string;
  domain: PolicyDomain;
  version: number;
  status: PolicyPackStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  approvedAt?: string | null;
  updatedAt?: string;
  source?: unknown;
};

export type PolicyGovernanceSnapshot = {
  domain: PolicyDomain;
  latestApproved: PolicyGovernancePack | null;
  latestDraft: PolicyGovernancePack | null;
  approvedHistory: PolicyGovernancePack[];
};

function isPolicyDomain(value: string): value is PolicyDomain {
  return POLICY_DOMAINS.includes(value as PolicyDomain);
}

function toPolicyPackStatus(value: string): PolicyPackStatus | null {
  if (value === "approved" || value === "draft") {
    return value;
  }
  return null;
}

export function comparePolicyRows(
  left: Pick<PolicyGovernancePack, "version" | "effectiveFrom">,
  right: Pick<PolicyGovernancePack, "version" | "effectiveFrom">,
): number {
  if (left.version !== right.version) {
    return right.version - left.version;
  }
  const leftTs = new Date(left.effectiveFrom).getTime();
  const rightTs = new Date(right.effectiveFrom).getTime();
  if (Number.isNaN(leftTs) && Number.isNaN(rightTs)) {
    return 0;
  }
  if (Number.isNaN(leftTs)) {
    return 1;
  }
  if (Number.isNaN(rightTs)) {
    return -1;
  }
  return rightTs - leftTs;
}

function normalizePolicyGovernancePack(
  row: PolicyGovernancePackRow,
): PolicyGovernancePack | null {
  if (!isPolicyDomain(row.domain)) {
    return null;
  }
  const status = toPolicyPackStatus(row.status);
  if (!status) {
    return null;
  }

  return {
    domain: row.domain,
    version: row.version,
    status,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to ?? null,
    approvedAt: row.approved_at ?? null,
    updatedAt: row.updated_at,
    source: row.source,
    ...(row.id ? { id: row.id } : {}),
  };
}

export function normalizePolicyGovernancePacks(
  rows: PolicyGovernancePackRow[],
): PolicyGovernancePack[] {
  return rows
    .map(normalizePolicyGovernancePack)
    .filter((pack): pack is PolicyGovernancePack => pack !== null)
    .sort(comparePolicyRows);
}

function buildSnapshotForDomain(
  domain: PolicyDomain,
  packs: PolicyGovernancePack[],
): PolicyGovernanceSnapshot {
  const domainPacks = packs.filter((pack) => pack.domain === domain);
  const latestApproved =
    domainPacks.find((pack) => pack.status === "approved") ?? null;
  const latestDraft =
    domainPacks.find((pack) => pack.status === "draft") ?? null;
  const approvedHistory = domainPacks.filter(
    (pack) => pack.status === "approved",
  );
  return {
    domain,
    latestApproved,
    latestDraft,
    approvedHistory,
  };
}

export function buildPolicyGovernanceSnapshots(
  rows: PolicyGovernancePackRow[],
): PolicyGovernanceSnapshot[] {
  const packs = normalizePolicyGovernancePacks(rows);
  return POLICY_DOMAINS.map((domain) => buildSnapshotForDomain(domain, packs));
}
