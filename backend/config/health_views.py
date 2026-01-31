from django.http import JsonResponse
from django.db import connection


def simple_health_check(request):
    """Simple health check endpoint."""
    return JsonResponse({"status": "ok"})


def detailed_health_check(request):
    """Detailed health check with service status."""
    services = {
        "database": check_database(),
        "cache": check_cache(),
    }
    all_healthy = all(s["status"] == "healthy" for s in services.values())
    return JsonResponse(
        {
            "status": "healthy" if all_healthy else "unhealthy",
            "services": services,
        },
        status=200 if all_healthy else 503,
    )


def readiness_check(request):
    """Readiness probe for Kubernetes."""
    try:
        check_database()
        return JsonResponse({"status": "ready"})
    except Exception as e:
        return JsonResponse({"status": "not ready", "error": str(e)}, status=503)


def liveness_check(request):
    """Liveness probe for Kubernetes."""
    return JsonResponse({"status": "alive"})


def check_database():
    """Check database connectivity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


def check_cache():
    """Check cache connectivity."""
    try:
        from django.core.cache import cache

        cache.set("health_check", "ok", 1)
        result = cache.get("health_check")
        if result == "ok":
            return {"status": "healthy"}
        return {"status": "unhealthy", "error": "Cache read/write failed"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
