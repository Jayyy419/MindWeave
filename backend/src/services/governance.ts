import { PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "crypto";

const prisma = new PrismaClient();

const DEFAULT_INPUT_COST_PER_MILLION = Number(process.env.AI_INPUT_COST_PER_MILLION || "0.15");
const DEFAULT_OUTPUT_COST_PER_MILLION = Number(process.env.AI_OUTPUT_COST_PER_MILLION || "0.6");

let ensureGovernanceTablesPromise: Promise<void> | null = null;

export type AbVariant = {
  key: string;
  weight: number;
  message?: string;
};

export async function ensureGovernanceTables(): Promise<void> {
  if (!ensureGovernanceTablesPromise) {
    ensureGovernanceTablesPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AiAuditLog" (
          "id" TEXT NOT NULL,
          "userId" TEXT,
          "route" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "model" TEXT,
          "moderationOutcome" TEXT NOT NULL DEFAULT 'unknown',
          "success" BOOLEAN NOT NULL,
          "errorCode" TEXT,
          "inputChars" INTEGER NOT NULL DEFAULT 0,
          "outputChars" INTEGER NOT NULL DEFAULT 0,
          "estimatedInputTokens" INTEGER NOT NULL DEFAULT 0,
          "estimatedOutputTokens" INTEGER NOT NULL DEFAULT 0,
          "metadataJson" TEXT NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AiAuditLog_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "AiAuditLog_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "AiAuditLog_createdAt_idx" ON "AiAuditLog"("createdAt")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "AiAuditLog_route_idx" ON "AiAuditLog"("route")`
      );

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ApiCostLedger" (
          "id" TEXT NOT NULL,
          "userId" TEXT,
          "source" TEXT NOT NULL,
          "model" TEXT,
          "category" TEXT NOT NULL,
          "estimatedInputTokens" INTEGER NOT NULL DEFAULT 0,
          "estimatedOutputTokens" INTEGER NOT NULL DEFAULT 0,
          "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ApiCostLedger_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ApiCostLedger_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "ApiCostLedger_createdAt_idx" ON "ApiCostLedger"("createdAt")`
      );

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AdminRoleAssignment" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "scope" TEXT NOT NULL,
          "assignedByUserId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AdminRoleAssignment_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "AdminRoleAssignment_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE,
          CONSTRAINT "AdminRoleAssignment_assignedByUserId_fkey"
            FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "AdminRoleAssignment_userId_role_scope_key" ON "AdminRoleAssignment"("userId", "role", "scope")`
      );

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AbTestExperiment" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "channel" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'active',
          "variantsJson" TEXT NOT NULL,
          "createdByUserId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AbTestExperiment_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "AbTestExperiment_createdByUserId_fkey"
            FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "AbTestExperiment_status_idx" ON "AbTestExperiment"("status")`
      );

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AbTestAssignment" (
          "id" TEXT NOT NULL,
          "experimentId" TEXT NOT NULL,
          "subjectKeyHash" TEXT NOT NULL,
          "variantKey" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastServedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "exposureCount" INTEGER NOT NULL DEFAULT 1,
          CONSTRAINT "AbTestAssignment_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "AbTestAssignment_experimentId_fkey"
            FOREIGN KEY ("experimentId") REFERENCES "AbTestExperiment"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "AbTestAssignment_experimentId_subjectKeyHash_key" ON "AbTestAssignment"("experimentId", "subjectKeyHash")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "AbTestAssignment_variantKey_idx" ON "AbTestAssignment"("variantKey")`
      );
    })().catch((error) => {
      ensureGovernanceTablesPromise = null;
      throw error;
    });
  }

  await ensureGovernanceTablesPromise;
}

export function estimateTokensFromText(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return Math.max(1, Math.ceil(cleaned.length / 4));
}

function hashSubjectKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function writeApiCostLedger(params: {
  userId?: string;
  source: string;
  model?: string;
  category: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}): Promise<void> {
  await ensureGovernanceTables();

  const inputCost = (Math.max(0, params.estimatedInputTokens) / 1_000_000) * DEFAULT_INPUT_COST_PER_MILLION;
  const outputCost = (Math.max(0, params.estimatedOutputTokens) / 1_000_000) * DEFAULT_OUTPUT_COST_PER_MILLION;
  const estimatedCostUsd = inputCost + outputCost;

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ApiCostLedger"(
       "id", "userId", "source", "model", "category", "estimatedInputTokens", "estimatedOutputTokens", "estimatedCostUsd"
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    randomUUID(),
    params.userId || null,
    params.source,
    params.model || null,
    params.category,
    Math.max(0, Math.round(params.estimatedInputTokens)),
    Math.max(0, Math.round(params.estimatedOutputTokens)),
    estimatedCostUsd
  );
}

export async function writeAiAuditLog(params: {
  userId?: string;
  route: string;
  action: string;
  model?: string;
  moderationOutcome: "none" | "flagged" | "unknown";
  success: boolean;
  errorCode?: string;
  inputText?: string;
  outputText?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await ensureGovernanceTables();

  const inputText = params.inputText || "";
  const outputText = params.outputText || "";
  const estimatedInputTokens = estimateTokensFromText(inputText);
  const estimatedOutputTokens = estimateTokensFromText(outputText);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "AiAuditLog"(
       "id", "userId", "route", "action", "model", "moderationOutcome", "success", "errorCode",
       "inputChars", "outputChars", "estimatedInputTokens", "estimatedOutputTokens", "metadataJson"
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    randomUUID(),
    params.userId || null,
    params.route,
    params.action,
    params.model || null,
    params.moderationOutcome,
    params.success,
    params.errorCode || null,
    inputText.length,
    outputText.length,
    estimatedInputTokens,
    estimatedOutputTokens,
    JSON.stringify(params.metadata || {})
  );

  await writeApiCostLedger({
    userId: params.userId,
    source: params.route,
    model: params.model,
    category: "ai",
    estimatedInputTokens,
    estimatedOutputTokens,
  });
}

function normalizeVariants(variants: AbVariant[]): AbVariant[] {
  const cleaned = variants
    .filter((variant) => variant && typeof variant.key === "string")
    .map((variant) => ({
      key: variant.key.trim(),
      weight: Number.isFinite(Number(variant.weight)) ? Math.max(1, Math.round(Number(variant.weight))) : 1,
      message: typeof variant.message === "string" ? variant.message.trim() : undefined,
    }))
    .filter((variant) => variant.key.length > 0);

  return cleaned.length > 0 ? cleaned : [{ key: "control", weight: 100 }];
}

function pickVariant(subjectSeed: string, variants: AbVariant[]): AbVariant {
  const normalized = normalizeVariants(variants);
  const totalWeight = normalized.reduce((sum, variant) => sum + variant.weight, 0);
  const hash = createHash("sha256").update(subjectSeed).digest("hex");
  const hashInt = parseInt(hash.slice(0, 8), 16);
  const bucket = hashInt % totalWeight;

  let running = 0;
  for (const variant of normalized) {
    running += variant.weight;
    if (bucket < running) {
      return variant;
    }
  }

  return normalized[normalized.length - 1];
}

export async function assignAbVariant(params: {
  experimentId: string;
  subjectKey: string;
}): Promise<{ variant: AbVariant; assignmentId: string; isNew: boolean }> {
  await ensureGovernanceTables();

  const experimentRows = (await prisma.$queryRawUnsafe(
    `SELECT "id", "status", "variantsJson" FROM "AbTestExperiment" WHERE "id" = $1`,
    params.experimentId
  )) as Array<{ id: string; status: string; variantsJson: string }>;

  const experiment = experimentRows[0];
  if (!experiment) {
    throw new Error("EXPERIMENT_NOT_FOUND");
  }
  if (experiment.status !== "active") {
    throw new Error("EXPERIMENT_NOT_ACTIVE");
  }

  const subjectKeyHash = hashSubjectKey(params.subjectKey);
  const existingRows = (await prisma.$queryRawUnsafe(
    `SELECT "id", "variantKey" FROM "AbTestAssignment"
     WHERE "experimentId" = $1 AND "subjectKeyHash" = $2
     LIMIT 1`,
    params.experimentId,
    subjectKeyHash
  )) as Array<{ id: string; variantKey: string }>;

  const parsedVariants = normalizeVariants(JSON.parse(experiment.variantsJson) as AbVariant[]);

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    await prisma.$executeRawUnsafe(
      `UPDATE "AbTestAssignment"
       SET "exposureCount" = "exposureCount" + 1,
           "lastServedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      existing.id
    );

    const variant = parsedVariants.find((item) => item.key === existing.variantKey) || parsedVariants[0];
    return { variant, assignmentId: existing.id, isNew: false };
  }

  const variant = pickVariant(`${params.experimentId}:${subjectKeyHash}`, parsedVariants);
  const assignmentId = randomUUID();

  await prisma.$executeRawUnsafe(
    `INSERT INTO "AbTestAssignment"("id", "experimentId", "subjectKeyHash", "variantKey")
     VALUES ($1, $2, $3, $4)`,
    assignmentId,
    params.experimentId,
    subjectKeyHash,
    variant.key
  );

  return { variant, assignmentId, isNew: true };
}

export async function getUserRoleScopes(userId: string): Promise<string[]> {
  await ensureGovernanceTables();

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "scope" FROM "AdminRoleAssignment" WHERE "userId" = $1`,
    userId
  )) as Array<{ scope: string }>;

  return rows.map((row) => row.scope);
}

export async function hasRoleScope(userId: string, scope: string): Promise<boolean> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT 1 FROM "AdminRoleAssignment" WHERE "userId" = $1 AND "scope" = $2 LIMIT 1`,
    userId,
    scope
  )) as Array<{ '?column?': number }>;

  return rows.length > 0;
}
