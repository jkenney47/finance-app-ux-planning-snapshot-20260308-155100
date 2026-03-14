import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createRequestId, jsonError, jsonSuccess } from "../_shared/http.ts";
import { authorizePolicyAdminAccess } from "../_shared/policyAdminAuth.ts";
import {
  hashString,
  hmacSha256Hex,
  stableStringify,
} from "../_shared/signatures.ts";

type PolicyPackDomain = "rates" | "thresholds" | "limits" | "tax_labels";
type AuditDomain = PolicyPackDomain | "policy_ops_admins";

type GovernanceAction =
  | "list"
  | "list_audits"
  | "list_admins"
  | "set_admin_status"
  | "auth_probe"
  | "approve_latest_draft"
  | "rollback_to_version";

type GovernanceRequest = {
  action?: GovernanceAction;
  domain?: string;
  region?: string;
  jurisdiction?: string;
  limit?: number;
  effectiveFrom?: string;
  targetVersion?: number;
  targetUserId?: string;
  active?: boolean;
  notes?: string;
};

type PolicyPackRow = {
  id: string;
  domain: PolicyPackDomain;
  region: string;
  jurisdiction: string;
  version: number;
  status: "draft" | "approved";
  effective_from: string;
  pack: unknown;
};

type PolicyOpsAdminRow = {
  user_id: string;
  active: boolean;
  notes: string | null;
  added_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POLICY_REFRESH_SECRET = process.env.POLICY_REFRESH_SECRET;
const POLICY_OPS_SIGNING_SECRET =
  process.env.POLICY_OPS_SIGNING_SECRET ?? process.env.FME_LOG_SIGNING_SECRET;
const DEFAULT_REGION = "US";
const DEFAULT_JURISDICTION = "federal";
const POLICY_PACK_DOMAINS = new Set<PolicyPackDomain>([
  "rates",
  "thresholds",
  "limits",
  "tax_labels",
]);
const AUDIT_DOMAINS = new Set<AuditDomain>([
  "rates",
  "thresholds",
  "limits",
  "tax_labels",
  "policy_ops_admins",
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  const requestId = createRequestId();
  if (status >= 400) {
    const error =
      typeof body.error === "string" ? body.error : "Policy governance error";
    const code =
      typeof body.code === "string" ? body.code : "govern_policy_packs_error";
    const message = typeof body.message === "string" ? body.message : error;
    return jsonError({
      status,
      error,
      message,
      code,
      details: body.details,
      context: toRecord(body.context),
      requestId,
    });
  }
  return jsonSuccess(body, { status, requestId, includeRequestIdInBody: true });
}

function isPolicyPackDomain(value: unknown): value is PolicyPackDomain {
  return (
    typeof value === "string" &&
    POLICY_PACK_DOMAINS.has(value as PolicyPackDomain)
  );
}

function isAuditDomain(value: unknown): value is AuditDomain {
  return typeof value === "string" && AUDIT_DOMAINS.has(value as AuditDomain);
}

function resolveEffectiveFrom(value: string | undefined, fallbackIso: string) {
  if (!value) {
    return fallbackIso;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function hasMissingAuditSignatureColumnsError(error: { message?: string }) {
  const message = (error?.message ?? "").toLowerCase();
  return (
    message.includes("operation_signature") &&
    message.includes("does not exist")
  );
}

function policyAuditOperationSignatureFor(input: {
  actorUserId?: string;
  action: string;
  domain: AuditDomain;
  region: string;
  jurisdiction: string;
  sourceVersion?: number;
  targetVersion?: number;
  metadata?: Record<string, unknown>;
}) {
  return hashString(
    stableStringify({
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      domain: input.domain,
      region: input.region,
      jurisdiction: input.jurisdiction,
      sourceVersion: input.sourceVersion ?? null,
      targetVersion: input.targetVersion ?? null,
      metadata: input.metadata ?? {},
    }),
  );
}

async function insertAuditEvent(input: {
  action: string;
  domain: AuditDomain;
  region: string;
  jurisdiction: string;
  actorUserId?: string;
  sourceVersion?: number;
  targetVersion?: number;
  metadata?: Record<string, unknown>;
}): Promise<{
  operationSignature: string;
  artifactSignature: string;
  signaturePersistence: "full" | "legacy_schema";
}> {
  const createdAt = new Date().toISOString();
  const operationSignature = policyAuditOperationSignatureFor(input);
  const artifactSignature = await hmacSha256Hex(
    POLICY_OPS_SIGNING_SECRET ?? "",
    `${operationSignature}:${createdAt}`,
  );

  const basePayload = {
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    domain: input.domain,
    region: input.region,
    jurisdiction: input.jurisdiction,
    source_version: input.sourceVersion ?? null,
    target_version: input.targetVersion ?? null,
    metadata: input.metadata ?? {},
    created_at: createdAt,
  };

  const payloadWithSignatures = {
    ...basePayload,
    operation_signature: operationSignature,
    artifact_signature: artifactSignature,
  };

  const { error: insertWithSignaturesError } = await supabase
    .from("policy_ops_audits")
    .insert([payloadWithSignatures]);

  if (
    insertWithSignaturesError &&
    hasMissingAuditSignatureColumnsError(insertWithSignaturesError)
  ) {
    const { error: fallbackError } = await supabase
      .from("policy_ops_audits")
      .insert([basePayload]);
    if (fallbackError) {
      console.error(`Failed to write audit event:`, fallbackError);
      throw new Error(`Failed to write audit event`);
    }

    return {
      operationSignature,
      artifactSignature,
      signaturePersistence: "legacy_schema",
    };
  }

  if (insertWithSignaturesError) {
    console.error(`Failed to write audit event:`, insertWithSignaturesError);
    throw new Error(`Failed to write audit event`);
  }

  return {
    operationSignature,
    artifactSignature,
    signaturePersistence: "full",
  };
}

async function getLatestVersion(
  domain: PolicyPackDomain,
  region: string,
  jurisdiction: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("policy_packs")
    .select("version")
    .eq("domain", domain)
    .eq("region", region)
    .eq("jurisdiction", jurisdiction)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Failed to fetch latest version:`, error);
    throw new Error(`Failed to fetch latest version`);
  }

  return (data?.version as number | undefined) ?? 0;
}

async function countActivePolicyAdmins(): Promise<number> {
  const { count, error } = await supabase
    .from("policy_ops_admins")
    .select("user_id", { count: "exact", head: true })
    .eq("active", true);

  if (error) {
    console.error(`Failed to count active policy admins:`, error);
    throw new Error(`Failed to count active policy admins`);
  }

  return count ?? 0;
}

async function handleList(
  payload: GovernanceRequest,
  region: string,
  jurisdiction: string,
) {
  const limitValue = payload.limit ?? 50;
  const limit = Number.isFinite(limitValue)
    ? Math.max(1, Math.min(200, Math.round(limitValue)))
    : 50;

  let query = supabase
    .from("policy_packs")
    .select(
      "id,domain,region,jurisdiction,version,status,effective_from,effective_to,approved_at,updated_at,source,pack",
    )
    .eq("region", region)
    .eq("jurisdiction", jurisdiction)
    .order("domain", { ascending: true })
    .order("version", { ascending: false })
    .limit(limit);

  if (payload.domain) {
    if (!isPolicyPackDomain(payload.domain)) {
      return jsonResponse(400, { error: "Invalid domain" });
    }
    query = query.eq("domain", payload.domain);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to list policy packs", error);
    return jsonResponse(500, {
      error: "Failed to list policy packs",
      details: "internal_error",
    });
  }

  return jsonResponse(200, {
    status: "ok",
    region,
    jurisdiction,
    packs: data ?? [],
  });
}

async function handleListAudits(
  payload: GovernanceRequest,
  region: string,
  jurisdiction: string,
) {
  const limitValue = payload.limit ?? 40;
  const limit = Number.isFinite(limitValue)
    ? Math.max(1, Math.min(200, Math.round(limitValue)))
    : 40;

  let query = supabase
    .from("policy_ops_audits")
    .select(
      "id,actor_user_id,action,domain,region,jurisdiction,source_version,target_version,metadata,created_at,operation_signature,artifact_signature",
    )
    .eq("region", region)
    .eq("jurisdiction", jurisdiction)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (payload.domain) {
    if (!isAuditDomain(payload.domain)) {
      return jsonResponse(400, { error: "Invalid domain" });
    }
    query = query.eq("domain", payload.domain);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to list policy audit events", error);
    return jsonResponse(500, {
      error: "Failed to list policy audit events",
      details: "internal_error",
    });
  }

  return jsonResponse(200, {
    status: "ok",
    region,
    jurisdiction,
    audits: data ?? [],
  });
}

async function handleListAdmins(req: Request, payload: GovernanceRequest) {
  const authResult = await authorizePolicyAdminAccess(req, supabase, {
    sharedSecret: POLICY_REFRESH_SECRET,
  });
  if ("response" in authResult) {
    return authResult.response;
  }

  const limitValue = payload.limit ?? 50;
  const limit = Number.isFinite(limitValue)
    ? Math.max(1, Math.min(200, Math.round(limitValue)))
    : 50;

  const { data, error } = await supabase
    .from("policy_ops_admins")
    .select("user_id,active,notes,added_by_user_id,created_at,updated_at")
    .order("active", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to list policy admins", error);
    return jsonResponse(500, {
      error: "Failed to list policy admins",
      details: "internal_error",
    });
  }

  return jsonResponse(200, {
    status: "ok",
    authMode: authResult.authMode,
    actorUserId: authResult.actorUserId,
    admins: (data as PolicyOpsAdminRow[] | null) ?? [],
  });
}

async function handleAuthProbe(req: Request) {
  const authResult = await authorizePolicyAdminAccess(req, supabase, {
    sharedSecret: POLICY_REFRESH_SECRET,
  });
  if ("response" in authResult) {
    return authResult.response;
  }
  return jsonResponse(200, {
    status: "authorized",
    authMode: authResult.authMode,
    actorUserId: authResult.actorUserId,
  });
}

async function handleSetAdminStatus(
  req: Request,
  payload: GovernanceRequest,
  region: string,
  jurisdiction: string,
) {
  const authResult = await authorizePolicyAdminAccess(req, supabase, {
    sharedSecret: POLICY_REFRESH_SECRET,
  });
  if ("response" in authResult) {
    return authResult.response;
  }

  const targetUserId = payload.targetUserId?.trim();
  if (!targetUserId || !isLikelyUuid(targetUserId)) {
    return jsonResponse(400, {
      error: "Invalid or missing targetUserId",
    });
  }
  if (typeof payload.active !== "boolean") {
    return jsonResponse(400, {
      error: "Missing required boolean field: active",
    });
  }

  const nowIso = new Date().toISOString();
  const actorUserId = authResult.actorUserId ?? undefined;
  const notes =
    typeof payload.notes === "string" && payload.notes.trim().length > 0
      ? payload.notes.trim()
      : null;
  const writeAdminAudit = async (nextActive: boolean) =>
    insertAuditEvent({
      action: "set_admin_status",
      domain: "policy_ops_admins",
      region,
      jurisdiction,
      actorUserId,
      metadata: {
        targetUserId,
        active: nextActive,
        notes,
        authMode: authResult.authMode,
      },
    });

  if (
    payload.active === false &&
    actorUserId &&
    authResult.authMode === "admin_jwt" &&
    targetUserId === actorUserId
  ) {
    let activeAdminCount: number;
    try {
      activeAdminCount = await countActivePolicyAdmins();
    } catch (error) {
      console.error("Failed to validate self-removal guard", error);
      return jsonResponse(500, {
        error: "Failed to validate self-removal guard",
        details: "internal_error",
      });
    }
    if (activeAdminCount <= 1) {
      return jsonResponse(400, {
        error: "Cannot remove the last active policy admin",
      });
    }
  }

  if (payload.active) {
    const upsertPayload = {
      user_id: targetUserId,
      active: true,
      notes,
      added_by_user_id: actorUserId ?? null,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from("policy_ops_admins")
      .upsert([upsertPayload], {
        onConflict: "user_id",
      })
      .select("user_id,active,notes,added_by_user_id,created_at,updated_at")
      .maybeSingle();

    if (error) {
      console.error("Failed to set policy admin active", error);
      return jsonResponse(500, {
        error: "Failed to set policy admin active",
        details: "internal_error",
      });
    }

    let auditSignatures:
      | {
          operationSignature: string;
          artifactSignature: string;
          signaturePersistence: "full" | "legacy_schema";
        }
      | undefined;
    try {
      auditSignatures = await writeAdminAudit(true);
    } catch (auditError) {
      console.error("Policy admin updated but audit write failed", auditError);
      return jsonResponse(500, {
        error: "Policy admin updated but audit write failed",
        details: "internal_error",
      });
    }

    return jsonResponse(200, {
      status: "updated",
      authMode: authResult.authMode,
      actorUserId: authResult.actorUserId,
      admin: data,
      operationSignature: auditSignatures?.operationSignature ?? null,
      artifactSignature: auditSignatures?.artifactSignature ?? null,
      signaturePersistence: auditSignatures?.signaturePersistence ?? null,
    });
  }

  const { data, error } = await supabase
    .from("policy_ops_admins")
    .update({
      active: false,
      notes,
      updated_at: nowIso,
    })
    .eq("user_id", targetUserId)
    .select("user_id,active,notes,added_by_user_id,created_at,updated_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to deactivate policy admin", error);
    return jsonResponse(500, {
      error: "Failed to deactivate policy admin",
      details: "internal_error",
    });
  }
  if (!data) {
    return jsonResponse(404, {
      error: "Policy admin not found",
    });
  }

  let auditSignatures:
    | {
        operationSignature: string;
        artifactSignature: string;
        signaturePersistence: "full" | "legacy_schema";
      }
    | undefined;
  try {
    auditSignatures = await writeAdminAudit(false);
  } catch (auditError) {
    console.error("Policy admin updated but audit write failed", auditError);
    return jsonResponse(500, {
      error: "Policy admin updated but audit write failed",
      details: "internal_error",
    });
  }

  return jsonResponse(200, {
    status: "updated",
    authMode: authResult.authMode,
    actorUserId: authResult.actorUserId,
    admin: data,
    operationSignature: auditSignatures?.operationSignature ?? null,
    artifactSignature: auditSignatures?.artifactSignature ?? null,
    signaturePersistence: auditSignatures?.signaturePersistence ?? null,
  });
}

async function handleApproveLatestDraft(
  req: Request,
  payload: GovernanceRequest,
  region: string,
  jurisdiction: string,
) {
  if (!payload.domain || !isPolicyPackDomain(payload.domain)) {
    return jsonResponse(400, { error: "Invalid or missing domain" });
  }

  const domain = payload.domain;
  const nowIso = new Date().toISOString();
  const authResult = await authorizePolicyAdminAccess(req, supabase, {
    sharedSecret: POLICY_REFRESH_SECRET,
  });
  if ("response" in authResult) {
    return authResult.response;
  }
  const actorUserId = authResult.actorUserId ?? undefined;

  const { data: draftData, error: draftError } = await supabase
    .from("policy_packs")
    .select("id,domain,region,jurisdiction,version,status,effective_from,pack")
    .eq("domain", domain)
    .eq("region", region)
    .eq("jurisdiction", jurisdiction)
    .eq("status", "draft")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draftError) {
    console.error("Failed to fetch latest draft", draftError);
    return jsonResponse(500, {
      error: "Failed to fetch latest draft",
      details: "internal_error",
    });
  }

  const draft = draftData as PolicyPackRow | null;
  if (!draft) {
    return jsonResponse(404, {
      error: `No draft found for domain ${domain}`,
    });
  }

  const { data: latestApprovedData, error: latestApprovedError } =
    await supabase
      .from("policy_packs")
      .select("version")
      .eq("domain", domain)
      .eq("region", region)
      .eq("jurisdiction", jurisdiction)
      .eq("status", "approved")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestApprovedError) {
    console.error(
      "Failed to fetch latest approved version",
      latestApprovedError,
    );
    return jsonResponse(500, {
      error: "Failed to fetch latest approved version",
      details: "internal_error",
    });
  }

  const latestApprovedVersion =
    (latestApprovedData?.version as number | undefined) ?? 0;
  const resolvedEffectiveFrom = resolveEffectiveFrom(
    payload.effectiveFrom,
    draft.effective_from,
  );
  if (!resolvedEffectiveFrom) {
    return jsonResponse(400, {
      error: "Invalid effectiveFrom timestamp",
    });
  }

  if (draft.version > latestApprovedVersion) {
    const { error: updateError } = await supabase
      .from("policy_packs")
      .update({
        status: "approved",
        approved_at: nowIso,
        updated_at: nowIso,
        effective_from: resolvedEffectiveFrom,
      })
      .eq("id", draft.id);

    if (updateError) {
      console.error("Failed to approve latest draft", updateError);
      return jsonResponse(500, {
        error: "Failed to approve latest draft",
        details: "internal_error",
      });
    }

    let auditSignatures:
      | {
          operationSignature: string;
          artifactSignature: string;
          signaturePersistence: "full" | "legacy_schema";
        }
      | undefined;
    try {
      auditSignatures = await insertAuditEvent({
        action: "approve_latest_draft",
        domain,
        region,
        jurisdiction,
        actorUserId,
        sourceVersion: draft.version,
        targetVersion: draft.version,
        metadata: {
          mode: "in_place",
          draftId: draft.id,
        },
      });
    } catch (error) {
      console.error("Draft approved but audit write failed", error);
      return jsonResponse(500, {
        error: "Draft approved but audit write failed",
        details: "internal_error",
      });
    }

    return jsonResponse(200, {
      status: "approved_from_draft",
      domain,
      region,
      jurisdiction,
      version: draft.version,
      effectiveFrom: resolvedEffectiveFrom,
      operationSignature: auditSignatures?.operationSignature ?? null,
      artifactSignature: auditSignatures?.artifactSignature ?? null,
      signaturePersistence: auditSignatures?.signaturePersistence ?? null,
    });
  }

  let nextVersion: number;
  try {
    nextVersion = (await getLatestVersion(domain, region, jurisdiction)) + 1;
  } catch (error) {
    console.error("Failed to resolve next policy version", error);
    return jsonResponse(500, {
      error: "Failed to resolve next policy version",
      details: "internal_error",
    });
  }

  const source = {
    action: "approve_latest_draft",
    draftId: draft.id,
    draftVersion: draft.version,
    approvedAt: nowIso,
  };

  const { error: insertError } = await supabase.from("policy_packs").insert([
    {
      domain,
      region,
      jurisdiction,
      version: nextVersion,
      effective_from: resolvedEffectiveFrom,
      pack: draft.pack,
      source,
      status: "approved",
      approved_at: nowIso,
    },
  ]);

  if (insertError) {
    console.error("Failed to promote draft into approved version", insertError);
    return jsonResponse(500, {
      error: "Failed to promote draft into approved version",
      details: "internal_error",
    });
  }

  let auditSignatures:
    | {
        operationSignature: string;
        artifactSignature: string;
        signaturePersistence: "full" | "legacy_schema";
      }
    | undefined;
  try {
    auditSignatures = await insertAuditEvent({
      action: "approve_latest_draft",
      domain,
      region,
      jurisdiction,
      actorUserId,
      sourceVersion: draft.version,
      targetVersion: nextVersion,
      metadata: {
        mode: "copy_to_next",
        draftId: draft.id,
      },
    });
  } catch (error) {
    console.error("Draft promoted but audit write failed", error);
    return jsonResponse(500, {
      error: "Draft promoted but audit write failed",
      details: "internal_error",
    });
  }

  return jsonResponse(200, {
    status: "approved_from_draft_copy",
    domain,
    region,
    jurisdiction,
    version: nextVersion,
    effectiveFrom: resolvedEffectiveFrom,
    copiedFromVersion: draft.version,
    operationSignature: auditSignatures?.operationSignature ?? null,
    artifactSignature: auditSignatures?.artifactSignature ?? null,
    signaturePersistence: auditSignatures?.signaturePersistence ?? null,
  });
}

async function handleRollbackToVersion(
  req: Request,
  payload: GovernanceRequest,
  region: string,
  jurisdiction: string,
) {
  if (!payload.domain || !isPolicyPackDomain(payload.domain)) {
    return jsonResponse(400, { error: "Invalid or missing domain" });
  }

  const domain = payload.domain;
  const nowIso = new Date().toISOString();
  const authResult = await authorizePolicyAdminAccess(req, supabase, {
    sharedSecret: POLICY_REFRESH_SECRET,
  });
  if ("response" in authResult) {
    return authResult.response;
  }
  const actorUserId = authResult.actorUserId ?? undefined;

  if (
    !isNonNegativeInteger(payload.targetVersion) ||
    payload.targetVersion < 1
  ) {
    return jsonResponse(400, {
      error: "Invalid or missing targetVersion",
    });
  }

  const targetVersion = payload.targetVersion;
  const { data: targetData, error: targetError } = await supabase
    .from("policy_packs")
    .select("id,domain,region,jurisdiction,version,status,effective_from,pack")
    .eq("domain", domain)
    .eq("region", region)
    .eq("jurisdiction", jurisdiction)
    .eq("status", "approved")
    .eq("version", targetVersion)
    .limit(1)
    .maybeSingle();

  if (targetError) {
    console.error("Failed to fetch rollback target", targetError);
    return jsonResponse(500, {
      error: "Failed to fetch rollback target",
      details: "internal_error",
    });
  }

  const target = targetData as PolicyPackRow | null;
  if (!target) {
    return jsonResponse(404, {
      error: `Approved version ${targetVersion} not found for domain ${domain}`,
    });
  }

  const resolvedEffectiveFrom = resolveEffectiveFrom(
    payload.effectiveFrom,
    nowIso,
  );
  if (!resolvedEffectiveFrom) {
    return jsonResponse(400, {
      error: "Invalid effectiveFrom timestamp",
    });
  }

  let nextVersion: number;
  try {
    nextVersion = (await getLatestVersion(domain, region, jurisdiction)) + 1;
  } catch (error) {
    console.error("Failed to resolve next policy version", error);
    return jsonResponse(500, {
      error: "Failed to resolve next policy version",
      details: "internal_error",
    });
  }

  const source = {
    action: "rollback_to_version",
    targetVersion,
    targetId: target.id,
    rolledBackAt: nowIso,
  };

  const { error: insertError } = await supabase.from("policy_packs").insert([
    {
      domain,
      region,
      jurisdiction,
      version: nextVersion,
      effective_from: resolvedEffectiveFrom,
      pack: target.pack,
      source,
      status: "approved",
      approved_at: nowIso,
    },
  ]);

  if (insertError) {
    console.error("Failed to rollback policy pack", insertError);
    return jsonResponse(500, {
      error: "Failed to rollback policy pack",
      details: "internal_error",
    });
  }

  let auditSignatures:
    | {
        operationSignature: string;
        artifactSignature: string;
        signaturePersistence: "full" | "legacy_schema";
      }
    | undefined;
  try {
    auditSignatures = await insertAuditEvent({
      action: "rollback_to_version",
      domain,
      region,
      jurisdiction,
      actorUserId,
      sourceVersion: targetVersion,
      targetVersion: nextVersion,
      metadata: {
        targetId: target.id,
      },
    });
  } catch (error) {
    console.error("Policy rollback succeeded but audit write failed", error);
    return jsonResponse(500, {
      error: "Policy rollback succeeded but audit write failed",
      details: "internal_error",
    });
  }

  return jsonResponse(200, {
    status: "rolled_back",
    domain,
    region,
    jurisdiction,
    version: nextVersion,
    effectiveFrom: resolvedEffectiveFrom,
    copiedFromVersion: targetVersion,
    operationSignature: auditSignatures?.operationSignature ?? null,
    artifactSignature: auditSignatures?.artifactSignature ?? null,
    signaturePersistence: auditSignatures?.signaturePersistence ?? null,
  });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  if (!POLICY_OPS_SIGNING_SECRET) {
    return jsonResponse(503, {
      error: "Server configuration error: Missing policy ops signing secret.",
    });
  }

  let payload: GovernanceRequest = {};
  try {
    payload = (await req.json()) as GovernanceRequest;
  } catch {
    payload = {};
  }

  const action = payload.action;
  const region = payload.region ?? DEFAULT_REGION;
  const jurisdiction = payload.jurisdiction ?? DEFAULT_JURISDICTION;

  if (!action) {
    return jsonResponse(400, {
      error: "Missing required field: action",
    });
  }

  switch (action) {
    case "list":
      return handleList(payload, region, jurisdiction);
    case "list_audits":
      return handleListAudits(payload, region, jurisdiction);
    case "list_admins":
      return handleListAdmins(req, payload);
    case "auth_probe":
      return handleAuthProbe(req);
    case "set_admin_status":
      return handleSetAdminStatus(req, payload, region, jurisdiction);
    case "approve_latest_draft":
      return handleApproveLatestDraft(req, payload, region, jurisdiction);
    case "rollback_to_version":
      return handleRollbackToVersion(req, payload, region, jurisdiction);
    default:
      return jsonResponse(400, { error: "Unsupported action" });
  }
});
