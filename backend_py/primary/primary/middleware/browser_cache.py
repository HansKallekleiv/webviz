from functools import wraps
from fastapi.responses import Response, JSONResponse
from fastapi.encoders import jsonable_encoder
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request


def custom_browser_cache_time(max_age: int):
    """Override default cache time for a specific route."""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            response = await func(*args, **kwargs)
            if not isinstance(response, Response):
                response = JSONResponse(jsonable_encoder(response))
            response.headers["cache-control"] = f"max-age={max_age}"
            return response

        return wrapper

    return decorator


class BrowserCacheMiddleware(BaseHTTPMiddleware):
    """Set default cache time for all routes."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        if response.headers.get("cache-control") is None and request.method == "GET":
            response.headers["cache-control"] = "max-age=3600"

        return response
