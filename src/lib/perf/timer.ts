export async function timeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const started = performance.now();
  const result = await fn();
  const ms = Number((performance.now() - started).toFixed(2));
  return { result, ms };
}
