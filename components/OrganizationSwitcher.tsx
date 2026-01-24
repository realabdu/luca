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
            "flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-secondary transition-colors w-full justify-between border border-border",
          organizationPreview: "flex items-center gap-2",
          organizationPreviewAvatarContainer: "w-8 h-8",
          organizationPreviewTextContainer: "flex-1 text-left",
          organizationPreviewMainIdentifier: "text-sm font-medium text-foreground",
          organizationPreviewSecondaryIdentifier: "text-xs text-foreground-secondary",
          organizationSwitcherTriggerIcon: "text-foreground-secondary",
        },
      }}
      afterSelectOrganizationUrl="/"
      afterCreateOrganizationUrl="/"
    />
  );
}
