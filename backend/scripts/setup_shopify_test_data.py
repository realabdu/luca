#!/usr/bin/env python
"""
Script to set up Shopify test data with Saudi e-commerce products.
Run with: python manage.py shell < scripts/setup_shopify_test_data.py
"""

import random
import time
from decimal import Decimal
from datetime import datetime, timedelta

import httpx
from django.utils import timezone

from apps.integrations.models import Integration
from apps.orders.models import Order


def get_shopify_client(integration):
    """Get authenticated httpx client for Shopify."""
    shop = integration.metadata.get("shop") or integration.account_id
    if not shop.endswith(".myshopify.com"):
        shop = f"{shop}.myshopify.com"

    base_url = f"https://{shop}/admin/api/2024-01"
    headers = {
        "X-Shopify-Access-Token": integration.access_token,
        "Content-Type": "application/json",
    }
    return base_url, headers


# Saudi e-commerce products
PRODUCTS = [
    {
        "title": "عباية سوداء فاخرة",
        "title_en": "Luxury Black Abaya",
        "body_html": "<p>عباية سوداء أنيقة مصنوعة من أجود أنواع الأقمشة</p>",
        "vendor": "Luca Fashion",
        "product_type": "Abayas",
        "variants": [{"price": "450.00", "sku": "ABA-001"}],
    },
    {
        "title": "عباية مطرزة",
        "title_en": "Embroidered Abaya",
        "body_html": "<p>عباية مطرزة بتصميم عصري</p>",
        "vendor": "Luca Fashion",
        "product_type": "Abayas",
        "variants": [{"price": "650.00", "sku": "ABA-002"}],
    },
    {
        "title": "عباية كاجوال",
        "title_en": "Casual Abaya",
        "body_html": "<p>عباية يومية مريحة</p>",
        "vendor": "Luca Fashion",
        "product_type": "Abayas",
        "variants": [{"price": "350.00", "sku": "ABA-003"}],
    },
    {
        "title": "ثوب رجالي أبيض",
        "title_en": "White Men's Thobe",
        "body_html": "<p>ثوب رجالي أبيض من القطن الفاخر</p>",
        "vendor": "Luca Fashion",
        "product_type": "Thobes",
        "variants": [{"price": "280.00", "sku": "THB-001"}],
    },
    {
        "title": "ثوب رجالي رمادي",
        "title_en": "Grey Men's Thobe",
        "body_html": "<p>ثوب رجالي رمادي عصري</p>",
        "vendor": "Luca Fashion",
        "product_type": "Thobes",
        "variants": [{"price": "320.00", "sku": "THB-002"}],
    },
    {
        "title": "عطر عود فاخر",
        "title_en": "Luxury Oud Perfume",
        "body_html": "<p>عطر عود طبيعي فاخر</p>",
        "vendor": "Luca Fragrances",
        "product_type": "Perfumes",
        "variants": [{"price": "550.00", "sku": "PRF-001"}],
    },
    {
        "title": "بخور عود كمبودي",
        "title_en": "Cambodian Oud Incense",
        "body_html": "<p>بخور عود كمبودي أصلي</p>",
        "vendor": "Luca Fragrances",
        "product_type": "Incense",
        "variants": [{"price": "180.00", "sku": "BKH-001"}],
    },
    {
        "title": "شماغ أحمر",
        "title_en": "Red Shemagh",
        "body_html": "<p>شماغ أحمر تقليدي</p>",
        "vendor": "Luca Fashion",
        "product_type": "Accessories",
        "variants": [{"price": "120.00", "sku": "SHM-001"}],
    },
    {
        "title": "غترة بيضاء",
        "title_en": "White Ghutra",
        "body_html": "<p>غترة بيضاء فاخرة</p>",
        "vendor": "Luca Fashion",
        "product_type": "Accessories",
        "variants": [{"price": "85.00", "sku": "GHT-001"}],
    },
    {
        "title": "عقال أسود",
        "title_en": "Black Agal",
        "body_html": "<p>عقال أسود تقليدي</p>",
        "vendor": "Luca Fashion",
        "product_type": "Accessories",
        "variants": [{"price": "75.00", "sku": "AGL-001"}],
    },
]

# Saudi names for customers
FIRST_NAMES = ["محمد", "عبدالله", "فهد", "سلطان", "خالد", "سعود", "نواف", "تركي", "أحمد", "عمر"]
LAST_NAMES = ["الشمري", "العتيبي", "القحطاني", "الدوسري", "الحربي", "المطيري", "السبيعي", "الزهراني", "الغامدي", "البلوي"]
FEMALE_NAMES = ["نورة", "سارة", "لمى", "هيفاء", "ريم", "دلال", "منال", "أمل", "هند", "عهود"]

# Saudi cities
CITIES = [
    {"city": "الرياض", "province": "الرياض", "zip": "12345"},
    {"city": "جدة", "province": "مكة المكرمة", "zip": "21442"},
    {"city": "الدمام", "province": "المنطقة الشرقية", "zip": "31411"},
    {"city": "مكة المكرمة", "province": "مكة المكرمة", "zip": "24231"},
    {"city": "المدينة المنورة", "province": "المدينة المنورة", "zip": "42311"},
    {"city": "الخبر", "province": "المنطقة الشرقية", "zip": "31952"},
    {"city": "الطائف", "province": "مكة المكرمة", "zip": "21944"},
    {"city": "بريدة", "province": "القصيم", "zip": "51411"},
]


