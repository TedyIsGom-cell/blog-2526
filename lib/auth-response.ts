/** Authentication endpoints may be interrupted before they can return JSON. */
export async function readAuthResponse(response: Response, fallback: string): Promise<{ error?: string }> {
  const raw = await response.text();
  let data: unknown;
  try { data = JSON.parse(raw); } catch {
    throw new Error(`${fallback} (HTTP ${response.status}). 잠시 후 다시 시도해주세요.`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${fallback} (HTTP ${response.status}). 잠시 후 다시 시도해주세요.`);
  }
  return { error: 'error' in data && typeof data.error === 'string' ? data.error : undefined };
}
