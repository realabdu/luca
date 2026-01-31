"use client";

import { OrganizationProfile, useAuth, useOrganization } from "@clerk/nextjs";
import { useApiQuery, Organization } from "@/lib/api-client";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export default function TeamSettingsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { organization: clerkOrg, isLoaded: isOrgLoaded } = useOrganization();

  // Only query when authenticated and organization is selected
  const canQuery = isLoaded && isSignedIn && isOrgLoaded && !!clerkOrg;

  const { data: members } = useApiQuery<Member[]>(canQuery ? '/organizations/members/' : null);
  const { data: organization } = useApiQuery<Organization>(canQuery ? '/organizations/current/' : null);

  // Show loading state while checking organization
  if (!isLoaded || !isOrgLoaded) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-text-muted animate-spin">progress_activity</span>
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Show message if signed in but no organization selected
  if (isSignedIn && !clerkOrg) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="size-16 bg-amber-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-amber-600">domain_add</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-main mb-2">No Organization Selected</h2>
            <p className="text-sm text-text-muted max-w-md">
              Please select or create an organization from the organization switcher to manage team settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground text-balance">Team Settings</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          Manage your organization members and roles
        </p>
      </div>

      {/* Use Clerk's built-in Organization Profile */}
      <div className="bg-surface border border-border overflow-hidden">
        <OrganizationProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border-0 w-full",
              navbar: "hidden",
              pageScrollBox: "p-0",
            },
          }}
        />
      </div>

      {/* Custom members list from Convex (additional info) */}
      {members && members.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-foreground mb-4">
            Member Activity
          </h2>
          <div className="bg-surface border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-secondary">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-secondary">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground-secondary">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name || member.email || ''}
                            className="size-8"
                          />
                        ) : (
                          <div className="size-8 bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {(member.name || member.email)?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {member.name || "No name"}
                          </div>
                          <div className="text-xs text-foreground-secondary">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium ${
                          member.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-secondary text-foreground-secondary"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary">
                      {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
