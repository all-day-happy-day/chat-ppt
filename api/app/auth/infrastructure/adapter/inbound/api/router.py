import os
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Response, status
from ulid import ULID

from app.auth.application.usecase import (
    PatchPasswordUseCase,
    RefreshCredentialsUseCase,
    SignInUseCase,
    SignOutUseCase,
    SignUpUseCase,
    VerifyCredentialsUseCase,
    VerifyPasswordUseCase,
)
from app.auth.infrastructure.adapter.inbound.api.message import (
    GetCurrentUserResponse,
    PatchPasswordRequest,
    PatchPasswordResponse,
    SignInRequest,
    SignInResponse,
    SignOutResponse,
    SignUpRequest,
    SignUpResponse,
    VerifyPasswordRequest,
    VerifyTokenResponse,
)
from app.di.application.usecase import (
    get_patch_password_use_case,
    get_refresh_credentials_use_case,
    get_sign_in_use_case,
    get_sign_out_use_case,
    get_sign_up_use_case,
    get_verify_credentials_use_case,
    get_verify_password_use_case,
)
from app.shared.user.domain.exception import DuplicatedUser
from app.user.domain.entity import User
from app.user.domain.exception import UserNotFound
from core.auth.domain.exception import AlchemyMismatch, DuplicatedPrincipal, InvalidCredentials, PrincipalNotFound
from core.notifier import EmailNotifier

ACCESS_TOKEN_EXPIRE_DAYS: int = int(os.getenv("AUTH_TOKEN_LIFE_DAY", "1825"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("AUTH_TOKEN_LIFE_DAY", "1825"))

router: APIRouter = APIRouter(tags=["Auth"])


@router.post("/signin", response_model=SignInResponse, status_code=status.HTTP_200_OK)
def signin(
    request_model: SignInRequest, response: Response, usecase: Annotated[SignInUseCase, Depends(get_sign_in_use_case)]
):
    try:
        user, short_credentials, long_credentials = usecase(
            principal=request_model.principal,
            password=request_model.password,
        )

        # set refresh token cookie
        max_age_refresh_token: int = int(ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        response.set_cookie(
            key="refresh_token",
            value=long_credentials.raw_value,
            httponly=True,
            max_age=max_age_refresh_token,
            expires=max_age_refresh_token,
        )

        # set access token cookie
        max_age_access_token: int = int(ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        response.set_cookie(
            key="access_token",
            value=short_credentials.raw_value,
            httponly=True,
            max_age=max_age_access_token,
            expires=max_age_access_token,
        )

        return SignInResponse.from_user_entity(user=user)

    except AlchemyMismatch as e:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=str(e))
    except InvalidCredentials as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except PrincipalNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UserNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/signout", status_code=status.HTTP_200_OK, response_model=SignOutResponse)
def signout(
    response: Response,
    usecase: Annotated[SignOutUseCase, Depends(get_sign_out_use_case)],
    access_token: str | None = Cookie(None),
    refresh_token: str | None = Cookie(None),
):
    try:
        user: User = usecase(
            raw_short_lived_credentials=access_token or "",  # if access_token is not provided, empty string is passed
            raw_long_lived_credentials=refresh_token,
        )
        response.delete_cookie(key="access_token", path="/")
        response.delete_cookie(key="refresh_token", path="/")
        return SignOutResponse.from_user_entity(user=user)

    except DuplicatedPrincipal as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except AlchemyMismatch as e:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=str(e))
    except InvalidCredentials as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except PrincipalNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=SignUpResponse)
def signup(
    request_model: SignUpRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    usecase: Annotated[SignUpUseCase, Depends(get_sign_up_use_case)],
):
    try:
        user, short_credentials, long_credentials = usecase(
            email=request_model.email,
            username=request_model.username,
            password=request_model.password,
            role=request_model.role,
        )

        # set refresh token cookie
        max_age_refresh_token: int = int(ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        response.set_cookie(
            key="refresh_token",
            value=long_credentials.raw_value,
            httponly=True,
            max_age=max_age_refresh_token,
            expires=max_age_refresh_token,
        )

        # set access token cookie
        max_age_access_token: int = int(ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        response.set_cookie(
            key="access_token",
            value=short_credentials.raw_value,
            httponly=True,
            max_age=max_age_access_token,
            expires=max_age_access_token,
        )

        # Add send-email background task
        email_notifier: EmailNotifier = EmailNotifier()
        background_tasks.add_task(
            email_notifier.notify,
            receiver=user,
            subject="Welcome to ChatPPT!",
            body=(
                f"Hi {user.username},\n\n"
                "Thanks for using ChatPPT!\n\n"
                "We hope you enjoy your time here.\n\n"
                "If you have any questions, please feel free to contact us.\n\n"
                "- All Day Happy Day Team"
            ),
        )

        return SignUpResponse.from_user_entity(user=user)

    except DuplicatedPrincipal as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except DuplicatedUser as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except AlchemyMismatch as e:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=str(e))


@router.get("/verify", response_model=VerifyTokenResponse)
def verify_credentials(
    usecase: Annotated[VerifyCredentialsUseCase, Depends(get_verify_credentials_use_case)],
    access_token: str | None = Cookie(None),
):
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token")

    try:
        user: User = usecase(raw_short_lived_credentials=access_token)
        return VerifyTokenResponse(principal=user.username)

    except AlchemyMismatch as e:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=str(e))
    except InvalidCredentials as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/verify-password", status_code=status.HTTP_200_OK)
def verify_password(
    request_model: VerifyPasswordRequest,
    usecase: Annotated[VerifyPasswordUseCase, Depends(get_verify_password_use_case)],
):
    if not usecase(principal=request_model.principal, password=request_model.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect Password")


@router.post("/reissue", status_code=status.HTTP_200_OK)
def reissue_tokens(
    response: Response,
    usecase: Annotated[RefreshCredentialsUseCase, Depends(get_refresh_credentials_use_case)],
    refresh_token: str | None = Cookie(None),
):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        short_credentials, long_credentials = usecase(raw_long_lived_credentials=refresh_token)

        # set refresh token cookie
        max_age_refresh_token: int = int(ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        response.set_cookie(
            key="refresh_token",
            value=long_credentials.raw_value,
            httponly=True,
            max_age=max_age_refresh_token,
            expires=max_age_refresh_token,
        )

        # set access token cookie
        max_age_access_token: int = int(ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        response.set_cookie(
            key="access_token",
            value=short_credentials.raw_value,
            httponly=True,
            max_age=max_age_access_token,
            expires=max_age_access_token,
        )

    except AlchemyMismatch as e:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=str(e))
    except InvalidCredentials as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except PrincipalNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/me", status_code=status.HTTP_200_OK)
def get_current_user(
    usecase: Annotated[VerifyCredentialsUseCase, Depends(get_verify_credentials_use_case)],
    access_token: str | None = Cookie(None),
):
    try:
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token")
        return GetCurrentUserResponse.from_user_entity(user=usecase(raw_short_lived_credentials=access_token))
    except InvalidCredentials as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except AlchemyMismatch as e:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=str(e))


@router.patch("/password/{user_id}", status_code=status.HTTP_200_OK)
def patch_password(
    user_id: ULID,
    request_model: PatchPasswordRequest,
    usecase: Annotated[PatchPasswordUseCase, Depends(get_patch_password_use_case)],
):
    try:
        user: User = usecase(user_id=user_id, password=request_model.password)
        return PatchPasswordResponse.from_user_entity(user=user)
    except UserNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidCredentials as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except AlchemyMismatch as e:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=str(e))
