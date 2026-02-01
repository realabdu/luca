#!/usr/bin/env python
"""
Script to add more Shopify orders with proper rate limiting.
Targets 30-40 orders across the last 14 days.
"""

import random
import time
from datetime import timedelta

import httpx
from django.utils import timezone

from apps.integrations.models import Integration


# Saudi names for customers
FIRST_NAMES = ["محمد", "عبدالله", "فهد", "سلطان", "خالد", "سعود", "نواف", "تركي", "أحمد", "عمر"]
LAST_NAMES = ["الشمري", "العتيبي", "القحطاني", "الدوسري", "الحربي", "المطيري", "السبيعي", "الزهراني", "الغامدي", "البلوي"]
FEMALE_NAMES = ["نورة", "سارة", "لمى", "هيفاء", "ريم", "دلال", "منال", "أمل", "هند", "عهود"]

CITIES = [
    {"city": "الرياض", "province": "الرياض", "zip": "12345"},
    {"city": "جدة", "province": "مكة المكرمة", "zip": "21442"},
    {"city": "الدمام", "province": "المنطقة الشرقية", "zip": "31411"},
    {"city": "مكة المكرمة", "province": "مكة المكرمة", "zip": "24231"},
    {"city": "المدينة المنورة", "province": "المدينة المنورة", "zip": "42311"},
]

# Saudi product IDs from the store
SAUDI_PRODUCT_IDS = [
    9616827187430,  # بخور عود كمبودي
    9616827089126,  # ثوب رجالي أبيض
    9616827121894,  # ثوب رجالي رمادي
    9616827220198,  # شماغ أحمر
    9616826990822,  # عباية سوداء فاخرة
    9616827056358,  # عباية كاجوال
    9616827023590,  # عباية مطرزة
    9616827154662,  # عطر عود فاخر
    9616827285734,  # عقال أسود
    9616827252966,  # غترة بيضاء
]


def generate_customer():
    """Generate a random Saudi customer."""
    is_female = random.random() > 0.4
    first_name = random.choice(FEMALE_NAMES if is_female else FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    city_data = random.choice(CITIES)

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": f"{first_name.replace(' ', '')}_{random.randint(100, 999)}@example.com",
        "phone": f"+9665{random.randint(10000000, 99999999)}",
        "address1": f"شارع الملك فهد، حي {random.choice(['النزهة', 'الروضة', 'السليمانية', 'الملز', 'العليا'])}",
        "city": city_data["city"],
        "province": city_data["province"],
        "zip": city_data["zip"],
        "country": "Saudi Arabia",
        "country_code": "SA",
    }


def create_order(base_url, headers, products, order_date, max_retries=5):
    """Create a single order."""
    # Select 1-3 random products
    num_products = random.randint(1, 3)
    selected_products = random.sample(products, min(num_products, len(products)))

    customer = generate_customer()

    line_items = []
    for product in selected_products:
        variant = product["variants"][0]
        quantity = random.randint(1, 2)
        line_items.append({
            "variant_id": variant["id"],
            "quantity": quantity,
        })

    order_payload = {
        "order": {
            "line_items": line_items,
            "customer": {
                "first_name": customer["first_name"],
                "last_name": customer["last_name"],
                "email": customer["email"],
            },
            "billing_address": {
                "first_name": customer["first_name"],
                "last_name": customer["last_name"],
                "address1": customer["address1"],
                "phone": customer["phone"],
                "city": customer["city"],
                "province": customer["province"],
                "country": customer["country"],
                "zip": customer["zip"],
                "country_code": customer["country_code"],
            },
            "shipping_address": {
                "first_name": customer["first_name"],
                "last_name": customer["last_name"],
                "address1": customer["address1"],
                "phone": customer["phone"],
                "city": customer["city"],
                "province": customer["province"],
                "country": customer["country"],
                "zip": customer["zip"],
                "country_code": customer["country_code"],
            },
            "financial_status": random.choice(["paid", "paid", "paid", "pending"]),
            "fulfillment_status": random.choice([None, "fulfilled", "fulfilled"]),
            "currency": "SAR",
            "created_at": order_date.isoformat(),
            "processed_at": order_date.isoformat(),
        }
    }

    for attempt in range(max_retries):
        response = httpx.post(
            f"{base_url}/orders.json",
            headers=headers,
            json=order_payload,
            timeout=30,
        )

        if response.status_code == 201:
            return response.json()["order"]
        elif response.status_code == 429:
            wait_time = 65 + (attempt * 30)
            print(f"  ⏳ Rate limited, waiting {wait_time}s (retry {attempt + 1}/{max_retries})...")
            time.sleep(wait_time)
        else:
            print(f"✗ Failed: {response.status_code} - {response.text[:200]}")
            return None

    return None


def main():
    integration = Integration.objects.filter(platform="shopify", is_connected=True).first()
    if not integration:
        print("No Shopify integration found!")
        return

    shop = integration.metadata.get("shop") or integration.account_id
    if not shop.endswith(".myshopify.com"):
        shop = f"{shop}.myshopify.com"

    base_url = f"https://{shop}/admin/api/2024-01"
    headers = {
        "X-Shopify-Access-Token": integration.access_token,
        "Content-Type": "application/json",
    }

    # Get Saudi products only
    print("Fetching Saudi products...")
    response = httpx.get(f"{base_url}/products.json?limit=50", headers=headers, timeout=30)
    all_products = response.json()["products"]
    products = [p for p in all_products if p["id"] in SAUDI_PRODUCT_IDS]
    print(f"Found {len(products)} Saudi products")

    if not products:
        print("No Saudi products found!")
        return

    # Create orders spread across last 14 days
    now = timezone.now()
    orders_created = 0
    target_orders = 30

    print(f"\nCreating {target_orders} orders across 14 days...")
    print("(This will take about 15-20 minutes due to rate limits)\n")

    for days_ago in range(14, -1, -1):
        order_date = now - timedelta(days=days_ago)

        # 2-3 orders per day
        num_orders = random.randint(2, 3)

        for i in range(num_orders):
            if orders_created >= target_orders:
                break

            order_time = order_date.replace(
                hour=random.randint(9, 22),
                minute=random.randint(0, 59),
            )

            order = create_order(base_url, headers, products, order_time)
            if order:
                orders_created += 1
                print(f"✓ [{orders_created}/{target_orders}] Order #{order['order_number']} - {order['total_price']} SAR ({order_time.strftime('%m/%d')})")

                # Wait between orders to avoid rate limits
                time.sleep(5)

        if orders_created >= target_orders:
            break

    print(f"\n✅ Created {orders_created} orders!")
    print("Run sync_orders_for_integration() to sync to dashboard")


if __name__ == "__main__":
    main()
else:
    main()
