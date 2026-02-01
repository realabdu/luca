"""Platform-specific API clients."""

import asyncio
import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

import httpx

from apps.integrations.models import Integration

logger = logging.getLogger(__name__)


@dataclass
class OrderData:
    """Normalized order data from e-commerce platforms."""

    external_id: str
    store_id: str
    order_date: datetime
    total_amount: Decimal
    currency: str
    status: str
    customer_id: str = ""
    customer_email: str = ""
    is_new_customer: Optional[bool] = None
    raw_data: dict = None

    def __post_init__(self):
        if self.raw_data is None:
            self.raw_data = {}


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


class ShopifyClient:
    """
    Shopify Admin API client for fetching orders.

    Uses REST Admin API with cursor-based pagination.
    Rate limit: 40 requests/second (handled via retry with backoff).
    """

    API_VERSION = "2024-01"

    # Map Shopify financial/fulfillment status to our normalized status
    STATUS_MAP = {
        "paid": "paid",
        "partially_paid": "pending",
        "pending": "pending",
        "authorized": "pending",
        "voided": "cancelled",
        "refunded": "refunded",
        "partially_refunded": "completed",  # Still count partial refunds as completed
    }

    def __init__(self, integration: Integration):
        self.integration = integration
        # Shop can be stored in metadata or account_id
        shop = integration.metadata.get("shop") or integration.account_id
        # Normalize shop name (remove .myshopify.com if present)
        if shop.endswith(".myshopify.com"):
            shop = shop.replace(".myshopify.com", "")
        self.shop = shop
        self.base_url = f"https://{self.shop}.myshopify.com/admin/api/{self.API_VERSION}"
        self.access_token = integration.access_token

    def _get_headers(self) -> dict:
        """Get headers for Shopify API requests."""
        return {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json",
        }

    def _parse_link_header(self, link_header: str) -> Optional[str]:
        """
        Parse Link header for cursor-based pagination.
        Returns the 'next' page URL if present.

        Example Link header:
        <https://shop.myshopify.com/admin/api/2024-01/orders.json?page_info=xyz>; rel="next"
        """
        if not link_header:
            return None

        # Find the 'next' relation
        for part in link_header.split(","):
            if 'rel="next"' in part or "rel='next'" in part:
                # Extract URL from angle brackets
                match = re.search(r"<([^>]+)>", part)
                if match:
                    return match.group(1)
        return None

    def _normalize_order(self, order: dict) -> OrderData:
        """Normalize a Shopify order to OrderData format."""
        # Determine status from financial_status
        financial_status = order.get("financial_status", "pending")
        normalized_status = self.STATUS_MAP.get(financial_status, "pending")

        # Extract customer info
        customer = order.get("customer", {}) or {}
        customer_id = str(customer.get("id", "")) if customer else ""
        customer_email = customer.get("email", "") or ""

        # Check if new customer (orders_count == 1)
        orders_count = customer.get("orders_count", 0) if customer else 0
        is_new_customer = orders_count == 1 if customer else None

        # Parse order date
        created_at = order.get("created_at", "")
        if created_at:
            # Shopify uses ISO 8601 format
            order_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        else:
            order_date = datetime.now()

        return OrderData(
            external_id=str(order.get("id", "")),
            store_id=self.shop,
            order_date=order_date,
            total_amount=Decimal(order.get("total_price", "0")),
            currency=order.get("currency", "USD"),
            status=normalized_status,
            customer_id=customer_id,
            customer_email=customer_email,
            is_new_customer=is_new_customer,
            raw_data=order,
        )

    async def get_orders(
        self,
        since: Optional[datetime] = None,
        limit: int = 250,
    ) -> list[OrderData]:
        """
        Fetch orders from Shopify with pagination.

        Args:
            since: Only fetch orders created after this datetime
            limit: Number of orders per page (max 250)

        Returns:
            List of normalized OrderData objects
        """
        orders = []
        url = f"{self.base_url}/orders.json"

        params = {
            "limit": min(limit, 250),
            "status": "any",  # Include all order statuses
            "order": "created_at asc",
        }

        if since:
            params["created_at_min"] = since.isoformat()

        async with httpx.AsyncClient(timeout=30.0) as client:
            while url:
                try:
                    response = await client.get(
                        url,
                        params=params if "page_info" not in url else None,
                        headers=self._get_headers(),
                    )

                    # Handle rate limiting (429)
                    if response.status_code == 429:
                        retry_after = float(response.headers.get("Retry-After", 2))
                        logger.warning(
                            f"Shopify rate limit hit, waiting {retry_after}s"
                        )
                        await asyncio.sleep(retry_after)
                        continue

                    # Handle auth errors (401)
                    if response.status_code == 401:
                        logger.error(
                            f"Shopify auth failed for {self.shop}: token may be invalid"
                        )
                        raise httpx.HTTPStatusError(
                            "Invalid or expired access token",
                            request=response.request,
                            response=response,
                        )

                    response.raise_for_status()
                    data = response.json()

                    # Process orders
                    for order in data.get("orders", []):
                        orders.append(self._normalize_order(order))

                    # Get next page from Link header
                    link_header = response.headers.get("Link", "")
                    url = self._parse_link_header(link_header)

                    # Clear params for subsequent requests (use page_info from URL)
                    params = None

                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 401:
                        raise
                    logger.error(f"Shopify API error: {e}")
                    raise

        logger.info(f"Fetched {len(orders)} orders from Shopify shop {self.shop}")
        return orders
