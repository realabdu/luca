# Luca - Marketing Attribution Platform

AI-powered marketing analytics for Saudi e-commerce.

## Project Structure

```
luca/
├── backend/                    # Django REST API
│   ├── apps/
│   │   ├── accounts/           # Organizations, users, memberships, API keys
│   │   ├── integrations/       # Platform integrations, OAuth, sync
│   │   ├── campaigns/          # Campaign data from ad platforms
│   │   ├── analytics/          # Daily metrics, performance data
│   │   ├── attribution/        # Pixel events, click tracking
│   │   ├── orders/             # E-commerce orders
│   │   └── core/               # Base models, Clerk auth, encryption
│   ├── config/
│   │   ├── settings/           # Django settings (base, local, production)
│   │   ├── celery_app.py       # Celery configuration
│   │   ├── urls.py             # URL routing
│   │   └── api_router.py       # DRF router
│   ├── compose/                # Docker configs
│   ├── requirements/           # Python dependencies
│   └── manage.py
├── frontend/                   # Next.js frontend
│   ├── app/                    # Next.js app router pages
│   ├── components/             # React components
│   ├── lib/                    # Utilities and API client
│   └── types/                  # TypeScript types
├── docker-compose.yml          # Development stack
└── Makefile                    # Development commands
```

## Prerequisites

- Docker and Docker Compose
- Node.js 20+
- Python 3.12+

## Quick Start

1. **Clone and setup environment:**
   ```bash
   git clone <repo-url>
   cd luca
   make setup
   ```

2. **Configure environment variables:**

   Backend (`backend/.env`):
   - `CLERK_DOMAIN` - Your Clerk domain
   - `CLERK_SECRET_KEY` - Your Clerk secret key
   - `ENCRYPTION_KEY` - Key for encrypting OAuth tokens

   Frontend (`frontend/.env.local`):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
   - `CLERK_SECRET_KEY` - Clerk secret key
   - `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000)

3. **Start development:**
   ```bash
   make dev
   ```

   This starts:
   - Django API at http://localhost:8000
   - Next.js frontend at http://localhost:3000
   - PostgreSQL at localhost:5432
   - Redis at localhost:6379
   - Celery worker and beat
   - Flower (Celery monitoring) at http://localhost:5555

## Development Commands

```bash
# Docker
make up              # Start all services
make down            # Stop all services
make logs            # View logs
make build           # Rebuild images

# Backend
make shell           # Django shell
make migrate         # Run migrations
make makemigrations  # Create migrations
make createsuperuser # Create admin user
make test            # Run tests

# Frontend
make frontend-dev    # Start frontend dev server
make frontend-build  # Build frontend
```

## API Documentation

When running locally, visit:
- Swagger UI: http://localhost:8000/api/docs/
- API Schema: http://localhost:8000/api/schema/

## Key Technologies

### Backend
- Django 5.1 + Django REST Framework
- Celery + Redis (background tasks)
- PostgreSQL (database)
- PyJWT (Clerk token validation)

### Frontend
- Next.js 14 (App Router)
- Clerk (authentication)
- SWR (data fetching)
- Tailwind CSS

## Authentication

The app uses Clerk for authentication:
1. Frontend authenticates with Clerk
2. JWT tokens are sent to Django API
3. Django validates tokens against Clerk's JWKS
4. User/organization context is extracted from token claims

## Integrations

Supported platforms:
- **E-commerce:** Salla, Shopify
- **Ad Platforms:** Meta, Google, TikTok, Snapchat

OAuth flows are handled through the Django backend with encrypted token storage.

## License

Proprietary - All rights reserved.
