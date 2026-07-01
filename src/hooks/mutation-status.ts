import type { AsyncStatus } from "@/types";

export function mutationStatus(
  isPending: boolean,
  isError: boolean,
  isSuccess: boolean,
): AsyncStatus {
  if (isPending) return "loading";
  if (isError) return "error";
  if (isSuccess) return "success";
  return "idle";
}
