from abc import ABC, abstractmethod

from ulid import ULID

from core.auth.domain.entity import Principal


class PrincipalRepository(ABC):
    @abstractmethod
    def save(self, principal: Principal) -> Principal:
        raise NotImplementedError

    @abstractmethod
    def patch(self, principal: Principal) -> Principal:
        raise NotImplementedError

    @abstractmethod
    def exists(self, principal: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def get_by_principal(self, principal: str) -> Principal:
        raise NotImplementedError

    @abstractmethod
    def get_by_user_id(self, user_id: ULID) -> Principal:
        raise NotImplementedError

    @abstractmethod
    def delete_by_user_id(self, user_id: ULID) -> None:
        raise NotImplementedError
