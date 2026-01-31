.PHONY: help dev services-up services-down backend-dev frontend-dev migrate makemigrations shell test lint format prod-up prod-down setup

# Default target
help:
	@echo "Luca Development Commands"
	@echo ""
	@echo "Local Development:"
	@echo "  dev             - Start everything (DB, Django, Next.js)"
	@echo "  services-up     - Start PostgreSQL and Redis only"
	@echo "  services-down   - Stop PostgreSQL and Redis"
	@echo "  backend-dev     - Run Django only"
	@echo "  frontend-dev    - Run Next.js only"
	@echo ""
	@echo "Database:"
	@echo "  migrate         - Run database migrations"
	@echo "  makemigrations  - Create new migrations"
	@echo "  shell           - Open Django shell"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  test            - Run backend tests"
	@echo "  lint            - Run linters"
	@echo "  format          - Format code"
	@echo ""
	@echo "Production:"
	@echo "  prod-up         - Start production stack (Docker)"
	@echo "  prod-down       - Stop production stack"
	@echo ""
	@echo "Setup:"
	@echo "  setup           - Initial project setup"

# =============================================================================
# Local Development
# =============================================================================

services-up:
	cd backend && docker-compose up -d
	@echo "PostgreSQL running at localhost:5432"
	@echo "Redis running at localhost:6379"

services-down:
	cd backend && docker-compose down

backend-dev:
	cd backend && python manage.py runserver

frontend-dev:
	cd frontend && npm run dev

# Run everything with one command
dev:
	./scripts/dev.sh

# =============================================================================
# Database
# =============================================================================

migrate:
	cd backend && python manage.py migrate

makemigrations:
	cd backend && python manage.py makemigrations

shell:
	cd backend && python manage.py shell_plus

createsuperuser:
	cd backend && python manage.py createsuperuser

# =============================================================================
# Testing & Quality
# =============================================================================

test:
	cd backend && pytest

lint:
	cd backend && ruff check .

format:
	cd backend && ruff format .

# =============================================================================
# Production
# =============================================================================

prod-build:
	cd backend && docker-compose -f docker-compose.prod.yml build

prod-up:
	cd backend && docker-compose -f docker-compose.prod.yml up -d

prod-down:
	cd backend && docker-compose -f docker-compose.prod.yml down

prod-logs:
	cd backend && docker-compose -f docker-compose.prod.yml logs -f

# =============================================================================
# Setup
# =============================================================================

setup:
	@echo "Setting up Luca development environment..."
	@echo ""
	@echo "1. Copying environment files..."
	cp backend/.env.example backend/.env 2>/dev/null || true
	cp frontend/.env.local.example frontend/.env.local 2>/dev/null || true
	@echo ""
	@echo "2. Installing backend dependencies..."
	cd backend && pip install -r requirements/local.txt
	@echo ""
	@echo "3. Installing frontend dependencies..."
	cd frontend && npm install
	@echo ""
	@echo "4. Starting PostgreSQL and Redis..."
	cd backend && docker-compose up -d
	@echo ""
	@echo "5. Waiting for database..."
	sleep 3
	@echo ""
	@echo "6. Running migrations..."
	cd backend && python manage.py migrate
	@echo ""
	@echo "Setup complete!"
	@echo "Run 'make dev' to start development."
