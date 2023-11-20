import logging
import traceback

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


logger = logging.getLogger("backend_primary")


class SumoException(Exception):
    def __init__(self, message: any = ""):
        super().__init__(message)
        self.message = message


def add_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(SumoException)
    async def handle_sumo_exception(request: Request, e: SumoException) -> JSONResponse:
        logger.exception(
            "",
            extra={
                "exception_name": "SumoException",
                "error_message": e.message,
                "traceback": traceback.format_exc(),
            },
        )
        return JSONResponse(e.message, status_code=status.HTTP_400_BAD_REQUEST)
