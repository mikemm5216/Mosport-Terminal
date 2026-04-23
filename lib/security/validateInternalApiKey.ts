export function validateInternalApiKey(req: Request) {
  const incomingKey = req.headers.get("x-api-key");
  const expectedKey = process.env.MOSPORT_INTERNAL_API_KEY;

  if (!expectedKey) {
    throw new Error("MOSPORT_INTERNAL_API_KEY is missing");
  }

  if (!incomingKey || incomingKey !== expectedKey) {
    return false;
  }

  return true;
}
