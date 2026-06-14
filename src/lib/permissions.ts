export type Role = "admin" | "member";

export type Action =
  | "candidate:create"
  | "candidate:edit"
  | "candidate:deactivate"
  | "candidate:delete"
  | "suggestion:manage"
  | "member:manage"
  | "audit:view";

const MEMBER_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "candidate:create",
  "candidate:edit",
  "candidate:deactivate",
  "candidate:delete",
  "suggestion:manage",
]);

const ADMIN_ONLY_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "member:manage",
  "audit:view",
]);

export function can(role: Role, action: Action): boolean {
  if (role === "admin") {
    return MEMBER_ACTIONS.has(action) || ADMIN_ONLY_ACTIONS.has(action);
  }
  return MEMBER_ACTIONS.has(action);
}

/** Members may mutate only candidates they created; admins may mutate any. */
export function canEditCandidate(
  role: Role,
  userId: string,
  candidate: { createdById: string | null },
): boolean {
  return role === "admin" || candidate.createdById === userId;
}
