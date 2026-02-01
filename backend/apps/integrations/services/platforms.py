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
    spend: float = 0
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0


@dataclass
class SpendData:
    """Daily spend data."""

    date: date
    platform: str
    account_id: str
    spend: float
    currency: str
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0


class BasePlatformClient(ABC):
    """Base class for platform API clients."""

    # Status mapping for normalizing platform-specific statuses
    STATUS_MAP: dict[str, str] = {}

    def __init__(self, integration: Integration):
        self.integration = integration
        self.access_token = integration.access_token

    @abstractmethod
    async def get_campaigns(self) -> list[CampaignData]:
        """Fetch campaigns from the platform."""
        pass

    @abstractmethod
    async def get_daily_spend(self, start_date: date, end_date: date) -> list[SpendData]:
        """Fetch daily spend data."""
        pass

    def _normalize_status(self, platform_status: str) -> str:
        """Normalize platform-specific status to standard values."""
        return self.STATUS_MAP.get(platform_status, "Inactive")

    async def _get_json(
        self, url: str, params: dict = None, headers: dict = None
    ) -> dict:
        """Make a GET request and return JSON response."""
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json()


class MetaClient(BasePlatformClient):
    """Meta (Facebook) Ads API client."""

    BASE_URL = "https://graph.facebook.com/v18.0"
    STATUS_MAP = {
        "ACTIVE": "Active",
        "PAUSED": "Paused",
        "DELETED": "Inactive",
        "ARCHIVED": "Inactive",
    }

    async def get_campaigns(self) -> list[CampaignData]:
        account_id = self.integration.account_id
        url = f"{self.BASE_URL}/act_{account_id}/campaigns"
        params = {
            "access_token": self.access_token,
            "fields": "id,name,status,insights{spend,impressions,clicks,actions}",
        }

        data = await self._get_json(url, params=params)

        return [
            CampaignData(
                external_id=campaign["id"],
                name=campaign["name"],
                status=self._normalize_status(campaign["status"]),
                spend=float(self._get_insight(campaign, "spend", 0)),
                impressions=int(self._get_insight(campaign, "impressions", 0)),
                clicks=int(self._get_insight(campaign, "clicks", 0)),
                conversions=self._count_conversions(
                    self._get_insight(campaign, "actions", [])
                ),
            )
            for campaign in data.get("data", [])
        ]

    async def get_daily_spend(self, start_date: date, end_date: date) -> list[SpendData]:
        account_id = self.integration.account_id
        url = f"{self.BASE_URL}/act_{account_id}/insights"
        params = {
            "access_token": self.access_token,
            "fields": "spend,impressions,clicks,actions",
            "time_range": f'{{"since":"{start_date}","until":"{end_date}"}}',
            "time_increment": 1,
        }

        data = await self._get_json(url, params=params)

        return [
            SpendData(
                date=date.fromisoformat(day["date_start"]),
                platform="meta",
                account_id=account_id,
                spend=float(day.get("spend", 0)),
                currency="USD",
                impressions=int(day.get("impressions", 0)),
                clicks=int(day.get("clicks", 0)),
                conversions=self._count_conversions(day.get("actions", [])),
            )
            for day in data.get("data", [])
        ]

    @staticmethod
    def _get_insight(campaign: dict, key: str, default):
        """Extract a value from campaign insights."""
        insights = campaign.get("insights", {}).get("data", [{}])[0]
        return insights.get(key, default)

    @staticmethod
    def _count_conversions(actions: list) -> int:
        """Count purchase conversions from Meta actions list."""
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

    async def get_daily_spend(self, start_date: date, end_date: date) -> list[SpendData]:
        logger.info("Fetching Google daily spend...")
        return []


class TikTokClient(BasePlatformClient):
    """TikTok Ads API client."""

    BASE_URL = "https://business-api.tiktok.com/open_api/v1.3"
    STATUS_MAP = {
        "CAMPAIGN_STATUS_ENABLE": "Active",
        "CAMPAIGN_STATUS_DISABLE": "Paused",
        "CAMPAIGN_STATUS_DELETE": "Inactive",
    }

    async def get_campaigns(self) -> list[CampaignData]:
        url = f"{self.BASE_URL}/campaign/get/"
        headers = {"Access-Token": self.access_token}
        params = {
            "advertiser_id": self.integration.account_id,
            "fields": '["campaign_id","campaign_name","status"]',
        }

        data = await self._get_json(url, params=params, headers=headers)

        return [
            CampaignData(
                external_id=campaign["campaign_id"],
                name=campaign["campaign_name"],
                status=self._normalize_status(campaign["status"]),
            )
            for campaign in data.get("data", {}).get("list", [])
        ]

    async def get_daily_spend(self, start_date: date, end_date: date) -> list[SpendData]:
        logger.info("Fetching TikTok daily spend...")
        return []


class SnapchatClient(BasePlatformClient):
    """Snapchat Ads API client."""

    BASE_URL = "https://adsapi.snapchat.com/v1"
    STATUS_MAP = {
        "ACTIVE": "Active",
        "PAUSED": "Paused",
    }

    async def get_campaigns(self) -> list[CampaignData]:
        url = f"{self.BASE_URL}/adaccounts/{self.integration.account_id}/campaigns"
        headers = {"Authorization": f"Bearer {self.access_token}"}

        data = await self._get_json(url, headers=headers)

        return [
            CampaignData(
                external_id=item.get("campaign", {}).get("id", ""),
                name=item.get("campaign", {}).get("name", ""),
                status=self._normalize_status(
                    item.get("campaign", {}).get("status", "")
                ),
            )
            for item in data.get("campaigns", [])
        ]

    async def get_daily_spend(self, start_date: date, end_date: date) -> list[SpendData]:
        logger.info("Fetching Snapchat daily spend...")
        return []


PLATFORM_CLIENTS: dict[str, type[BasePlatformClient]] = {
    "meta": MetaClient,
    "google": GoogleClient,
    "tiktok": TikTokClient,
    "snapchat": SnapchatClient,
}


def get_platform_client(integration: Integration) -> Optional[BasePlatformClient]:
    """Get the appropriate client for a platform."""
    client_class = PLATFORM_CLIENTS.get(integration.platform)
    return client_class(integration) if client_class else None
