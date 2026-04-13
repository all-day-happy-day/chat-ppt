from fastapi import Cookie, Depends, HTTPException, status

from app.auth.application.usecase import VerifyCredentialsUseCase
from app.di.application.usecase import get_verify_credentials_use_case
from app.user.domain.entity import User
from core.auth.domain.exception import AlchemyMismatch, InvalidCredentials


def get_current_user(
    access_token: str | None = Cookie(None),
    usecase: VerifyCredentialsUseCase = Depends(get_verify_credentials_use_case),
) -> User:
    if access_token is None or access_token == "":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token")
    try:
        return usecase(raw_short_lived_credentials=access_token)
    except InvalidCredentials as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except AlchemyMismatch as e:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=str(e))
