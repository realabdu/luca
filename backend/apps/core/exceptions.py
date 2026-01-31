"""Custom exception handling."""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Custom exception handler for DRF."""
    response = exception_handler(exc, context)

    if response is not None:
        # Add error code to response
        response.data["status_code"] = response.status_code

        # Standardize error format
        if "detail" in response.data:
            response.data["message"] = response.data.pop("detail")

        if "non_field_errors" in response.data:
            errors = response.data.pop("non_field_errors")
            if errors:
                response.data["message"] = errors[0]

    return response


class APIException(Exception):
    """Base API exception."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_message = "An error occurred"

    def __init__(self, message=None, status_code=None):
        self.message = message or self.default_message
        if status_code:
            self.status_code = status_code


class NotFoundError(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_message = "Resource not found"


class ValidationError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "Validation error"


class AuthenticationError(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_message = "Authentication required"


class PermissionError(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_message = "Permission denied"
