import { getPersistenceProvider } from "../persistence/registry.js";

export async function assertAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false;
  try {
    return await getPersistenceProvider().isAdminEmail(email);
  } catch {
    return false;
  }
}
