export function validateCrawlerPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const data = payload as Record<string, unknown>;

  if (!Array.isArray(data.games)) {
    return false;
  }

  return true;
}
