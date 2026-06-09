export type Change = { from: unknown; to: unknown };
export type Changes = Record<string, Change>;

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Shallow per-key diff; values compared by deep (JSON) equality. */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Changes {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: Changes = {};
  for (const k of keys) {
    if (!eq(before[k], after[k])) {
      changes[k] = { from: before[k], to: after[k] };
    }
  }
  return changes;
}
