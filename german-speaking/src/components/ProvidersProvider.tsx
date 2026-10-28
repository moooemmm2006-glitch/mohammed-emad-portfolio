"use client";

import type { ReactNode } from "react";
import { ProvidersContext, type ServerProviders } from "@/lib/client/api";

export function ProvidersProvider({ value, children }: { value: ServerProviders; children: ReactNode }) {
  return <ProvidersContext.Provider value={value}>{children}</ProvidersContext.Provider>;
}
