import type { Prisma, PrismaClient } from "@prisma/client";
import type { Changes } from "@/lib/audit-diff";

type Db = PrismaClient | Prisma.TransactionClient;

export type AuditAction =
  | "create"
  | "update"
  | "deactivate"
  | "reactivate"
  | "delete"
  | "login";

export type AuditInput = {
  communityId: string;
  entityType: "candidate" | "suggestion" | "membership" | "community" | "auth";
  entityId: string;
  entityLabel: string;
  action: AuditAction;
  actorId?: string | null;
  changes?: Changes;
  snapshot?: unknown;
  note?: string;
};

/** Write a single audit-log entry. Call inside the same transaction as the mutation. */
export async function writeAudit(db: Db, input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      communityId: input.communityId,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      action: input.action,
      source: "user",
      actorId: input.actorId ?? null,
      changes: (input.changes ?? undefined) as Prisma.InputJsonValue | undefined,
      snapshot: (input.snapshot ?? undefined) as Prisma.InputJsonValue | undefined,
      note: input.note,
    },
  });
}
