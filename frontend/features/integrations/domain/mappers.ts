/**
 * Integrations DTO to Domain Mappers
 */

import type { Integration, IntegrationPlatform } from './types';

/** DTO shape returned by the API */
export interface IntegrationDto {
  id: string;
  platform: string;
  platform_display: string;
  account_id: string;
  account_name: string;
  is_connected: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mapIntegrationDto(dto: IntegrationDto): Integration {
  return {
    id: dto.id,
    platform: dto.platform as IntegrationPlatform,
    platformDisplay: dto.platform_display,
    accountId: dto.account_id,
    accountName: dto.account_name,
    isConnected: dto.is_connected,
    lastSyncAt: dto.last_sync_at,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapIntegrationsDto(dtos: IntegrationDto[]): Integration[] {
  return dtos.map(mapIntegrationDto);
}
