"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";
import { ApiProvider } from "./ApiProvider";

/**
 * Combined provider that wraps the application with both Clerk and API (SWR) providers.
 * Replaces the old ConvexClientProvider.
 */
export function ClerkApiProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ApiProvider>
        {children}
      </ApiProvider>
    </ClerkProvider>
  );
}

export default ClerkApiProvider;
