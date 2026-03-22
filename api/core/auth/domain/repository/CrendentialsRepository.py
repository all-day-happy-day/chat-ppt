from abc import ABC, abstractmethod

from ulid import ULID

from core.auth.domain.valueobject import Credentials


class CredentialsRepository(ABC):
    @abstractmethod
    def save(self, credentials: Credentials) -> Credentials:
        raise NotImplementedError

    @abstractmethod
    def exists(self, credentials: Credentials) -> bool:
        raise NotImplementedError

    @abstractmethod
    def revoke(self, credentials: Credentials) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete_by_id(self, user_id: ULID) -> None:
        raise NotImplementedError
