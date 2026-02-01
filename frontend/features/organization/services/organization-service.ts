import type { ApiClient } from '@/lib/api';
import { mapOrganizationDto, mapOrganizationMembersDto } from '../domain/mappers';
import type { Organization, OrganizationMember, OrganizationDto, OrganizationMemberDto } from '../domain/types';

export function createOrganizationService(apiClient: ApiClient) {
  return {
    async getCurrentOrganization(): Promise<Organization> {
      const dto = await apiClient.get<OrganizationDto>('/organizations/current/');
      return mapOrganizationDto(dto);
    },

    async getMembers(): Promise<OrganizationMember[]> {
      const dtos = await apiClient.get<OrganizationMemberDto[]>('/organizations/members/');
      return mapOrganizationMembersDto(dtos);
    },
  };
}
