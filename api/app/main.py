import uvicorn
from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic_core import ValidationError as CoreValidationError

from app.auth.infrastructure.adapter.inbound.api import router as auth_api_router
from app.bible.infrastructure.adapter.inbound.api.router import router as bible_api_router
from app.powerpoint.infrastructure.adapter.inbound.api import router as powerpoint_api_router
from app.song.infrastructure.adapter.inbound.api import router as song_api_router
from app.user.infrastructure.adapter.inbound.api import router as user_api_router

app: FastAPI = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_api_router, prefix="/auth")
app.include_router(bible_api_router, prefix="/bible")
app.include_router(song_api_router, prefix="/song")
app.include_router(user_api_router, prefix="/user")
app.include_router(powerpoint_api_router, prefix="/powerpoint")


@app.exception_handler(RequestValidationError)
async def handle_request_validation_error(request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content=exc.errors(),
    )


@app.exception_handler(CoreValidationError)
async def handle_core_validation_error(request, exc: CoreValidationError):
    return JSONResponse(
        status_code=422,
        content=jsonable_encoder({"detail": exc.errors()}),
    )


if __name__ == "__main__":
    uvicorn.run(app="app.main:app", host="127.0.0.1", port=8000, reload=True)
