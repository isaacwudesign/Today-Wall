/**
 * TodaywallSceneRefs — loud @input validation. Does not create objects or
 * own game state.
 */

export function requireRef<T>(value: T, name: string): T {
  if (!value) {
    throw new Error(
      "[Todaywall] Missing required @input '" +
        name +
        "'. Re-run bootstrap / recompile and wire Inspector refs."
    )
  }
  return value
}
