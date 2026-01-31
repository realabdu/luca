# Luca Infrastructure Documentation

## Overview

Luca uses a simple two-server architecture on Hetzner Cloud with automated CI/CD via GitHub Actions.

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   (Frontend)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ api.lucaserv.com│
                    └────────┬────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│ Hetzner Cloud (eu-central) │                            │
│                            │                            │
│  ┌─────────────────────────▼─────────────────────────┐  │
│  │         luca-backend (167.235.235.243)            │  │
│  │                                                   │  │
│  │  ┌─────────┐  ┌────────┐  ┌────────┐  ┌───────┐  │  │
│  │  │ Traefik │  │ Django │  │ Celery │  │ Redis │  │  │
│  │  │ (SSL)   │  │        │  │ Worker │  │       │  │  │
│  │  └─────────┘  └────────┘  └────────┘  └───────┘  │  │
│  │                                                   │  │
│  │  ┌─────────┐  ┌────────┐                         │  │
│  │  │ Celery  │  │ Flower │                         │  │
│  │  │  Beat   │  │ (5555) │                         │  │
│  │  └─────────┘  └────────┘                         │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │                              │
│  ┌───────────────────────▼───────────────────────────┐  │
│  │           luca-db (167.235.244.254)               │  │
│  │                                                   │  │
│  │  ┌──────────────┐                                 │  │
│  │  │ PostgreSQL 16│                                 │  │
│  │  └──────────────┘                                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            Hetzner Object Storage (fsn1)                │
│                                                         │
│  Bucket: luca-os                                        │
│  - /static/  (Django static files)                      │
│  - /media/   (User uploads)                             │
└─────────────────────────────────────────────────────────┘
```

---

## Servers

### luca-backend (167.235.235.243)

| Attribute | Value |
|-----------|-------|
| Type | cax11 (ARM) |
| vCPU | 2 |
| RAM | 4 GB |
| Storage | 40 GB SSD |
| OS | Ubuntu 24.04 LTS |
| Location | fsn1 (Falkenstein, Germany) |
| Cost | €3.99/month |

**Services running:**
- Traefik (reverse proxy, SSL termination)
- Django (Gunicorn on port 5000)
- Celery Worker
- Celery Beat (scheduler)
- Flower (Celery monitoring on port 5555)
- Redis 7

### luca-db (167.235.244.254)

| Attribute | Value |
|-----------|-------|
| Type | cax11 (ARM) |
| vCPU | 2 |
| RAM | 4 GB |
| Storage | 40 GB SSD |
| OS | Ubuntu 24.04 LTS |
| Location | fsn1 (Falkenstein, Germany) |
| Cost | €3.99/month |

**Services running:**
- PostgreSQL 16

---

## Object Storage

| Attribute | Value |
|-----------|-------|
| Provider | Hetzner Object Storage |
| Bucket | luca-os |
| Region | fsn1 |
| Endpoint | https://fsn1.your-objectstorage.com |
| Cost | ~€1-2/month (usage-based) |

**Usage:**
- Static files: `https://fsn1.your-objectstorage.com/luca-os/static/`
- Media uploads: `https://fsn1.your-objectstorage.com/luca-os/media/`

---

## URLs

| Service | URL |
|---------|-----|
| API | https://api.lucaserv.com |
| Health Check | https://api.lucaserv.com/api/health/ |
| Detailed Health | https://api.lucaserv.com/api/health/detailed/ |
| Django Admin | https://api.lucaserv.com/admin/ |
| Flower (Celery) | https://flower.lucaserv.com:5555 |

---

## DNS Configuration

| Type | Name | Value |
|------|------|-------|
| A | api | 167.235.235.243 |
| A | flower | 167.235.235.243 |

---

## CI/CD Pipeline

### Trigger
Any push to `master` branch with changes in `backend/**`

### Workflow Location
`.github/workflows/deploy-backend.yml`

### Steps
1. SSH into luca-backend server
2. `git pull origin master`
3. `docker compose build django`
4. `docker compose up -d --force-recreate`
5. `python manage.py migrate`
6. `python manage.py collectstatic`

### GitHub Secrets Required
| Secret | Description |
|--------|-------------|
| `HETZNER_BACKEND_IP` | 167.235.235.243 |
| `HETZNER_SSH_PRIVATE_KEY` | SSH private key (ed25519) |

---

## Credentials & Secrets

### Django Admin
- Email: abdullah@lucaserv.com
- Password: LucaAdmin2024!

