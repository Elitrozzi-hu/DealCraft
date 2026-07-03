export function computeCompanyKey(resolvedName: string): string {
  return resolvedName.trim().replace(/\s+/g, " ").toLowerCase();
}
