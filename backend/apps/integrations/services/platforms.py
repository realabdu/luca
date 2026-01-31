"""Platform-specific API clients."""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Optional

import httpx

from apps.integrations.models import Integration

logger = logging.getLogger(__name__)


@dataclass
class CampaignData:
    """Normalized campaign data."""
    external_id: str
    name: str
    status: str
    spend: float
    impressions: int
    clicks: int
    conversions: int


@dataclass
class SpendData:
    """Daily spend data."""
    date: date
    platform: str
    account_id: str
    spend: float
    currency: str
    impressions: int
    clicks: int
    conversions: int


class BasePlatformClient(ABC):
    """Base class for platform API clients."""

    def __init__(self, integration: Integration):
        self.integration = integration
        self.access_token = integration.access_token

    @abstractmethod
    async def get_campaigns(self) -> list[CampaignData]:
        """Fetch campaigns from the platform."""
        pass

    @abstractmethod
    async def get_daily_spend(
        self,
        start_date: date,
        end_date: date,
    ) -> list[SpendData]:
        """Fetch daily spend data."""
        pass


class MetaClient(BasePlatformClient):
    """Meta (Facebook) Ads API client."""

    BASE_URL = "https://graph.facebook.com/v18.0"

    async def get_campaigns(self) -> list[CampaignData]:
        account_id = self.integration.account_id
        url = f"{self.BASE_URL}/act_{account_id}/campaigns"
        params = {
            "access_token": self.access_token,
            "fields": "id,name,status,insights{spend,impressions,clicks,actions}",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        campaigns = []
        for campaign in data.get("data", []):
            insights = campaign.get("insights", {}).get("data", [{}])[0]
            campaigns.append(CampaignData(
                external_id=campaign["id"],
                name=campaign["name"],
                status=self._normalize_status(campaign["status"]),
                spend=float(insights.get("spend", 0)),
                impressions=int(insights.get("impressions", 0)),
                clicks=int(insights.get("clicks", 0)),
                conversions=self._count_conversions(insights.get("actions", [])),
            ))

        return campaigns

    async def get_daily_spend(
        self,
        start_date: date,
        end_date: date,
    ) -> list[SpendData]:
        account_id = self.integration.account_id
        url = f"{self.BASE_URL}/act_{account_id}/insights"
        params = {
            "access_token": self.access_token,
            "fields": "spend,impressions,clicks,actions",
            "time_range": f'{{"since":"{start_date}","until":"{end_date}"}}',
            "time_increment": 1,
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        spend_data = []
        for day in data.get("data", []):
            spend_data.append(SpendData(
                date=date.fromisoformat(day["date_start"]),
                platform="meta",
                account_id=account_id,
                spend=float(day.get("spend", 0)),
                currency="USD",  # Meta reports in account currency
                impressions=int(day.get("impressions", 0)),
                clicks=int(day.get("clicks", 0)),
                conversions=self._count_conversions(day.get("actions", [])),
            ))

        return spend_data

    def _normalize_status(self, status: str) -> str:
        status_map = {
            "ACTIVE": "Active",
            "PAUSED": "Paused",
            "DELETED": "Inactive",
            "ARCHIVED": "Inactive",
        }
        return status_map.get(status, "Inactive")

    def _count_conversions(self, actions: list) -> int:
        for action in actions:
            if action.get("action_type") == "purchase":
                return int(action.get("value", 0))
        return 0


class GoogleClient(BasePlatformClient):
    """Google Ads API client."""

    async def get_campaigns(self) -> list[CampaignData]:
        # Simplified - actual implementation would use Google Ads API
        logger.info("Fetching Google campaigns...")
        return []

    async def get_daily_spend(
        self,
        start_date: date,
        end_date: date,
    ) -> list[SpendData]:
        logger.info("Fetching Google daily spend...")
        return []


class TikTokClient(BasePlatformClient):
    """TikTok Ads API client."""

    BASE_URL = "https://business-api.tiktok.com/open_api/v1.3"

    async def get_campaigns(self) -> list[CampaignData]:
        url = f"{self.BASE_URL}/campaign/get/"
        headers = {"Access-Token": self.access_token}
        params = {
            "advertiser_id": self.integration.account_id,
            "fields": '["campaign_id","campaign_name","status"]',
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()

        campaigns = []
        for campaign in data.get("data", {}).get("list", []):
            campaigns.append(CampaignData(
                external_id=campaign["campaign_id"],
                name=campaign["campaign_name"],
                status=self._normalize_status(campaign["status"]),
                spend=0,
                impressions=0,
                clicks=0,
                conversions=0,
            ))

        return campaigns

    async def get_daily_spend(
        self,
        start_date: date,
        end_date: date,
    ) -> list[SpendData]:
        logger.info("Fetching TikTok daily spend...")
        return []

    def _normalize_status(self, status: str) -> str:
        status_map = {
            "CAMPAIGN_STATUS_ENABLE": "Active",
            "CAMPAIGN_STATUS_DISABLE": "Paused",
            "CAMPAIGN_STATUS_DELETE": "Inactive",
        }
        return status_map.get(status, "Inactive")


class SnapchatClient(BasePlatformClient):
    """Snapchat Ads API client."""

    BASE_URL = "https://adsapi.snapchat.com/v1"

    async def get_campaigns(self) -> list[CampaignData]:
        url = f"{self.BASE_URL}/adaccounts/{self.integration.account_id}/campaigns"
        headers = {"Authorization": f"Bearer {self.access_token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

        campaigns = []
        for item in data.get("campaigns", []):
            campaign = item.get("campaign", {})
            campaigns.append(CampaignData(
                external_id=campaign["id"],
                name=campaign["name"],
                status=self._normalize_status(campaign["status"]),
                spend=0,
                impressions=0,
                clicks=0,
                conversions=0,
            ))

        return campaigns

    async def get_daily_spend(
        self,
        start_date: date,
        end_date: date,
    ) -> list[SpendData]:
        logger.info("Fetching Snapchat daily spend...")
        return []

    def _normalize_status(self, status: str) -> str:
        status_map = {
            "ACTIVE": "Active",
            "PAUSED": "Paused",
        }
        return status_map.get(status, "Inactive")


def get_platform_client(integration: Integration) -> Optional[BasePlatformClient]:
    """Get the appropriate client for a platform."""
    clients = {
        "meta": MetaClient,
        "google": GoogleClient,
        "tiktok": TikTokClient,
        "snapchat": SnapchatClient,
    }

    client_class = clients.get(integration.platform)
    if client_class:
        return client_class(integration)
    return None
