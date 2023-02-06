import base64
from typing import List

import starsessions
from fastapi import Request, Response
from fastapi.responses import PlainTextResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from .auth_helper import AuthHelper


class EnforceLoggedInMiddleware(BaseHTTPMiddleware):
    """Middleware to enforces that the user is logged in

    By default, all paths except `/login` and `/auth-callback` are protected.

    Additional paths can be left unprotected by specifying them in `unprotected_paths`

    By default all protected paths will return status code 401 if user is not logged in,
    but the `paths_redirected_to_login` can be used to specify a list of paths that
    should cause redirect to the `/login` endpoint instead.
    """

    def __init__(self, app, unprotected_paths: List[str] = [], paths_redirected_to_login: List[str] = []):
        super().__init__(app)
        self._unprotected_paths = unprotected_paths
        self._paths_redirected_to_login = paths_redirected_to_login

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        print("##################################### ensure_logged_in")
        print(f"##### {request.url.path=}")

        path_is_protected = True
        if request.url.path in ["/login", "/auth-callback"] + self._unprotected_paths:
            path_is_protected = False
            print(f"##### path not protected: {request.url.path=}")

        if path_is_protected:
            print(f"##### path requires login:  {request.url.path=}")
            await starsessions.load_session(request)

            authenticated_user = AuthHelper.get_authenticated_user(request)
            is_logged_in = authenticated_user is not None
            print(f"##### {is_logged_in=}")

            if not is_logged_in:
                if request.url.path in self._paths_redirected_to_login:
                    print("##### LOGGING IN USING REDIRECT")
                    target_url_b64 = base64.urlsafe_b64encode(str(request.url).encode()).decode()
                    return RedirectResponse(f"/login?redirect_url_after_login={target_url_b64}")
                else:
                    return PlainTextResponse("Not authorized yet, must log in", 401)

        response = await call_next(request)

        return response