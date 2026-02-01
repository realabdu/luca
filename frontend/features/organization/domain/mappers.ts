import type {
  Organization,
  OrganizationDto,
  OrganizationMember,
  OrganizationMemberDto,
} from './types';

export function mapOrganizationDto(dto: OrganizationDto): Organization {
  return {
    id: dto.id,
    clerkId: dto.clerk_id,
    name: dto.name,
    slug: dto.slug,
    logoUrl: dto.logo_url,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapOrganizationMemberDto(dto: OrganizationMemberDto): OrganizationMember {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    avatarUrl: dto.avatar_url,
    joinedAt: dto.joined_at,
  };
}

export function mapOrganizationMembersDto(dtos: OrganizationMemberDto[]): OrganizationMember[] {
  return dtos.map(mapOrganizationMemberDto);
}
