import os
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from jose import jwt
from ulid import ULID

from core.auth.domain.entity import Principal
from core.auth.domain.enum import CredentialsType
from core.auth.domain.exception import InvalidCredentials
from core.auth.domain.repository import CredentialsRepository, PrincipalRepository
from core.auth.domain.service import AuthenticationService, PasswordHasher
from core.auth.domain.valueobject import Credentials

SECRET_KEY: str = os.getenv("AUTH_SECRET_KEY", "TEST_KEY")
ACCESS_TOKEN_EXPIRE_DAYS: int = int(os.getenv("AUTH_TOKEN_LIFE_DAY", "1825"))  # 5 years
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("AUTH_TOKEN_LIFE_DAY", "1825"))  # 5 years


class JWTAuthenticationService(AuthenticationService):
    def __init__(
        self,
        password_hasher: PasswordHasher,
        principal_repo: PrincipalRepository,
        credentials_repo: CredentialsRepository,
        secret_key: str = SECRET_KEY,
        short_days: int = ACCESS_TOKEN_EXPIRE_DAYS,
        long_days: int = REFRESH_TOKEN_EXPIRE_DAYS,
    ) -> None:
        self.password_hasher: PasswordHasher = password_hasher
        self.principal_repo: PrincipalRepository = principal_repo
        self.credentials_repo: CredentialsRepository = credentials_repo
        self.secret_key: str = secret_key
        self.short_delta: timedelta = timedelta(days=short_days)
        self.long_delta: timedelta = timedelta(days=long_days)

    def _issue_credentials(
        self,
        user_id: ULID,
        now: datetime,
        type: Literal[CredentialsType.SHORT_LIVED, CredentialsType.LONG_LIVED],
    ) -> Credentials:
        delta: timedelta = self.short_delta if type == CredentialsType.SHORT_LIVED else self.long_delta
        issued_at: int = int(now.timestamp())

        jwt_token_id: ULID = ULID()
        expiration_time: int = int((now + delta).timestamp())
        payload: dict[str, Any] = {
            "sub": str(user_id),
            "iat": issued_at,
            "exp": expiration_time,
            "jti": str(jwt_token_id),
            "token_type": type.value,
        }
        raw: str = jwt.encode(claims=payload, key=self.secret_key, algorithm="HS256")
        credentials: Credentials = Credentials(user_id=user_id, type=type, raw_value=raw)

        return credentials

    def authenticate(self, principal: str, secret: str) -> tuple[Credentials, Credentials]:
        # Load and verify principal
        principal_entity: Principal = self.principal_repo.get_by_principal(principal=principal)
        if not principal_entity.verify_password(plain=secret, hasher=self.password_hasher):
            raise InvalidCredentials(f"Invalid credentials: {principal}")

        now: datetime = datetime.now(timezone.utc)

        # Issue short lived credentials
        short_credentials: Credentials = self._issue_credentials(
            user_id=principal_entity.user_id,
            now=now,
            type=CredentialsType.SHORT_LIVED,
        )

        # Issue long lived credentials
        long_credentials: Credentials = self._issue_credentials(
            user_id=principal_entity.user_id,
            now=now,
            type=CredentialsType.LONG_LIVED,
        )

        # Persist both credentials
        self.credentials_repo.save(credentials=short_credentials)
        self.credentials_repo.save(credentials=long_credentials)

        return short_credentials, long_credentials

    def refresh(self, raw_long_lived_credentials: str) -> tuple[Credentials, Credentials]:
        # Decode & validate the old token
        data: dict[str, Any] = jwt.decode(token=raw_long_lived_credentials, key=self.secret_key, algorithms=["HS256"])
        if data.get("token_type") != CredentialsType.LONG_LIVED.value:
            raise InvalidCredentials("Expected a long-lived credential for refresh")

        refresh_credentials: Credentials = Credentials(
            user_id=ULID.from_str(data["sub"]),
            type=CredentialsType.LONG_LIVED,
            raw_value=raw_long_lived_credentials,
        )
        if not self.credentials_repo.exists(credentials=refresh_credentials):
            raise InvalidCredentials("Refresh credential revoked or unknown")

        # Revoke the old refresh
        self.credentials_repo.revoke(credentials=refresh_credentials)

        now: datetime = datetime.now(timezone.utc)

        # Issue short lived credentials
        short_credentials: Credentials = self._issue_credentials(
            user_id=refresh_credentials.user_id,
            now=now,
            type=CredentialsType.SHORT_LIVED,
        )

        # Issue long lived credentials
        long_credentials: Credentials = self._issue_credentials(
            user_id=refresh_credentials.user_id,
            now=now,
            type=CredentialsType.LONG_LIVED,
        )

        # Persist both credentials
        self.credentials_repo.save(credentials=short_credentials)
        self.credentials_repo.save(credentials=long_credentials)

        return short_credentials, long_credentials

    def verify(self, raw_short_lived_credentials: str) -> ULID:
        data: dict[str, Any] = jwt.decode(token=raw_short_lived_credentials, key=self.secret_key, algorithms=["HS256"])
        credentials: Credentials = Credentials(
            user_id=ULID.from_str(data["sub"]),
            type=CredentialsType.SHORT_LIVED,
            raw_value=raw_short_lived_credentials,
        )
        if not self.credentials_repo.exists(credentials=credentials):
            raise InvalidCredentials("Invalid credentials")
        return credentials.user_id

    def revoke(self, raw_token: str) -> None:
        # Decode to figure out type and user_id
        data: dict[str, Any] = jwt.decode(token=raw_token, key=self.secret_key, algorithms=["HS256"])
        credentials: Credentials = Credentials(
            user_id=ULID.from_str(data["sub"]),
            type=CredentialsType(data["token_type"]),
            raw_value=raw_token,
        )
        self.credentials_repo.revoke(credentials=credentials)
