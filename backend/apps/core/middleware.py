"""Clerk Authentication Middleware."""

import logging

logger = logging.getLogger(__name__)


class ClerkAuthMiddleware:
    """
    Middleware to handle Clerk authentication.

    This middleware ensures the organization context is available
    throughout the request lifecycle.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Initialize organization attribute
        if not hasattr(request, "organization"):
            request.organization = None

        response = self.get_response(request)
        return response
