/**
 * Organization domain types (camelCase for frontend use)
 */

export interface Organization {
  id: string;
  clerkId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  joinedAt: string;
}

/**
 * DTO types (snake_case from API)
 */

export interface OrganizationDto {
  id: string;
  clerk_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMemberDto {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  joined_at: string;
}
