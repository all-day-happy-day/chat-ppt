from abc import ABC, abstractmethod

from ulid import ULID

from core.auth.domain.valueobject import Credentials


class AuthenticationService(ABC):
    @abstractmethod
    def authenticate(self, principal: str, secret: str) -> tuple[Credentials, Credentials]:
        raise NotImplementedError

    @abstractmethod
    def refresh(self, raw_long_lived_credentials: str) -> tuple[Credentials, Credentials]:
        raise NotImplementedError

    @abstractmethod
    def verify(self, raw_short_lived_credentials: str) -> ULID:
        raise NotImplementedError

    @abstractmethod
    def revoke(self, raw_token: str) -> None:
        raise NotImplementedError
