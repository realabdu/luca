# Shopify Integration State

> Last updated: February 1, 2026

## Overview

The Shopify integration for Luca allows connecting to Shopify stores via OAuth to fetch order, product, and customer data for marketing attribution analysis.

---

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Shopify App Created | ✅ Complete | App name: "luca insights" |
| OAuth Credentials | ✅ Configured | In `backend/.env` |
| Redirect URL | ✅ Configured | `http://localhost:8000/api/v1/integrations/shopify/callback/` |
| API Scopes | ✅ Configured | `read_orders, read_products, read_customers` |
| Backend OAuth Flow | ✅ Implemented | `apps/integrations/oauth_views.py`, `apps/integrations/services/oauth.py` |
| Webhook Handlers | ✅ Implemented | `apps/orders/webhooks.py` |
| Webhook Subscriptions | ❌ Not Active | Requires protected customer data approval |

---

## Credentials

### Shopify App (Partner Dashboard)

- **App Name**: luca insights
- **Client ID**: See `backend/.env`
- **Client Secret**: See `backend/.env`
- **Dashboard URL**: https://dev.shopify.com/dashboard (login required)

### Environment Variables (`backend/.env`)

```bash
SHOPIFY_CLIENT_ID=<from-partner-dashboard>
SHOPIFY_CLIENT_SECRET=<from-partner-dashboard>
SHOPIFY_WEBHOOK_SECRET=  # Empty - webhooks not active
```

---

## App Configuration

The Shopify CLI configuration is stored in `luca-insights/shopify.app.toml`:

```toml
client_id = "6d6eee3e88372d44defdc0fa5c912ea0"
name = "luca insights"
application_url = "http://localhost:3000"
embedded = false

[build]
automatically_update_urls_on_dev = false

[webhooks]
api_version = "2026-04"

[access_scopes]
scopes = "read_orders,read_products,read_customers"

[auth]
redirect_urls = [
  "http://localhost:8000/api/v1/integrations/shopify/callback/"
]
```

---

## API Endpoints

### OAuth Flow

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations/shopify/connect/?shop=STORE_NAME` | GET | Initiates OAuth flow |
| `/api/v1/integrations/shopify/callback/` | GET | OAuth callback (handles token exchange) |

### Webhooks (Not Active)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/webhooks/shopify/` | POST | Receives Shopify webhook events |

---

## Backend Implementation

### Files

| File | Purpose |
|------|---------|
| `apps/integrations/services/oauth.py` | OAuth service with Shopify configuration |
| `apps/integrations/oauth_views.py` | OAuth connect and callback views |
| `apps/integrations/urls.py` | URL routing for OAuth endpoints |
| `apps/orders/webhooks.py` | `ShopifyWebhookView` for processing order events |
| `apps/orders/webhook_urls.py` | URL routing for webhooks |
| `config/settings/base.py` | Environment variable loading |

### OAuth Scopes

- `read_orders` - Access to order data
- `read_products` - Access to product catalog
- `read_customers` - Access to customer information

---

## Development Store

A Shopify development store is required for testing. Create one in the Partner Dashboard:

1. Go to https://partners.shopify.com
2. Navigate to **Stores** → **Add store**
3. Select **Development store**
4. Choose **"Create a store to test and build"**

---

## Testing the Integration

### Prerequisites

1. Development store created in Partner Dashboard
2. Backend running: `cd backend && python manage.py runserver`
3. Frontend running: `cd frontend && npm run dev`

### OAuth Flow Test

1. Navigate to Integrations page in the frontend
2. Click "Connect Shopify"
3. Enter your development store name (e.g., `my-dev-store`)
4. Approve permissions on Shopify
5. Verify redirect back with `?connected=shopify`

### Verify Connection

```python
# In Django shell
python manage.py shell
>>> from apps.integrations.models import Integration
>>> Integration.objects.filter(platform='shopify')
```

---

## Webhooks (Future)

### Why Webhooks Are Not Active

Shopify order webhooks contain protected customer data. To subscribe to these webhooks, the app must:

1. Request "Protected customer data" access in Partner Dashboard
2. Provide a valid privacy policy URL
3. Get approval from Shopify

### Webhook Topics (When Enabled)

| Topic | Description |
|-------|-------------|
| `orders/create` | New order created |
| `orders/updated` | Order modified |
| `orders/paid` | Order payment completed |

### Enabling Webhooks

1. Go to Partner Dashboard → Apps → luca insights → API access
2. Request "Protected customer data" access
3. Once approved, update `shopify.app.toml`:

```toml
[[webhooks.subscriptions]]
topics = ["orders/create", "orders/updated", "orders/paid"]
uri = "https://YOUR-TUNNEL-URL/api/v1/webhooks/shopify/"
```

4. Deploy: `shopify app deploy --force`
5. Copy webhook signing secret to `SHOPIFY_WEBHOOK_SECRET` in `.env`

### Tunnel for Webhook Testing

Shopify requires HTTPS URLs for webhooks. Use ngrok or cloudflared:

```bash
# ngrok
ngrok http 8000

# cloudflared
cloudflared tunnel --url http://localhost:8000
```

---

## CLI Tools Installed

| Tool | Version | Purpose |
|------|---------|---------|
| Shopify CLI | 3.90.0 | App management and deployment |
| ngrok | - | HTTPS tunnel for webhooks |
| cloudflared | 2026.1.2 | Alternative HTTPS tunnel |

### Useful Commands

```bash
# Check Shopify CLI version
shopify version

# View app info
shopify app info

# Show environment variables
shopify app env show

# Deploy configuration changes
shopify app deploy --force

# Logout from Shopify
shopify auth logout
```

---

## Troubleshooting

### OAuth Redirect Fails

- Verify callback URL matches exactly in Partner Dashboard
- Check `API_URL` in `.env` matches the URL used for OAuth

### "App not approved for protected customer data"

- This is expected for webhook subscriptions
- Use API fetching instead, or request approval in Partner Dashboard

### Webhook Signature Verification Fails

- Ensure `SHOPIFY_WEBHOOK_SECRET` matches the signing secret from Partner Dashboard
- Check that the raw request body is used for HMAC calculation

---

## References

- [Shopify CLI Documentation](https://shopify.dev/docs/apps/build/cli-for-apps)
- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/build/authentication-authorization)
- [Protected Customer Data](https://shopify.dev/docs/apps/launch/protected-customer-data)
- [Webhook Configuration](https://shopify.dev/docs/apps/build/webhooks)
