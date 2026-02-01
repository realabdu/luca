"""Generate mock Snapchat ad spend data correlated with Shopify orders."""

import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Sum
from django.db.models.functions import TruncDate

from apps.accounts.models import Organization
from apps.analytics.models import AdSpendDaily
from apps.orders.models import Order


class Command(BaseCommand):
    help = "Generate mock Snapchat ad spend data correlated with existing Shopify orders"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=90,
            help="Number of days to generate data for (default: 90)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing mock Snapchat data before generating",
        )
        parser.add_argument(
            "--org-id",
            type=int,
            help="Organization ID to generate data for (default: first org with Snapchat or any org)",
        )

    def handle(self, *args, **options):
        days = options["days"]
        clear = options["clear"]
        org_id = options.get("org_id")

        # Get organization
        organization = self._get_organization(org_id)
        if not organization:
            self.stderr.write(self.style.ERROR("No organization found"))
            return

        self.stdout.write(f"Using organization: {organization.name} (ID: {organization.id})")

        # Clear existing mock data if requested
        if clear:
            deleted_count, _ = AdSpendDaily.objects.filter(
                organization=organization,
                platform="snapchat",
                account_id="mock_snapchat_123",
            ).delete()
            self.stdout.write(f"Cleared {deleted_count} existing mock Snapchat records")

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        self.stdout.write(f"Generating data from {start_date} to {end_date}")

        # Fetch Shopify revenue by date
        revenue_by_date = self._get_revenue_by_date(organization, start_date, end_date)

        # Generate ad spend data
        created_count = 0
        updated_count = 0

        current_date = start_date
        while current_date <= end_date:
            daily_revenue = revenue_by_date.get(current_date, Decimal("0"))
            ad_data = self._generate_daily_ad_data(daily_revenue)

            _, created = AdSpendDaily.objects.update_or_create(
                organization=organization,
                date=current_date,
                platform="snapchat",
                account_id="mock_snapchat_123",
                defaults={
                    "spend": ad_data["spend"],
                    "currency": "SAR",
                    "impressions": ad_data["impressions"],
                    "clicks": ad_data["clicks"],
                    "conversions": ad_data["conversions"],
                },
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

            current_date += timedelta(days=1)

        self.stdout.write(
            self.style.SUCCESS(
                f"Generated {created_count} new records, updated {updated_count} existing records"
            )
        )

        # Provide instructions for recalculating metrics
        self.stdout.write("")
        self.stdout.write("To recalculate daily metrics, run:")
        self.stdout.write(
            f"  python manage.py shell -c \"from apps.integrations.tasks import "
            f"calculate_daily_metrics_for_org; "
            f"[calculate_daily_metrics_for_org({organization.id}, str(d)) "
            f"for d in __import__('pandas').date_range('{start_date}', '{end_date}')]\""
        )
        self.stdout.write("")
        self.stdout.write("Or trigger a full sync from the dashboard.")

    def _get_organization(self, org_id=None):
        """Get organization - prefer one with Snapchat integration."""
        if org_id:
            try:
                return Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                return None

        # Try to find org with Snapchat integration
        try:
            from apps.integrations.models import Integration

            snapchat_integration = Integration.objects.filter(
                platform="snapchat",
                is_connected=True,
            ).first()
            if snapchat_integration:
                return snapchat_integration.organization
        except Exception:
            pass

        # Fall back to first organization
        return Organization.objects.first()

    def _get_revenue_by_date(self, organization, start_date, end_date):
        """Fetch Shopify order revenue grouped by date."""
        excluded_statuses = ["cancelled", "canceled", "refunded", "voided", "failed"]

        revenue_data = (
            Order.objects.filter(
                organization=organization,
                order_date__date__gte=start_date,
                order_date__date__lte=end_date,
            )
            .exclude(status__in=excluded_statuses)
            .annotate(order_day=TruncDate("order_date"))
            .values("order_day")
            .annotate(total_revenue=Sum("total_amount"))
        )

        return {item["order_day"]: item["total_revenue"] for item in revenue_data}

    def _generate_daily_ad_data(self, daily_revenue):
        """
        Generate realistic ad spend data based on daily revenue.

        Realistic benchmarks for Saudi Arabia 2025:
        - CPM: 25-32 SAR (~$7 USD)
        - CTR: 0.6-1.0%
        - Conversion Rate: 2-5% of clicks
        - Target ROAS: 3-5x
        """
        if daily_revenue > 0:
            # Calculate spend based on target ROAS (3-5x)
            target_roas = random.uniform(3.0, 5.0)
            base_spend = float(daily_revenue) / target_roas

            # Add variance ±20%
            variance = random.uniform(0.8, 1.2)
            spend = base_spend * variance

            # Minimum spend of 50 SAR even with revenue
            spend = max(spend, 50.0)

            # Cap at 200 SAR for reasonable daily spend
            spend = min(spend, 200.0)
        else:
            # No orders - minimal "awareness" spend
            spend = random.uniform(20.0, 40.0)

        # Round to 2 decimal places
        spend = round(spend, 2)

        # Calculate impressions based on CPM (25-32 SAR per 1000 impressions)
        cpm = random.uniform(25.0, 32.0)
        impressions = int((spend / cpm) * 1000)

        # Calculate clicks based on CTR (0.6-1.0%)
        ctr = random.uniform(0.006, 0.010)
        clicks = int(impressions * ctr)

        # Calculate conversions based on conversion rate (2-5% of clicks)
        conversion_rate = random.uniform(0.02, 0.05)
        conversions = int(clicks * conversion_rate)

        return {
            "spend": Decimal(str(spend)),
            "impressions": impressions,
            "clicks": clicks,
            "conversions": conversions,
        }
