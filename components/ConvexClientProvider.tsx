"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode, createContext, useContext, useMemo } from "react";

// Create a context to check if Convex is available
const ConvexConfiguredContext = createContext<boolean>(false);

export function useIsConvexConfigured() {
  return useContext(ConvexConfiguredContext);
}

function ConvexProviderWithAuth({
  convex,
  children,
}: {
  convex: ConvexReactClient;
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const convex = useMemo(() => {
    if (!convexUrl) {
      return null;
    }
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  // If no Convex URL is configured, render children without the provider
  // This allows the app to work with fallback data during development
  if (!convex) {
    return (
      <ClerkProvider>
        <ConvexConfiguredContext.Provider value={false}>
          {children}
        </ConvexConfiguredContext.Provider>
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider>
      <ConvexConfiguredContext.Provider value={true}>
        <ConvexProviderWithAuth convex={convex}>
          {children}
        </ConvexProviderWithAuth>
      </ConvexConfiguredContext.Provider>
    </ClerkProvider>
  );
}
