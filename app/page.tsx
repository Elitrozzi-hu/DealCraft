// Server Component entry point. The view-state machine (input → searching →
// copilot) lives in the `DealCraftApp` client shell — `"use client"` is pushed
// to the leaf, not the page root.
import { DealCraftApp } from "@/components/features/dealcraft-app";

export default function Home() {
  return <DealCraftApp />;
}
