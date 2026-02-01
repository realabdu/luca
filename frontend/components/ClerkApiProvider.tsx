"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";
import { ApiProvider } from "@/providers/ApiProvider";

/**
 * Combined provider that wraps the application with both Clerk and React Query providers.
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
