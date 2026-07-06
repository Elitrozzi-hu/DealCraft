import { createLogger } from "./logger.js";
import { getPersistenceProvider } from "../persistence/registry.js";

const log = createLogger("admin");

export async function assertAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false;
  try {
    const result = await getPersistenceProvider().isAdminEmail(email);
    log.info("assertAdmin", { email, result });
    return result;
  } catch (err) {
    log.error("assertAdmin failed", {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
