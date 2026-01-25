"use client";

import { OrganizationSwitcher as ClerkOrganizationSwitcher } from "@clerk/nextjs";

export function OrganizationSwitcher() {
  return (
    <ClerkOrganizationSwitcher
      hidePersonal
      appearance={{
        elements: {
          rootBox: "w-full",
          organizationSwitcherTrigger:
            "flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-secondary transition-colors w-full justify-between border border-border overflow-hidden",
          organizationPreview: "flex items-center gap-2 min-w-0 flex-1",
          organizationPreviewAvatarContainer: "w-8 h-8 shrink-0",
          organizationPreviewTextContainer: "flex-1 text-left min-w-0",
          organizationPreviewMainIdentifier: "text-sm font-medium text-foreground truncate block",
          organizationPreviewSecondaryIdentifier: "text-xs text-foreground-secondary truncate block",
          organizationSwitcherTriggerIcon: "text-foreground-secondary shrink-0",
        },
      }}
      afterSelectOrganizationUrl="/"
      afterCreateOrganizationUrl="/"
    />
  );
}