def create_products(base_url, headers):
    """Create products in Shopify."""
    created_products = []

    for product_data in PRODUCTS:
        payload = {
            "product": {
                "title": product_data["title"],
                "body_html": product_data["body_html"],
                "vendor": product_data["vendor"],
                "product_type": product_data["product_type"],
                "status": "active",
                "variants": product_data["variants"],
            }
        }

        response = httpx.post(
            f"{base_url}/products.json",
            headers=headers,
            json=payload,
            timeout=30,
        )

        if response.status_code == 201:
            product = response.json()["product"]
            created_products.append(product)
            print(f"✓ Created product: {product_data['title_en']} (ID: {product['id']})")
        else:
            print(f"✗ Failed to create {product_data['title_en']}: {response.status_code} - {response.text}")

    return created_products


def generate_customer():
    """Generate a random Saudi customer."""
    is_female = random.random() > 0.4  # 60% female customers (abayas target)

    if is_female:
        first_name = random.choice(FEMALE_NAMES)
    else:
        first_name = random.choice(FIRST_NAMES)

    last_name = random.choice(LAST_NAMES)
    city_data = random.choice(CITIES)

    email = f"{first_name.replace(' ', '')}_{random.randint(100, 999)}@example.com"
    phone = f"+9665{random.randint(10000000, 99999999)}"

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "address1": f"شارع الملك فهد، حي {random.choice(['النزهة', 'الروضة', 'السليمانية', 'الملز', 'العليا'])}",
        "city": city_data["city"],
        "province": city_data["province"],
        "zip": city_data["zip"],
        "country": "Saudi Arabia",
        "country_code": "SA",
    }


def create_order(base_url, headers, products, order_date, max_retries=5):
    """Create a single order with random products."""
    # Select 1-4 random products
    num_products = random.randint(1, 4)
    selected_products = random.sample(products, min(num_products, len(products)))

    customer = generate_customer()

    line_items = []
    for product in selected_products:
        variant = product["variants"][0]
        quantity = random.randint(1, 3)
        line_items.append({
            "variant_id": variant["id"],
            "quantity": quantity,
        })

    # Create order payload
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
            order = response.json()["order"]
            return order
        elif response.status_code == 429:
            # Rate limited - wait and retry
            wait_time = 60 + (attempt * 30)  # 60s, 90s, 120s, etc.
            print(f"  ⏳ Rate limited, waiting {wait_time}s before retry {attempt + 1}/{max_retries}...")
            time.sleep(wait_time)
        else:
            print(f"✗ Failed to create order: {response.status_code} - {response.text}")
            return None

    print(f"✗ Failed to create order after {max_retries} retries")
    return None


def clean_local_orders(organization):
    """Delete local orders that are in USD."""
    deleted = Order.objects.filter(
        organization=organization,
        source="shopify",
        currency="USD"
    ).delete()
    print(f"Deleted {deleted[0]} USD orders from local database")


def main():
    # Get Shopify integration
    integration = Integration.objects.filter(platform="shopify", is_connected=True).first()

    if not integration:
        print("No connected Shopify integration found!")
        return

    print(f"Using integration: {integration.account_name} (Org: {integration.organization.name})")

    base_url, headers = get_shopify_client(integration)

    # Step 1: Clean local USD orders
    print("\n=== Cleaning Local USD Orders ===")
    clean_local_orders(integration.organization)

    # Step 2: Create products
    print("\n=== Creating Products ===")
    products = create_products(base_url, headers)

    if not products:
        print("No products created, cannot create orders!")
        return

    # Step 3: Create orders over the last 14 days (reduced to avoid rate limits on dev stores)
    print("\n=== Creating Orders ===")
    print("Note: Adding delays between orders to avoid Shopify rate limits on development stores")
    now = timezone.now()
    orders_created = 0

    for days_ago in range(14, -1, -1):
        order_date = now - timedelta(days=days_ago)

        # Create 2-3 orders per day (reduced for rate limit compliance)
        num_orders = random.randint(2, 3)

        print(f"\n--- {order_date.strftime('%Y-%m-%d')} ({num_orders} orders) ---")

        for _ in range(num_orders):
            # Randomize time within the day
            order_time = order_date.replace(
                hour=random.randint(8, 23),
                minute=random.randint(0, 59),
                second=random.randint(0, 59),
            )

            order = create_order(base_url, headers, products, order_time)
            if order:
                orders_created += 1
                print(f"✓ Order #{order['order_number']} - {order['total_price']} SAR")
                # Wait 3 seconds between orders to avoid rate limits
                time.sleep(3)

    print(f"\n=== Summary ===")
    print(f"Products created: {len(products)}")
    print(f"Orders created: {orders_created}")
    print("\nNow run: sync_orders_for_integration task to sync these to the dashboard!")


if __name__ == "__main__":
    main()
else:
    # When run via manage.py shell
    main()
