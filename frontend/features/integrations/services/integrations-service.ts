/**
 * Integrations Service
 * Handles integration-related API calls
 */

import type { ApiClient } from '@/lib/api';
import { mapIntegrationsDto, type IntegrationDto } from '../domain/mappers';
import type { Integration, IntegrationPlatform, OAuthResponse } from '../domain/types';

export function createIntegrationsService(apiClient: ApiClient) {
  return {
    async getIntegrations(): Promise<Integration[]> {
      const dto = await apiClient.get<IntegrationDto[]>('/integrations/');
      return mapIntegrationsDto(dto);
    },

    async getOAuthUrl(platform: IntegrationPlatform, shopDomain?: string): Promise<OAuthResponse> {
      const params: Record<string, string> = {};
      if (platform === 'shopify' && shopDomain) {
        params.shop = shopDomain;
      }
      const dto = await apiClient.get<{ authorization_url: string }>(
        `/integrations/${platform}/connect/`,
        { params }
      );
      return { authorizationUrl: dto.authorization_url };
    },

    async disconnect(integrationId: string): Promise<void> {
      await apiClient.post(`/integrations/${integrationId}/disconnect/`);
    },
  };
}

export type IntegrationsService = ReturnType<typeof createIntegrationsService>;
