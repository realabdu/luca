#!/bin/bash

# Luca Development Script
# Starts PostgreSQL, Redis, Django, and Next.js with a single command

set -e

# Get the project root directory (parent of scripts/)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Luca development environment...${NC}"
echo ""

# Kill any existing processes on our ports
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "Killing existing processes on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
}

kill_port 8000
kill_port 3000

# Start Docker services
echo -e "${GREEN}Starting PostgreSQL and Redis...${NC}"
docker-compose -f "$PROJECT_ROOT/backend/docker-compose.yml" up -d
echo "PostgreSQL: localhost:5433 | Redis: localhost:6379"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${BLUE}Shutting down...${NC}"
    kill $DJANGO_PID 2>/dev/null || true
    kill $NEXTJS_PID 2>/dev/null || true
    docker-compose -f "$PROJECT_ROOT/backend/docker-compose.yml" down
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Start Django backend
echo -e "${GREEN}Starting Django backend (http://localhost:8000)...${NC}"
(cd "$PROJECT_ROOT/backend" && python manage.py runserver) &
DJANGO_PID=$!

# Give Django a moment to start
sleep 2

# Start Next.js frontend
echo -e "${GREEN}Starting Next.js frontend (http://localhost:3000)...${NC}"
(cd "$PROJECT_ROOT/frontend" && npm run dev) &
NEXTJS_PID=$!

echo ""
echo -e "${BLUE}Development environment is running!${NC}"
echo "  Django:  http://localhost:8000"
echo "  Next.js: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for any process to exit
wait
