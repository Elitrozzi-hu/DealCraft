// Common — cross-feature primitives shared by the network hooks and API client.

/** Discriminated status union shared by the network hooks. */
export type AsyncStatus = "idle" | "loading" | "error" | "success";

/** A typed error thrown by the API client on a non-2xx response. */
export interface ApiErrorShape {
  status: number;
  message: string;
}