### Flower (Celery Monitoring)
- Username: admin
- Password: TcHTkjYzKz6gbQTLggp1Dit53mIEKhxt

### Database
- Host: 167.235.244.254
- Port: 5432
- Database: luca
- User: luca
- Password: LucaDb2024SecurePass!

### Hetzner Object Storage (S3)
- Access Key: EWTP14TZKN6PL7AAJWWZ
- Secret Key: TDGTSK8Xr1rQ5mG9MRg8qgvAZ3X9fGYid0Rk8JC5
- Endpoint: https://fsn1.your-objectstorage.com
- Bucket: luca-os

### Clerk Authentication
- Domain: set-calf-77.clerk.accounts.dev
- Secret Key: (in .envs/.production/.django)

---

## File Locations

### On Server (luca-backend)
```
/app/luca/
├── backend/
│   ├── .envs/.production/.django    # Environment variables
│   ├── docker-compose.production.yml
│   ├── compose/production/          # Docker configs
│   └── ...
```

### Local Repository
```
luca/
├── .github/workflows/
│   └── deploy-backend.yml           # CI/CD workflow
├── backend/
│   ├── .envs/.production/.django    # Env template
│   ├── config/settings/
│   │   └── production.py            # Production settings
│   └── ...
├── frontend/                         # Cloudflare deployment
└── INFRASTRUCTURE.md                 # This file
```

---

## Monthly Costs

| Resource | Cost |
|----------|------|
| luca-backend (cax11) | €3.99 |
| luca-db (cax11) | €3.99 |
| Object Storage | ~€1-2 |
| **Total** | **~€10/month** |

---

## Architectural Decisions

### Why Hetzner?
- Cost-effective (€10/month vs €50+ on AWS/GCP)
- European data centers (GDPR compliance)
- Simple pricing, no surprises
- ARM servers (cax11) offer great price/performance

### Why ARM (cax11)?
- 50% cheaper than x86 equivalents
- Same performance for web workloads
- Docker supports ARM natively

### Why Separate DB Server?
- Isolation for security
- Independent scaling
- Easier backups and maintenance
- Can migrate to managed DB later (Autobase)

### Why Traefik?
- Automatic Let's Encrypt SSL certificates
- Simple Docker integration
- No nginx configuration needed
- Built-in load balancing ready

### Why Object Storage for Static/Media?
- Offloads bandwidth from server
- CDN-ready
- Persistent storage (survives container restarts)
- Cost-effective for large files

### Why GitHub Actions?
- Free for public repos
- Integrated with GitHub
- Simple YAML configuration
- No separate CI server needed

---

## Common Operations

### SSH into Backend Server
```bash
ssh root@167.235.235.243
```

### SSH into Database Server
```bash
ssh root@167.235.244.254
```

### View Logs
```bash
cd /app/luca/backend
docker compose -f docker-compose.production.yml logs -f django
docker compose -f docker-compose.production.yml logs -f celeryworker
```

### Restart Services
```bash
cd /app/luca/backend
docker compose -f docker-compose.production.yml restart django
```

### Run Migrations Manually
```bash
cd /app/luca/backend
docker compose -f docker-compose.production.yml exec django python manage.py migrate
```

### Django Shell
```bash
cd /app/luca/backend
docker compose -f docker-compose.production.yml exec django python manage.py shell
```

### Check Container Status
```bash
cd /app/luca/backend
docker compose -f docker-compose.production.yml ps
```

---

## Troubleshooting

### API Returns 502
1. Check if Django is running: `docker compose ps`
2. Check Django logs: `docker compose logs django`
3. Restart Django: `docker compose restart django`

### Database Connection Error
1. Check PostgreSQL: `ssh root@167.235.244.254 "systemctl status postgresql"`
2. Verify connectivity: `telnet 167.235.244.254 5432`

### SSL Certificate Issues
1. Check Traefik logs: `docker compose logs traefik`
2. Restart Traefik: `docker compose restart traefik`
3. Certificates auto-renew via Let's Encrypt

### CI/CD Failing
1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. Test SSH manually: `ssh root@167.235.235.243`

---

## Future Improvements

- [ ] Set up Autobase for PostgreSQL (HA, automated backups)
- [ ] Add monitoring (Netdata or Prometheus)
- [ ] Configure log aggregation
- [ ] Set up staging environment
- [ ] Add database backups to Object Storage
- [ ] Configure alerting (Sentry, PagerDuty)
